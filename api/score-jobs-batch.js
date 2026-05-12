import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { kvSet } from './_kv.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_PATH = resolve(HERE, '..', 'JOB_SEARCH_SKILL.md');

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 200;
const KV_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const CONCURRENCY = 5;

let cachedSkill = null;
function loadSkill() {
  if (cachedSkill !== null) return cachedSkill;
  try {
    cachedSkill = readFileSync(SKILL_PATH, 'utf-8');
  } catch {
    cachedSkill = '';
  }
  return cachedSkill;
}

function createLimiter(concurrency) {
  let active = 0;
  const queue = [];
  return function limit(fn) {
    return new Promise((resolve, reject) => {
      const run = async () => {
        active++;
        try {
          resolve(await fn());
        } catch (err) {
          reject(err);
        } finally {
          active--;
          if (queue.length > 0) queue.shift()();
        }
      };
      if (active < concurrency) run();
      else queue.push(run);
    });
  };
}

async function scoreOneJob(job, skillContent, apiKey) {
  const prompt = `You are a fast job fit screener for a Senior UX Designer with this profile:

${skillContent}

Score this job posting (be fast and decisive):
- Role: ${job.roleTitle}
- Company: ${job.sourceCompany}
- Location: ${job.location}
- Description: ${job.descriptionPreview || 'Not available'}

Return ONLY this JSON (no markdown, no preamble):
{
  "fitScore": <0-100 integer>,
  "fitTier": "Perfect" | "Strong" | "Good" | "Maybe",
  "northStarMatch": <boolean - does this role enable tech-powered real-world impact?>
}

Scoring guide:
- 90-100 Perfect: hits North Star + most strengths
- 75-89 Strong: solid alignment
- 60-74 Good: partial alignment
- <60 Maybe: weak fit`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API returned ${res.status}`);
  }

  const payload = await res.json();
  const text = (payload.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  const stripped = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    const first = stripped.indexOf('{');
    const last = stripped.lastIndexOf('}');
    if (first >= 0 && last > first) {
      parsed = JSON.parse(stripped.slice(first, last + 1));
    } else {
      throw new Error('Model returned invalid JSON');
    }
  }

  const fitScore = Math.max(0, Math.min(100, Math.round(Number(parsed.fitScore) || 0)));
  const validTiers = ['Perfect', 'Strong', 'Good', 'Maybe'];
  const fitTier = validTiers.includes(parsed.fitTier)
    ? parsed.fitTier
    : fitScore >= 90 ? 'Perfect'
    : fitScore >= 75 ? 'Strong'
    : fitScore >= 60 ? 'Good'
    : 'Maybe';

  return {
    fitScore,
    fitTier,
    northStarMatch: Boolean(parsed.northStarMatch),
    scoredAt: new Date().toISOString(),
  };
}

// Exported so fetch-jobs.js can call inline without an HTTP round-trip.
export async function scoreBatch(jobs, cacheVersion, skillContent, apiKey) {
  const limit = createLimiter(CONCURRENCY);

  const results = await Promise.all(
    jobs.map((job) =>
      limit(async () => {
        try {
          const score = await scoreOneJob(job, skillContent, apiKey);
          const cacheKey = `score:${cacheVersion}:${job.id}`;
          await kvSet(cacheKey, score, KV_TTL_SECONDS);
          return { ...job, ...score };
        } catch (err) {
          console.warn(`[score-jobs-batch] ${job.id}: ${err.message}`);
          return {
            ...job,
            fitScore: null,
            fitTier: null,
            northStarMatch: false,
            scoreError: err.message,
          };
        }
      })
    )
  );

  return results;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ANTHROPIC_API_KEY } = process.env;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });
  }

  const { jobs, cacheVersion } = req.body || {};
  if (!Array.isArray(jobs) || jobs.length === 0) {
    return res.status(400).json({ error: 'jobs must be a non-empty array' });
  }

  const skillContent = loadSkill();
  const scored = await scoreBatch(
    jobs,
    cacheVersion || 'default0',
    skillContent,
    ANTHROPIC_API_KEY
  );

  const successful = scored.filter((j) => j.fitScore !== null).length;

  return res.status(200).json({
    jobs: scored,
    total: scored.length,
    successful,
    failed: scored.length - successful,
    estimatedCost: Number((0.001 * successful).toFixed(4)),
  });
}
