import { Client } from '@notionhq/client';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { NOTION_TOKEN, NOTION_DATABASE_ID } = process.env;
  if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
    return res.status(500).json({
      error: 'Server is not configured: NOTION_TOKEN and NOTION_DATABASE_ID must be set as environment variables.',
    });
  }

  const job = req.body;
  if (!job || typeof job !== 'object') {
    return res.status(400).json({ error: 'Request body must be a JSON object describing the job.' });
  }
  if (!job.title || !job.company) {
    return res.status(400).json({ error: 'Missing required fields: title and company.' });
  }

  try {
    const notion = new Client({ auth: NOTION_TOKEN });
    const properties = buildNotionProperties(job);

    const page = await notion.pages.create({
      parent: { database_id: NOTION_DATABASE_ID },
      properties,
    });

    return res.status(200).json({
      success: true,
      pageId: page.id,
      url: page.url,
    });
  } catch (error) {
    console.error('Notion sync failed:', error);
    return res.status(error.status || 500).json({
      error: error.message || 'Failed to save job to Notion.',
      code: error.code,
    });
  }
}

function buildNotionProperties(job) {
  const properties = {
    'Role Title': {
      title: [{ text: { content: String(job.title).slice(0, 2000) } }],
    },
    'Company': {
      rich_text: [{ text: { content: String(job.company).slice(0, 2000) } }],
    },
    'Status': { select: { name: 'Interested' } },
    'Source': { select: { name: 'Job Scout' } },
  };

  if (typeof job.fitScore === 'number' && Number.isFinite(job.fitScore)) {
    // Notion percent format expects a decimal (0.98 displays as 98%).
    properties['Fit Score'] = { number: job.fitScore / 100 };
    properties['Fit Tier'] = { select: { name: deriveFitTier(job.fitScore) } };
  }

  if (job.salary) {
    properties['Salary Range'] = {
      rich_text: [{ text: { content: String(job.salary).slice(0, 2000) } }],
    };
    const min = parseSalaryMin(job.salary);
    if (min !== null) {
      properties['Salary Min'] = { number: min };
    }
  }

  if (job.location) {
    properties['Location'] = {
      rich_text: [{ text: { content: String(job.location).slice(0, 2000) } }],
    };
    properties['Remote'] = { checkbox: isRemote(job.location) };
  }

  if (job.stage) {
    properties['Stage'] = { select: { name: String(job.stage) } };
  }

  if (job.industry) {
    const industries = parseIndustries(job.industry);
    if (industries.length > 0) {
      properties['Industry'] = { multi_select: industries };
    }
  }

  if (job.link) {
    properties['Job URL'] = { url: String(job.link) };
  }
  if (job.companyUrl) {
    properties['Company URL'] = { url: String(job.companyUrl) };
  }

  const northStarMatch = typeof job.northStarMatch === 'boolean'
    ? job.northStarMatch
    : Boolean(job.criteria && job.criteria.northStar);
  properties['North Star Match'] = { checkbox: northStarMatch };

  if (job.fitReasoning) {
    properties['Why Good Fit'] = {
      rich_text: [{ text: { content: String(job.fitReasoning).slice(0, 2000) } }],
    };
  }

  return properties;
}

function deriveFitTier(score) {
  if (score >= 90) return 'Perfect';
  if (score >= 80) return 'Strong';
  if (score >= 70) return 'Good';
  return 'Maybe';
}

function parseSalaryMin(salary) {
  if (typeof salary !== 'string') return null;
  const match = salary.match(/\$?\s*(\d+(?:\.\d+)?)\s*([kKmM])?/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const unit = (match[2] || '').toLowerCase();
  if (unit === 'k') return Math.round(value * 1000);
  if (unit === 'm') return Math.round(value * 1_000_000);
  return Math.round(value);
}

function isRemote(location) {
  return typeof location === 'string' && location.toLowerCase().includes('remote');
}

function parseIndustries(industry) {
  if (typeof industry !== 'string') return [];
  return industry
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100)
    .map((name) => ({ name: name.slice(0, 100) }));
}
