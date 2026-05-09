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
- [ ] Multi-source job aggregation — pull from multiple sources, not just hardcoded data

---

Last updated: 2026-05-09
