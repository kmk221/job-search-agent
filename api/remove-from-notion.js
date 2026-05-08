import { Client } from '@notionhq/client';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { NOTION_TOKEN } = process.env;
  if (!NOTION_TOKEN) {
    return res.status(500).json({
      error: 'Server is not configured: NOTION_TOKEN must be set as an environment variable.',
    });
  }

  const body = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Request body must be a JSON object containing pageId.' });
  }
  const { pageId } = body;
  if (!pageId || typeof pageId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid pageId.' });
  }

  try {
    const notion = new Client({ auth: NOTION_TOKEN });
    await notion.pages.update({
      page_id: pageId,
      archived: true,
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Notion archive failed:', error);
    return res.status(error.status || 500).json({
      error: error.message || 'Failed to archive Notion page.',
      code: error.code,
    });
  }
}
