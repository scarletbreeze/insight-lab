# AGENTS.md — Insight Lab

## Project
Insight Lab is a static-first public financial research/interactive exhibition hosted on GitHub Pages.

Primary goal: Kiwoom Lab 2기 presentation.
Secondary goal: personal portfolio.

Services:
1. Hero Lab
2. VOC Studio
3. Broker Atlas
4. Market Time Capsule
5. CEO Lens
6. Normalman Archive

## Read first
Before any major task, read:
- `docs/00-project-charter.md`
- `docs/01-design-system.md`
- `docs/02-data-policy.md`
- the relevant service requirements in `docs/`
- `Insight_Lab_Requirements_v1.0.md` if present at repository root/docs

For a large feature, share a short plan naming the applicable requirement, expected files, and verification steps, then proceed.

## Tech stack
- Astro
- React
- TypeScript
- Tailwind CSS
- ECharts
- Python for data collection/normalization
- GitHub Actions
- GitHub Pages

No backend/database in v1 unless explicitly approved.

## Engineering principles
- Static First
- Server Later
- Data First
- AI Later
- JSON First, DB Later
- Deploy Automation First, Data Automation Later

## Repository rules
- `src/` = website code
- `data/` = processed public data consumed by the site
- `scripts/` = collection/clean/normalize/build scripts
- `docs/` = product and engineering source of truth
- `public/` = public static assets only

Do not mix raw collection logic into UI components.
Do not put secrets or private/company data in the repository.

## Data rules
- Public data only.
- Every major factual claim needs a source.
- Preserve source URL/date where possible.
- Distinguish Fact from Insight/Observation.
- Never fabricate missing data.
- Use `자료 확인 중`/empty states where needed.
- Do not force incomparable broker segment data into common metrics.
- Do not claim causal VOC relationships from timing alone.
- For historical market data, avoid survivorship bias and corporate-action distortion; disclose approximations.

## Privacy/content rules
Never publish:
- company-confidential/internal information
- customer/employee private information
- account numbers, emails, phone numbers, credentials
- private diary/personal notes

VOC public output should use cleaned/summarized text rather than raw personal content.

## UI rules
Global style:
- Dark Editorial + Kiwoom-inspired red/blue accents
- restrained borders, minimal shadow
- slightly rounded cards
- desktop-first, mobile-readable

Service themes may vary, but navigation/layout/component rules remain coherent.

## AI workflow
Codex and Claude Code can both implement and review.
The agent that implements a change should not be its only reviewer.
Do not let both modify the same files concurrently.

For major work:
1. inspect repo/docs
2. propose plan
3. list files
4. implement
5. lint/typecheck/test/build
6. summarize
7. review
8. fix

### Autonomous work

Within the requested scope, choose the next unfinished requirement and carry it through implementation and verification. Install necessary project dependencies, consult public sources, and resolve recoverable failures independently. If a source is unavailable, record the affected period or claim and the evidence still needed, then continue other in-scope work.

Ask when conflicting requirements materially change the outcome, a destructive or irreversible action needs authorization, or progress requires information only the user can supply. Keep private materials private under the content rules above. When deployment is requested, verify the changed content or interaction at the production URL before reporting release completion.

Choose tools according to the evidence needed. Use the PDF skill when a report's table layout or footnotes affect interpretation, spreadsheet tools for workbook values and units, and a browser for navigation, responsive layout, or interaction checks. For a design comparison or release review, use the repository skill at `.agents/skills/insight-lab-review/SKILL.md`.

### Parallel service work

For a development batch spanning Market Time Capsule, VOC Studio and Broker Atlas, the current session leads integration and delegates one independent assignment to each relevant service agent. A single-service change can stay with one owner. The user can request the whole batch in this session.

```text
Current session · integration and release
├── Market agent · Market Time Capsule
├── VOC agent    · VOC Studio
├── Broker agent · Broker Atlas
└── UI/UX reviewer · independent walkthrough of the integrated site
```

| Owner | Scope for this batch |
| --- | --- |
| Market Time Capsule | Requirements §9. Historical events, point-in-time holdings, prices, return calculations and market screens. |
| VOC Studio | Requirements §7. Public-source collection, anonymized aggregates, classification checks and VOC screens. |
| Broker Atlas | Requirements §8. Disclosures, comparable financial metrics, ranking evidence and broker screens. |
| UI/UX reviewer | Read and operate the integrated site as a visitor. Report the most consequential navigation, readability, accessibility or visual issues to the lead. |
| Integration lead | Shared components and navigation, cross-service tests, design audit, dependencies, Git and release verification. |

1. The lead checks the working tree and any running collectors, then assigns each agent a requirement, an explicit set of files and a user flow to verify. Start independent work together and reuse completed collections.
2. Give each changed file one writer. An agent needing a shared change sends the lead the affected path and expected behavior. Separate worktrees can isolate changes when scopes overlap. Use one full build per integrated revision in a shared checkout.
3. Service agents implement and run focused checks. They hand back changed paths, the verified result and its source or test, and any remaining dependency. The lead resolves cross-service issues and updates `docs/v1-implementation-check.md` with the actual coverage.
4. The lead runs integration checks and verifies affected flows on mobile and desktop. Record user-visible editorial updates in `data/updates.json` with their actual site update time and destination. The home page displays the six most recent entries. When deployment is in scope, the lead commits the reviewed files, pushes and checks the changed content at both the root site and the project site.

On resuming a batch, read these ownership rules and the latest entry in `docs/v1-implementation-check.md`, inspect the worktree and active jobs, and reassign unfinished work from its last verified result.

### Independent UI/UX review

For a batch that changes a visitor flow, delegate to the project agent `ux_review` defined in `.codex/agents/ux_review.toml`. Give the reviewer a runnable integrated build and a concrete question for each affected flow. With four concurrent slots including the lead, start the reviewer when the first implementation slot becomes available. Keep the implementation owners available for fixes.

1. Begin at the usual entry point. For example, start at Broker Atlas and find the current cumulative net-income leader, its year-over-year change and the source. Use the interface before consulting the implementation.
2. Walk through the task on a narrow mobile viewport and on desktop. Check keyboard operation, reading order, visual hierarchy, legibility, overflow and repeated or unnecessary content. Keep units, reporting periods, coverage limitations and source links visible where the answer depends on them.
3. Return up to three findings in impact order, each with the route, viewport, reproduction steps, user impact, smallest useful change and a way to verify it. State what was actually tested. The reviewer reports to the lead, the implementation owner makes the change, and the reviewer repeats the affected task on the integrated build.
4. Apply the review severity rules below. Record the resolved issues, retest result and remaining material limitations in the design audit before release.

## Review severity
- Critical: fix before merge
- High: fix before merge
- Medium: fix when reasonable or document reason not to
- Low: optional/polish

## Definition of Done
A feature is not done merely because a page exists.
It is done when its intended user flow works, data/source states are correct, responsive layout is acceptable, and checks/build pass.

## Git
Use feature branches such as:
- `feature/hero-lab`
- `feature/voc-studio`
- `feature/broker-atlas`
- `feature/market-time-capsule`
- `feature/ceo-lens`
- `feature/archive`

`main` must stay deployable.
