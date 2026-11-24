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

Do not implement a large feature before proposing a plan.

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
Codex is the default implementation writer.
Claude Code is the default reviewer.
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
