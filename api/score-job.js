import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_PATH = resolve(HERE, '..', 'JOB_SEARCH_SKILL.md');

let cachedSkill = null;
function loadSkill() {
  if (cachedSkill !== null) return cachedSkill;
  try {
    cachedSkill = readFileSync(SKILL_PATH, 'utf-8');
  } catch (err) {
    console.error('Failed to read JOB_SEARCH_SKILL.md:', err.message);
    cachedSkill = '';
  }
  return cachedSkill;
}

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1024;
const REQUEST_TIMEOUT_MS = 25_000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ANTHROPIC_API_KEY } = process.env;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'Server is not configured: ANTHROPIC_API_KEY must be set as an environment variable.',
    });
  }

  const body = req.body || {};
  const { roleTitle, company, jobDescription, salaryMin, location, stage } = body;
  if (!roleTitle || !company || !jobDescription) {
    return res.status(400).json({
      error: 'Missing required fields: roleTitle, company, and jobDescription.',
    });
  }

  const skill = loadSkill();
  if (!skill) {
    return res.status(500).json({
      error: 'JOB_SEARCH_SKILL.md is missing on the server. Cannot score without scoring criteria.',
    });
  }

  const prompt = buildPrompt({ skill, roleTitle, company, jobDescription, salaryMin, location, stage });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let upstream;
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Anthropic API request timed out.' });
    }
    console.error('Anthropic request failed:', err);
    return res.status(502).json({ error: 'Failed to reach Anthropic API.' });
  }
  clearTimeout(timer);

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => '');
    console.error('Anthropic non-OK:', upstream.status, errText);
    return res.status(502).json({
      error: `Anthropic API returned ${upstream.status}.`,
      detail: errText.slice(0, 500),
    });
  }

  let payload;
  try {
    payload = await upstream.json();
  } catch (err) {
    return res.status(502).json({ error: 'Anthropic API returned non-JSON response.' });
  }

  const text = extractText(payload);
  const parsed = safeParseJson(text);
  if (!parsed) {
    return res.status(502).json({
      error: 'Model did not return valid JSON.',
      raw: text?.slice(0, 500) || '',
    });
  }

  const normalized = normalizeScore(parsed);
  return res.status(200).json(normalized);
}

function buildPrompt({ skill, roleTitle, company, jobDescription, salaryMin, location, stage }) {
  return `You are a job fit analyzer for a Product Designer with this profile and criteria:

${skill}

Analyze this job posting:
Role: ${roleTitle}
Company: ${company}
Location: ${location || 'Unknown'}
Salary Min: ${salaryMin ?? 'Unknown'}
Stage: ${stage || 'Unknown'}

Job Description:
${jobDescription}

Return ONLY valid JSON in this exact shape (no markdown, no preamble):
{
  "fitScore": 0-100 (integer),
  "fitTier": "Perfect" | "Strong" | "Good" | "Maybe",
  "northStarMatch": boolean (does this role enable tangible real-world impact via tech?),
  "whyGoodFit": "3-5 sentence personalized explanation connecting role to my strengths and North Star",
  "criteriaMatches": {
    "salaryOnTarget": boolean,
    "targetLocation": boolean,
    "northStarMatch": boolean
  }
}

Scoring guidance:
- Perfect (90-100): Hits North Star + core strengths + practical criteria
- Strong (75-89): Hits North Star + most strengths/criteria
- Good (60-74): Some alignment, missing pieces
- Maybe (<60): Worth knowing but unlikely fit`;
}

function extractText(payload) {
  if (!payload || !Array.isArray(payload.content)) return '';
  return payload.content
    .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('')
    .trim();
}

function safeParseJson(text) {
  if (!text) return null;
  // Strip code fences if the model added them despite instructions.
  const stripped = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(stripped);
  } catch {
    const first = stripped.indexOf('{');
    const last = stripped.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(stripped.slice(first, last + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeScore(parsed) {
  const fitScore = clampInt(parsed.fitScore, 0, 100, 0);
  const tier = ['Perfect', 'Strong', 'Good', 'Maybe'].includes(parsed.fitTier)
    ? parsed.fitTier
    : deriveTier(fitScore);
  const criteria = parsed.criteriaMatches && typeof parsed.criteriaMatches === 'object'
    ? parsed.criteriaMatches
    : {};
  return {
    fitScore,
    fitTier: tier,
    northStarMatch: Boolean(parsed.northStarMatch),
    whyGoodFit: typeof parsed.whyGoodFit === 'string' ? parsed.whyGoodFit.trim() : '',
    criteriaMatches: {
      salaryOnTarget: Boolean(criteria.salaryOnTarget),
      targetLocation: Boolean(criteria.targetLocation),
      northStarMatch: Boolean(criteria.northStarMatch),
    },
  };
}

function clampInt(n, min, max, fallback) {
  const v = typeof n === 'number' ? Math.round(n) : parseInt(n, 10);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
}

function deriveTier(score) {
  if (score >= 90) return 'Perfect';
  if (score >= 75) return 'Strong';
  if (score >= 60) return 'Good';
  return 'Maybe';
}
