import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { kvMget } from './_kv.js';
import { scoreBatch } from './score-jobs-batch.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SKILL_PATH = resolve(ROOT, 'JOB_SEARCH_SKILL.md');
const COMPANIES_PATH = resolve(ROOT, 'TARGET_COMPANIES.md');

const FETCH_TIMEOUT_MS = 5_000;
const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 300;

// --- File helpers ---

function loadSkillContent() {
  try {
    return readFileSync(SKILL_PATH, 'utf-8');
  } catch {
    return '';
  }
}

function loadSkillHash() {
  try {
    const content = readFileSync(SKILL_PATH, 'utf-8');
    return createHash('sha256').update(content).digest('hex').slice(0, 8);
  } catch {
    return 'default0';
  }
}

function parseTargetCompanies() {
  try {
    const content = readFileSync(COMPANIES_PATH, 'utf-8');
    const companies = [];
    let currentCategory = '';

    for (const line of content.split('\n')) {
      const headerMatch = line.match(/^##\s+(.+)$/);
      if (headerMatch) {
        const label = headerMatch[1].trim();
        if (!label.toLowerCase().includes('not on this list')) {
          currentCategory = label;
        }
      }

      const compMatch = line.match(
        /^-\s+(.+?)\s*\|\s*(.+?)\s*\|\s*(greenhouse|ashby)\s*$/i
      );
      if (compMatch) {
        companies.push({
          name: compMatch[1].trim(),
          slug: compMatch[2].trim(),
          platform: compMatch[3].trim().toLowerCase(),
          category: currentCategory,
        });
      }
    }
    return companies;
  } catch (err) {
    console.error('[fetch-jobs] Failed to parse TARGET_COMPANIES.md:', err.message);
    return [];
  }
}

// --- Role filter ---

const INCLUDE_TERMS = [
  'designer',
  'design',
  'product manager',
  'product owner',
  'user experience',
  'user interface',
  'creative director',
  'creative lead',
  'ux researcher',
  'design researcher',
];
const INCLUDE_SHORT = ['ux', 'ui']; // checked with word boundary
const EXCLUDE_TERMS = [
  'engineer',
  'developer',
  'engineering',
  'sales',
  'marketing',
  'support',
  'customer success',
  'recruiter',
  ' hr ',
  'people ops',
];

function isDesignProductRole(title) {
  const lower = ` ${title.toLowerCase()} `;
  if (lower.includes('intern') && !lower.includes('senior')) return false;
  if (EXCLUDE_TERMS.some((t) => lower.includes(t))) return false;
  if (INCLUDE_TERMS.some((t) => lower.includes(t))) return true;
  if (INCLUDE_SHORT.some((t) => new RegExp(`\\b${t}\\b`).test(lower))) return true;
  return false;
}

// --- Fetchers ---

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function fetchGreenhouse(company, fetchedAt) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${company.slug}/jobs?content=true`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    throw new Error(res.status === 404 ? 'board not found (404)' : `HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data.jobs || []).map((job) => ({
    id: `${company.slug}::${job.id}`,
    sourceCompany: company.name,
    sourceCompanySlug: company.slug,
    sourcePlatform: 'greenhouse',
    category: company.category,
    roleTitle: job.title || '',
    department: job.departments?.[0]?.name || '',
    location: job.location?.name || '',
    remote: /remote/i.test(job.location?.name || ''),
    employmentType: '',
    jobUrl: job.absolute_url || '',
    descriptionPreview: stripHtml(job.content || '').slice(0, 2000),
    publishedAt: job.updated_at || '',
    fetchedAt,
  }));
}

async function fetchAshby(company, fetchedAt) {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${company.slug}?includeCompensation=true`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    throw new Error(res.status === 404 ? 'board not found (404)' : `HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data.results || []).map((job) => ({
    id: `${company.slug}::${job.id}`,
    sourceCompany: company.name,
    sourceCompanySlug: company.slug,
    sourcePlatform: 'ashby',
    category: company.category,
    roleTitle: job.title || '',
    department: job.teamName || job.department || '',
    location: job.locationName || '',
    remote: Boolean(job.isRemote),
    employmentType: job.employmentType || '',
    jobUrl: job.applicationLink || '',
    descriptionPreview: stripHtml(job.descriptionHtml || '').slice(0, 2000),
    publishedAt: job.publishedAt || '',
    fetchedAt,
  }));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// --- Handler ---

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const forceRescore =
    req.query?.force === 'true' ||
    (typeof req.url === 'string' && req.url.includes('force=true'));

  const companies = parseTargetCompanies();
  if (companies.length === 0) {
    return res.status(500).json({ error: 'TARGET_COMPANIES.md is empty or missing.' });
  }

  const cacheVersion = loadSkillHash();
  const fetchedAt = new Date().toISOString();

  // Fetch all boards in parallel batches
  const allJobs = [];
  const failedCompanies = [];
  let successfulFetches = 0;

  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const batch = companies.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((c) =>
        c.platform === 'greenhouse'
          ? fetchGreenhouse(c, fetchedAt)
          : fetchAshby(c, fetchedAt)
      )
    );

    results.forEach((result, idx) => {
      const company = batch[idx];
      if (result.status === 'fulfilled') {
        allJobs.push(...result.value);
        successfulFetches++;
      } else {
        const reason = result.reason?.message || 'unknown error';
        if (!reason.includes('not found')) {
          console.warn(`[fetch-jobs] ${company.name} (${company.slug}): ${reason}`);
        }
        failedCompanies.push({ name: company.name, reason });
      }
    });

    if (i + BATCH_SIZE < companies.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  // Filter to design/product roles only
  const filteredJobs = allJobs.filter((j) => isDesignProductRole(j.roleTitle));

  // Cache check: split into already-scored vs. needs-scoring
  let cachedJobs = [];
  let jobsToScore = filteredJobs;

  if (!forceRescore) {
    const cacheKeys = filteredJobs.map((j) => `score:${cacheVersion}:${j.id}`);
    const cachedValues = await kvMget(cacheKeys);

    cachedJobs = [];
    jobsToScore = [];

    filteredJobs.forEach((job, i) => {
      const cached = cachedValues[i];
      if (cached && typeof cached === 'object' && typeof cached.fitScore === 'number') {
        cachedJobs.push({ ...job, ...cached });
      } else {
        jobsToScore.push(job);
      }
    });
  }

  // Score new/forced jobs inline (no HTTP round-trip)
  let freshlyScored = [];
  if (jobsToScore.length > 0) {
    const { ANTHROPIC_API_KEY } = process.env;
    if (!ANTHROPIC_API_KEY) {
      console.error('[fetch-jobs] ANTHROPIC_API_KEY not set; skipping scoring');
      freshlyScored = jobsToScore.map((j) => ({
        ...j,
        fitScore: null,
        fitTier: null,
        northStarMatch: false,
        scoreError: 'ANTHROPIC_API_KEY not set',
      }));
    } else {
      const skillContent = loadSkillContent();
      freshlyScored = await scoreBatch(jobsToScore, cacheVersion, skillContent, ANTHROPIC_API_KEY);
    }
  }

  const allScoredJobs = [...cachedJobs, ...freshlyScored];
  const freshScores = freshlyScored.filter((j) => j.fitScore !== null).length;
  const cachedScores = cachedJobs.length;

  return res.status(200).json({
    totalCompaniesScanned: companies.length,
    successfulFetches,
    failedCompanies,
    totalJobsFound: allJobs.length,
    designProductJobsAfterFilter: filteredJobs.length,
    cachedScores,
    freshScores,
    estimatedCost: Number((0.001 * freshScores).toFixed(4)),
    cacheVersion,
    jobs: allScoredJobs,
    scannedAt: fetchedAt,
  });
}
