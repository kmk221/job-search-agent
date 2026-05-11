# Contacts Database Setup

A second Notion database for tracking contacts/connections that relate to the Job Search Pipeline.

## Two ways to set this up

### Option A — Programmatic (recommended)

Runs against the Job Scout Agent integration token so the integration is auto-shared.

```bash
# 1. Put your Notion integration token in .env.local
#    NOTION_TOKEN=secret_xxxxxxxxxxxx (from 1Password)

# 2. Pick a parent page in Notion where the new DB should live, copy its
#    page ID from the URL. Then run:
NOTION_TOKEN=$(grep '^NOTION_TOKEN=' .env.local | cut -d= -f2) \
NOTION_PARENT_PAGE_ID=<paste-parent-page-id> \
NOTION_DATABASE_ID=$(grep '^NOTION_DATABASE_ID=' .env.local | cut -d= -f2) \
node scripts/create-contacts-db.js
```

The script prints the new database ID. Paste it into `.env.local` as
`NOTION_CONTACTS_DATABASE_ID` and add the same key to Vercel.

If the Notion API rejects the `Related Jobs` relation, the script retries
without it and prints manual setup instructions.

### Option B — Manual (if you'd rather click through Notion)

1. In Notion, create a new full-page database called **Contacts**.
2. Add the properties below in order — type names match the Notion UI.
3. Open the integration connection panel (`...` menu → **Connections**)
   and invite the **Job Scout Agent** integration.
4. Copy the database ID from the URL (the 32-char chunk before `?v=`).
5. Paste it into `.env.local` and Vercel as `NOTION_CONTACTS_DATABASE_ID`.

## Schema

| Property             | Type             | Options / Target                                                                 |
| -------------------- | ---------------- | -------------------------------------------------------------------------------- |
| Name                 | Title            | —                                                                                |
| LinkedIn URL         | URL              | —                                                                                |
| Email                | Email            | —                                                                                |
| Phone                | Phone            | —                                                                                |
| Current Company      | Text             | —                                                                                |
| Current Role         | Text             | —                                                                                |
| Warmth               | Select           | Cold, Warm, Strong, Past Colleague, Close                                        |
| Source               | Select           | Manual, LinkedIn Search, Referral, Network, Recruiter, Conference, Other         |
| How I Know Them      | Text (long form) | Critical context for AI outreach drafting                                        |
| Related Jobs         | Relation         | → Job Search Pipeline (the existing Jobs DB)                                     |
| Outreach Status      | Select           | Not Started, Drafted, Sent, Replied, Connected, No Response, Declined            |
| Last Contacted       | Date             | —                                                                                |
| Outreach Drafts      | Text             | Store drafted messages here                                                      |
| Notes                | Text             | —                                                                                |
| Date Added           | Created time     | Auto                                                                             |
| Last Updated         | Last edited time | Auto                                                                             |

## Verifying the integration share

After creation, confirm:
- The Job Scout Agent integration appears under the DB's Connections list.
- A test page can be created via the API (the same way the Jobs DB works).
- The Related Jobs property points to the Jobs Pipeline DB.
