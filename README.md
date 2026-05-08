# Job Search Agent — Phase 2

A modern, agentic job search tool built with React + Vite. Evaluates opportunities against your design framework and career values.

## Features

- 🔍 **Smart Job Search** — Filter by location, stage, and relevance
- ⭐ **Fit Scoring** — Jobs evaluated against your core strengths and North Star Principle
- 💼 **Culture Alignment** — See how each role matches your values
- 📌 **Targets Management** — Save and track jobs you're interested in
- 📱 **Responsive Design** — Works on desktop, tablet, and mobile

## Tech Stack

- **React 18** — UI framework
- **Vite** — Build tool
- **Lucide React** — Icons
- **CSS** — Styling

## Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
job-search-agent/
├── src/
│   ├── App.jsx          # Main job scout component
│   ├── App.css          # Styles
│   ├── index.css        # Global styles
│   └── main.jsx         # React entry point
├── index.html           # HTML entry point
├── vite.config.js       # Vite configuration
├── package.json         # Dependencies
└── README.md            # This file
```

## How It Works

The tool evaluates 8 curated job opportunities against:

1. **North Star Principle** — Does it use tech to enable tangible, real-world impact?
2. **Your Core Strengths** — Rules Engine, Order Management, Positions
3. **Culture & Values** — Human-centered, collaborative, mission-driven
4. **Practical Criteria** — Salary, location, stage, team quality

Jobs are color-coded by fit:
- 🟢 98-90% — Perfect/near-perfect matches
- 🔵 89-80% — Strong fits with minor trade-offs
- 🟡 79-70% — Good opportunities with compromises

## Phase 3 & Beyond

This Phase 2 tool is the foundation for:

- **Phase 3:** Notion API integration, LinkedIn employee search, AI outreach drafting
- **Phase 4+:** Autonomous weekly job search, offer comparison, interview tracking

## Phase 3 Setup

Phase 3 Week 1 adds a "Save to Notion" sync. Clicking **Interested** on a job card calls a Vercel serverless function (`/api/save-to-notion`) that writes a new page to your Notion database.

### Required environment variables

The serverless function reads two values from `process.env`:

| Variable | Value |
| --- | --- |
| `NOTION_TOKEN` | Your Notion integration's internal integration token (do **not** commit) |
| `NOTION_DATABASE_ID` | `35a24d4a997080d0b5cfca370510138c` |

`.env.local` is gitignored and used only for local `vercel dev` runs. Production reads from Vercel's environment variables.

### Setting env vars in Vercel

1. Open the [Vercel dashboard](https://vercel.com/dashboard) → select the `job-search-agent` project.
2. **Settings** → **Environment Variables**.
3. Add `NOTION_TOKEN` (paste the token from 1Password) and `NOTION_DATABASE_ID`.
4. Apply each to **Production**, **Preview**, and **Development**.
5. **Redeploy** from the Deployments tab — env-var changes only take effect on a new deployment.

### Notion database requirements

The integration token must be invited to the target database (Notion → database → `...` → **Connections** → add your integration). The function writes to these properties: Role Title, Company, Status, Fit Score, Fit Tier, Salary Range, Salary Min, Location, Remote, Stage, Industry, Job URL, Company URL, North Star Match, Why Good Fit, Source.

## Deployment

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkmk221%2Fjob-search-agent)

Or deploy manually:

```bash
npm install -g vercel
vercel
```

## License

MIT
