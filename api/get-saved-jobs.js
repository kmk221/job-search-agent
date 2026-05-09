import { Client } from '@notionhq/client';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { NOTION_TOKEN, NOTION_DATABASE_ID } = process.env;
  if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
    return res.status(500).json({
      error: 'Server is not configured: NOTION_TOKEN and NOTION_DATABASE_ID must be set as environment variables.',
    });
  }

  try {
    const notion = new Client({ auth: NOTION_TOKEN });

    // @notionhq/client v5 removed databases.query; databases now contain one
    // or more data sources, and queries run against a data source.
    const database = await notion.databases.retrieve({ database_id: NOTION_DATABASE_ID });
    const dataSourceId = database.data_sources?.[0]?.id;
    if (!dataSourceId) {
      return res.status(500).json({
        error: 'Notion database has no accessible data sources.',
      });
    }

    const pages = [];
    let cursor;
    do {
      const response = await notion.dataSources.query({
        data_source_id: dataSourceId,
        start_cursor: cursor,
        page_size: 100,
      });
      pages.push(...response.results);
      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    const savedJobs = pages
      .filter((p) => !p.archived && !p.in_trash)
      .map((p) => ({
        pageId: p.id,
        pageUrl: p.url,
        roleTitle: extractTitle(p, 'Role Title'),
        company: extractRichText(p, 'Company'),
        status: extractSelect(p, 'Status'),
      }))
      .filter((entry) => entry.roleTitle && entry.company);

    return res.status(200).json({ success: true, savedJobs });
  } catch (error) {
    console.error('Notion get-saved-jobs failed:', error);
    return res.status(error.status || 500).json({
      error: error.message || 'Failed to fetch saved Notion pages.',
      code: error.code,
    });
  }
}

function extractTitle(page, propName) {
  const prop = page.properties?.[propName];
  if (!prop || prop.type !== 'title') return '';
  return prop.title.map((t) => t.plain_text).join('');
}

function extractRichText(page, propName) {
  const prop = page.properties?.[propName];
  if (!prop || prop.type !== 'rich_text') return '';
  return prop.rich_text.map((t) => t.plain_text).join('');
}

function extractSelect(page, propName) {
  const prop = page.properties?.[propName];
  if (!prop || prop.type !== 'select' || !prop.select) return '';
  return prop.select.name || '';
}
