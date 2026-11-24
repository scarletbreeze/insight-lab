# Insight Lab — Requirements Audit v1.0

## 1. Audit conclusion

The project is now sufficiently specified to begin implementation without another concept-definition round. The remaining uncertainties are data-acquisition and content-population tasks, not architectural blockers.

### Final product identity
- **Site name:** Insight Lab
- **Primary goal:** Kiwoom Lab internal presentation
- **Secondary goal:** personal portfolio
- **Tertiary goal:** useful/interesting public experience
- **Hosting:** `https://scarletbreeze.github.io/insight-lab/`
- **Repository:** `scarletbreeze/insight-lab`
- **Existing site:** `scarletbreeze.github.io` remains intact

## 2. Resolved naming conflicts

### Resolved
1. **Overall brand** is `Insight Lab`.
2. **Hero Lab** is Service 1, not the overall site name.
3. `내가 CEO라면` is renamed **CEO Lens**.
4. `ETF X-Ray` is deferred and is **not** one of the six v1 services.
5. `Broker Tycoon` is not a standalone v1 service; the time-travel/game concept is absorbed into **Market Time Capsule**.
6. `Popular` in Hero Lab is removed because there is no defensible popularity source. It can later return as **Most Asked** after VOC analysis.
7. `My Recipe` is removed. The user-facing concept becomes **Recommended Workflow / Curated Combo** based on official resources, expert/book references, screen relationships, and practical usage patterns.
8. User-facing S/A/B screen grades are removed. Any importance score is internal only.

## 3. Final six services

1. **Hero Lab** — Kiwoom Hero4 screen research / curation / map / workflows
2. **VOC Studio** — annual customer-question museum + Kiwoom notice/history analysis
3. **Broker Atlas** — securities-company financial/business structure visualization
4. **Market Time Capsule** — 1990–2026 market encyclopedia + returner/time-travel game
5. **CEO Lens** — executive-view securities-industry signal archive
6. **Normalman Archive** — personal study/development/research chronology

## 4. Architecture conflicts resolved

### Static vs server
There is no contradiction between crawling and using a static site.
- Python scripts perform collection and transformation.
- Results are written to JSON/Markdown.
- Astro/React renders those static assets.
- GitHub Pages serves the built output.
- A persistent backend/database is added only when a real requirement appears.

### Final engineering principles
- **Static First**
- **Server Later**
- **Data First**
- **AI Later** (AI-assisted development from day one; product AI only when useful)
- **JSON First, DB Later**
- **Deploy Automation First, Data Automation Later**

## 5. Market Time Capsule scope conflict resolved

Two requirements existed:
- full 1990–2026 coverage at the same structural depth;
- v1 should ship this week with representative working content.

Final rule:
- The **UI/data schema supports all years 1990–2026 and all 12 months per year from v1**.
- The ingestion pipeline should attempt full coverage.
- Where reliable data is not available, the UI must show a clear state such as `자료 확인 중` and hide unsupported charts rather than invent data.
- Other services may start with five-year history and expand later.

## 6. Data correctness risks identified

### 6.1 Historical equity universes
Using today’s S&P 500/Nasdaq 100/KOSPI 200/KOSDAQ 150 constituents for old years creates survivorship bias.

**Requirement:** use point-in-time constituents when a reliable public source is available. If not, label the fallback universe explicitly as approximate and never present it as historically exact.

### 6.2 Monthly stock return
Raw close-to-close prices can be distorted by stock splits and corporate actions.

**Default:** use split-adjusted prices when available. Dividends are excluded unless a reliable total-return series exists. The methodology page must state the exact definition.

### 6.3 Broker financial comparability
Business-segment disclosures differ by securities firm.

**Final rule:**
- compare only truly common metrics across firms;
- preserve raw company segment names;
- map to common tags only when defensible;
- leave ambiguous items unmapped/other;
- never force every firm into one identical revenue-mix template.

### 6.4 ROE
Use reported ROE when a consistent official value exists. If calculated, label it as calculated and apply one formula consistently.

### 6.5 Current-year data
For 2026 data that is not full-year, label the period as YTD / latest available period rather than presenting it as annual.

### 6.6 VOC causality
Notice timing and customer-question spikes may move together without a causal relationship.

**Final wording:** observational only, e.g. “문의가 같은 시기에 증가했다.” Never “공지 때문에 문의가 증가했다.”

## 7. Content rights / privacy risks

### Public-data-only boundary
- No company-confidential information
- No internal system information
- No customer or employee private information
- No personal diary/private archive content

### Customer board
- Public board may still contain personally identifying information.
- Public site should use cleaned/summary text, not raw personal data.
- Mask/remove names, phone numbers, account numbers, emails, etc.

### Book / Hero materials
- Use short summaries, screen references, and attribution.
- Do not reproduce long copyrighted passages.
- Legend’s Pick can include expert name/nickname, style, screens, and short usage summary.

### Screenshots
- Official screenshots may be used selectively as reference where appropriate.
- The preferred site presentation is a Hero Lab-styled schematic/mockup plus links to official guides.

## 8. Implementation blockers still to resolve during development

These do **not** require more product-definition meetings:

1. Exact bibliographic metadata / imported markdown for the Kiwoom book used for Legend’s Pick.
2. Technical behavior of the public VOC board (HTML/API/XHR/pagination).
3. Historical constituent data availability for market universes.
4. Final public-data source chosen for Korean/US historical prices.
5. Exact public reuse terms for logos/screenshots/data from each source.
6. Exact 2026 data cut-off date for Broker Atlas / VOC / CEO Lens.

Codex/Claude should treat these as explicit data tasks, not silently invent answers.

## 9. Final v1 philosophy

The v1 goal is **not** “every dataset is complete forever.”

The v1 goal is:
> all six services have their intended structure, core interaction, real representative public data, sources, and working navigation deployed as one coherent Insight Lab experience.

After v1, content depth and historical coverage are expanded iteratively.
