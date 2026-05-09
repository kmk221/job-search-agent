# Job Scout Agent — TODO

Tracked items deferred until appropriate phase. Don't tackle these until noted phase is complete.

## 🎨 UI Polish Pass (after Phase 3 Week 3)

Visual cleanup once core agentic functionality is shipped end-to-end. Do not start until Week 3 (AI outreach drafting) is fully working.

### Color & Visual Hierarchy
- [ ] Replace light green color used in saved-state badges with a more refined palette
- [ ] Reduce visual weight of contextual descriptive text (the "✨ Now references your core strengths..." paragraph and "Phase 2 (Updated)..." block)
- [ ] These should be present but not compete with primary content (jobs)
- [ ] Consider: smaller text size, muted gray, collapsible accordion, or move to a "What's New" section

### Form Controls
- [ ] Dropdown chevron icons sit too close to the right edge of select boxes
- [ ] Add adequate right padding so chevrons don't feel cramped against the border
- [ ] Verify across all dropdowns (Location, Stage, etc.)
- [ ] Verify on both desktop and mobile breakpoints

### Header Section
- [ ] "Job Scout Agent — Phase 2" title — once Phase 3 is done, update title to remove phase number, OR move phase indicator to a small subtle subtitle/badge
- [ ] Re-evaluate the descriptive paragraphs below the title — too much explanatory text for a tool used regularly

### Status Badge System
- [ ] The "Saved — View in Notion ↗" badge currently uses light green background — design a more cohesive badge system
- [ ] Consider distinct visual treatment for: Saved | Unsaved | Currently being processed | Error states
- [ ] Make sure undo button has clear visual hierarchy (secondary to the saved badge)

### General
- [ ] Audit overall typography hierarchy — should feel more polished
- [ ] Audit spacing and rhythm of job cards
- [ ] Consider: dark mode support?

---

## 🛠️ Other Deferred Items

### Phase 4 candidates (after entire Phase 3 is done)
- [ ] Job URL verification agent — periodically re-check saved jobs' links and flag stale/dead postings
- [ ] Better filter handling — Greenhouse and similar boards don't honor URL params; consider deep-linking strategy
- [ ] Sync direction: handle the case where user manually edits a Notion entry — should the app reflect those changes back?

---

### 🌐 Multi-source job aggregation (Phase 4)

Replace the current hardcoded 8 jobs with real-time pulls from multiple sources.

**Goal:** Job listings come from a dynamic pipeline, not a static array. Expand discoverable opportunities beyond what's manually curated.

**Potential sources to integrate:**
- [ ] LinkedIn Jobs API (via RapidAPI — same provider used for employee search)
- [ ] Greenhouse boards API (free, many companies use it: Faire, Ramp, Stripe, etc.)
- [ ] Ashby boards API (free, used by Ramp and others)
- [ ] Wellfound (formerly AngelList) — startup-focused
- [ ] Y Combinator Work at a Startup
- [ ] Lenny's Newsletter job board
- [ ] VC portfolio company careers pages (Sequoia, a16z, NEA, First Round, etc.)
- [ ] Built In (already showing up in your search results — has city-specific boards)

**Architecture considerations:**
- Need a normalized job schema so all sources map to the same shape
- Need deduplication logic (same job posted on multiple sources)
- Need source attribution so you know where each job came from
- Need rate limiting / caching to avoid hammering APIs
- Consider: pull on-demand vs. pull on a schedule and cache in a database

**Prerequisites:**
- LinkedIn employee search working (validates RapidAPI integration patterns)
- Decision on data store (Vercel KV? Supabase? Just keep using Notion?)

---

### 🤖 Autonomous weekly job search agent (Phase 4)

A scheduled agent that runs without manual triggering, finds new opportunities, scores them, and surfaces matches.

**Goal:** Wake up Monday morning to a curated list of new high-fit roles you haven't seen yet.

**What it does:**
- Runs on a schedule (e.g. every Monday at 8am)
- Pulls fresh postings from all configured sources (depends on multi-source aggregation above)
- Filters out: jobs you've already saved/passed, expired postings, exact duplicates
- Scores remaining jobs against your JOB_SEARCH_SKILL.md
- Surfaces matches:
  - Email digest with top 5-10 new matches
  - Auto-creates entries in Notion (Status = "Researching") for top picks
  - Optional: posts to a dashboard in your Vercel app
- Logs what it ran, what it found, what it filtered (for tuning later)

**Architecture options to evaluate:**
- Vercel Cron Jobs (built into Vercel, free for Hobby tier on simple schedules)
- GitHub Actions (free, runs on a schedule, can hit your endpoints)
- A cron-style serverless function on a schedule

**Prerequisites:**
- Multi-source aggregation working (so there's something fresh to search)
- Decision on notification channel (email? Notion-only? Slack?)
- Way to track "already seen" jobs so you don't get repeats

**Scoring evolution opportunity:**
This is also where the scoring logic could get smarter — incorporate signals like:
- Companies you've already saved (boost similar)
- Companies you've explicitly passed on (deboost)
- Whether VCs you respect are investors

---

Last updated: 2026-05-09
