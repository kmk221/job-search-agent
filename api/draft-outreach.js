import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const VOICE_PATH = resolve(HERE, '..', 'VOICE_PROFILE.md');
const SKILL_PATH = resolve(HERE, '..', 'JOB_SEARCH_SKILL.md');

let cachedVoice = null;
let cachedSkill = null;

function loadVoice() {
  if (cachedVoice !== null) return cachedVoice;
  try {
    cachedVoice = readFileSync(VOICE_PATH, 'utf-8');
  } catch (err) {
    console.error('Failed to read VOICE_PROFILE.md:', err.message);
    cachedVoice = '';
  }
  return cachedVoice;
}

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

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 2048;
const REQUEST_TIMEOUT_MS = 45_000;

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
  const { job, contact, channel } = body;

  if (!job || !contact || !channel) {
    return res.status(400).json({ error: 'Missing required fields: job, contact, and channel.' });
  }
  if (!contact.name) {
    return res.status(400).json({ error: 'contact.name is required.' });
  }
  if (!contact.contextNotes) {
    return res.status(400).json({ error: 'contact.contextNotes is required.' });
  }
  if (!contact.warmth) {
    return res.status(400).json({ error: 'contact.warmth is required.' });
  }

  const voice = loadVoice();
  const skill = loadSkill();

  if (!voice) {
    return res.status(500).json({ error: 'VOICE_PROFILE.md is missing on the server.' });
  }

  const systemPrompt = `You are an outreach message drafter for Kristin, a Senior UX Designer. Your job is to write 3 variants of an outreach message that sound EXACTLY like Kristin would write them — not like AI. You must reference VOICE_PROFILE.md for every draft and produce output that matches her voice, structural patterns, and tone rules. Failure to match her voice produces unusable output.`;

  const userMessage = buildUserMessage({ voice, skill, job, contact, channel });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const t0 = Date.now();
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
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
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
  console.log(`[draft-outreach] Anthropic responded in ${Date.now() - t0}ms`);

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
  if (!parsed || !Array.isArray(parsed.variants)) {
    return res.status(502).json({
      error: 'Model did not return valid JSON with variants array.',
      raw: text?.slice(0, 500) || '',
    });
  }

  return res.status(200).json(parsed);
}

function buildUserMessage({ voice, skill, job, contact, channel }) {
  const { roleTitle, company, whyGoodFit, northStarMatch, jobUrl } = job;
  const { name, role, linkedinUrl, warmth, contextNotes } = contact;

  return `VOICE PROFILE (your primary reference for voice and tone):
${voice}

JOB SEARCH CONTEXT (background on Kristin and her job criteria):
${skill || '(not available)'}

THE JOB SHE'S INTERESTED IN:
- Role: ${roleTitle || '(unknown)'}
- Company: ${company || '(unknown)'}
- Why good fit: ${whyGoodFit || '(not provided)'}
- North Star match: ${northStarMatch !== undefined ? northStarMatch : '(unknown)'}
- Job URL: ${jobUrl || '(not provided)'}

THE CONTACT:
- Name: ${name}
- Role: ${role || '(not provided)'}
- LinkedIn: ${linkedinUrl || '(not provided)'}
- Warmth: ${warmth}
- How she knows them (CRITICAL CONTEXT): ${contextNotes}

CHANNEL: ${channel}

TASK:
Generate 3 distinct outreach message variants for the ${channel} channel.
Each variant should take a different strategic approach:

1. WARM-DIRECT variant:
   - Best for: when there's existing relationship or warm context
   - Approach: friendly, references the connection, direct ask
   - Tone: matches Kristin's warm/close voice from VOICE_PROFILE.md

2. CURIOUS-CONNECTOR variant:
   - Best for: when wanting to build relationship before asking
   - Approach: leads with genuine interest in their work/role, soft ask at end
   - Tone: matches Kristin's cold/warm-cold voice from VOICE_PROFILE.md

3. BRIDGE-ASK variant:
   - Best for: when asking for an intro to someone else at the company
   - Approach: 'Would you be open to introducing me to someone in [team]?'
   - Tone: matches the contact's warmth level

Return ONLY valid JSON in this exact shape (no markdown, no preamble):

{
  "variants": [
    {
      "type": "warm-direct",
      "label": "Warm & Direct",
      "description": "Best when you have shared history",
      "subject": "[email subject line, or null for non-email channels]",
      "message": "[the actual message text]",
      "characterCount": [number],
      "channelFit": "[brief note on why this works for the channel]"
    },
    {
      "type": "curious-connector",
      "label": "Curious Connector",
      "description": "Lead with genuine interest, soft ask",
      "subject": "...",
      "message": "...",
      "characterCount": [number],
      "channelFit": "..."
    },
    {
      "type": "bridge-ask",
      "label": "Bridge / Intro Ask",
      "description": "Ask for intro to someone else on team",
      "subject": "...",
      "message": "...",
      "characterCount": [number],
      "channelFit": "..."
    }
  ]
}

CRITICAL RULES:
- Match Kristin's voice from VOICE_PROFILE.md exactly. Read it carefully.
- Use the contact's context notes — this is the most personalized signal.
- For LinkedIn Connection Request: stay under 280 chars.
- For Text Message: 1-3 sentences, lowercase OK, very casual.
- NEVER use banned phrases from VOICE_PROFILE.md.
- Include the email subject line for Email channel; null for others.
- Make each variant DISTINCT — not just the same message with words swapped.`;
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
