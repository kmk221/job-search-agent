#!/usr/bin/env node
// One-time setup: create the Contacts database in Notion using the Job Scout
// Agent integration token. Run with:
//
//   NOTION_TOKEN=secret_xxx \
//   NOTION_PARENT_PAGE_ID=<page-id-where-DB-should-live> \
//   NOTION_DATABASE_ID=<existing-jobs-pipeline-DB-id> \
//   node scripts/create-contacts-db.js
//
// On success the script prints the new database ID. Paste it into
// .env.local as NOTION_CONTACTS_DATABASE_ID and add the same variable
// to Vercel's environment settings.
//
// If the Related Jobs relation fails to create (some workspaces require
// manual relation setup), the script will still create everything else
// and print instructions for the relation.

import { Client } from '@notionhq/client';

const {
  NOTION_TOKEN,
  NOTION_PARENT_PAGE_ID,
  NOTION_DATABASE_ID, // existing jobs pipeline DB — used for the Relation
} = process.env;

if (!NOTION_TOKEN) {
  console.error('Missing NOTION_TOKEN env var.');
  process.exit(1);
}
if (!NOTION_PARENT_PAGE_ID) {
  console.error('Missing NOTION_PARENT_PAGE_ID env var. Provide the page ID where the new Contacts database should live.');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

const baseProperties = {
  'Name': { title: {} },
  'LinkedIn URL': { url: {} },
  'Email': { email: {} },
  'Phone': { phone_number: {} },
  'Current Company': { rich_text: {} },
  'Current Role': { rich_text: {} },
  'Warmth': {
    select: {
      options: [
        { name: 'Cold', color: 'gray' },
        { name: 'Warm', color: 'yellow' },
        { name: 'Strong', color: 'orange' },
        { name: 'Past Colleague', color: 'blue' },
        { name: 'Close', color: 'green' },
      ],
    },
  },
  'Source': {
    select: {
      options: [
        { name: 'Manual', color: 'default' },
        { name: 'LinkedIn Search', color: 'blue' },
        { name: 'Referral', color: 'green' },
        { name: 'Network', color: 'purple' },
        { name: 'Recruiter', color: 'pink' },
        { name: 'Conference', color: 'orange' },
        { name: 'Other', color: 'gray' },
      ],
    },
  },
  'How I Know Them': { rich_text: {} },
  'Outreach Status': {
    select: {
      options: [
        { name: 'Not Started', color: 'gray' },
        { name: 'Drafted', color: 'yellow' },
        { name: 'Sent', color: 'blue' },
        { name: 'Replied', color: 'green' },
        { name: 'Connected', color: 'purple' },
        { name: 'No Response', color: 'orange' },
        { name: 'Declined', color: 'red' },
      ],
    },
  },
  'Last Contacted': { date: {} },
  'Outreach Drafts': { rich_text: {} },
  'Notes': { rich_text: {} },
  'Date Added': { created_time: {} },
  'Last Updated': { last_edited_time: {} },
};

const properties = { ...baseProperties };

// Try to include the Related Jobs relation if we have a target DB.
if (NOTION_DATABASE_ID) {
  properties['Related Jobs'] = {
    relation: {
      database_id: NOTION_DATABASE_ID,
      single_property: {},
    },
  };
}

async function main() {
  let response;
  try {
    response = await notion.databases.create({
      parent: { type: 'page_id', page_id: NOTION_PARENT_PAGE_ID },
      title: [{ type: 'text', text: { content: 'Contacts' } }],
      properties,
    });
  } catch (err) {
    if (NOTION_DATABASE_ID && /relation/i.test(err.message || '')) {
      console.warn('Relation property could not be created via API. Retrying without it; add it manually after.');
      delete properties['Related Jobs'];
      response = await notion.databases.create({
        parent: { type: 'page_id', page_id: NOTION_PARENT_PAGE_ID },
        title: [{ type: 'text', text: { content: 'Contacts' } }],
        properties,
      });
      printRelationManualInstructions(response.id);
    } else {
      throw err;
    }
  }

  console.log('\nContacts database created.');
  console.log('Database ID:', response.id);
  console.log('URL:', response.url);
  console.log('\nNext steps:');
  console.log('  1. Add to .env.local:    NOTION_CONTACTS_DATABASE_ID=' + response.id);
  console.log('  2. Add the same variable to Vercel (Settings → Environment Variables).');
  console.log('  3. The integration is auto-shared because the token created the DB.');
  if (!NOTION_DATABASE_ID) {
    console.log('  4. Add the Related Jobs relation manually (see notes below).');
    printRelationManualInstructions(response.id);
  }
}

function printRelationManualInstructions(dbId) {
  console.log('\nManual relation setup:');
  console.log('  • Open the Contacts DB:', dbId);
  console.log('  • Add a property: type "Relation", target the Job Search Pipeline DB.');
  console.log('  • Name it "Related Jobs".');
}

main().catch((err) => {
  console.error('\nFailed to create Contacts database:', err.message || err);
  if (err.body) console.error(err.body);
  process.exit(1);
});
