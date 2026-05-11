# Job Search Skill — Kristin's Fit Criteria

This is the scoring rubric the agent uses when evaluating any job posting. The
`/api/score-job` endpoint reads this file at runtime and prepends it to the
analyzer prompt. Edit this file to tune scoring without changing code.

---

## North Star Principle

**Use tech to enable tangible, real-world human impact.**

A role should help real people (small business owners, creators, patients,
workers, learners) do something they care about. Infrastructure-only roles
score lower; roles that connect to a clear human outcome score higher.

---

## Three Core Strengths

These map to the kinds of work I do best. Strong fit means a role applies at
least one of them — ideally two or more.

1. **Rules Engine — Discovery / Influence**
   Cross-functional discovery work, building shared understanding across
   product / eng / GTM / compliance. Especially strong on regulated /
   policy-heavy domains.

2. **Order Management — Constraint-Aware Design**
   Knowing when *not* to build. Designing inside hard constraints
   (regulatory, technical, multi-stakeholder). Simplification under pressure.

3. **Positions — Systems Scaling**
   Design systems thinking. Platform-level patterns. Measuring how
   foundations scale across many teams and surfaces.

---

## Culture Values

- Human-centered: real users, real research, real outcomes
- Mission-driven: company exists for a reason beyond growth
- Collaborative: design has a seat at the table; partnership with PM / eng
- Path to Principal / Staff is visible (career progression)
- Design-forward (not engineering-led with design as service)

---

## Practical Criteria

| Criterion | Target |
| --- | --- |
| **Salary minimum** | $180,000 base (USD). Below = `salaryOnTarget: false`. |
| **Location** | Remote ✅, Austin ✅, Denver ✅, Portland ✅. Other = case-by-case. |
| **Stage** | Series B through Public. Seed/Series A = too early. |
| **Title** | Lead / Senior / Staff / Principal Product Designer. |

---

## Scoring Tiers

| Tier | Score | Definition |
| --- | --- | --- |
| Perfect | 90–100 | Hits North Star + at least 2 core strengths + all practical criteria. |
| Strong | 75–89 | Hits North Star + most strengths/criteria; minor trade-offs. |
| Good | 60–74 | Some alignment; missing pieces (e.g. salary low, stage off). |
| Maybe | <60 | Worth knowing but unlikely fit. |

---

## "Why Good Fit" guidance

When writing the personalized explanation, the analyzer should:
- Open by naming the North Star connection (or its absence).
- Cite which of the three core strengths the role exercises and *how*.
- Note 1–2 culture-value alignments.
- Surface any trade-offs honestly (salary off, stage mismatch, etc.) rather
  than glossing over them.
- 3–5 sentences total. No fluff.
