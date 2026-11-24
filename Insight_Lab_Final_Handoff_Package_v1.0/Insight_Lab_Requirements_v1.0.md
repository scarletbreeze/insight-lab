# Insight Lab — Product & Development Requirements v1.0

## 0. Document purpose

This document is the implementation source of truth for **Insight Lab**. Codex and Claude Code must read this file before implementing or reviewing any major feature.

The site is designed first for an internal **Kiwoom Lab 2기** presentation, second as a personal portfolio, and third as a public-facing interactive research site.

---

# 1. Product vision

## 1.1 Brand
**Insight Lab**

## 1.2 Hero copy
> 금융업무에서 생긴 궁금증을 데이터와 AI로 직접 서비스로 만들어봅니다.

## 1.3 Product identity
Insight Lab is an interactive personal research exhibition that turns public financial information into explorable interfaces, visualizations, curated knowledge, and small experiments.

It should feel like:
- interactive exhibition
- personal research lab
- modern editorial/data product

It does **not** need to look like a conventional financial-services homepage.

## 1.4 Priority
1. Internal Kiwoom Lab presentation impact
2. Personal portfolio value
3. External-user utility

---

# 2. Core product principles

1. **Static First** — solve read/search/filter/visualization with static output before introducing a server.
2. **Server Later** — add backend only for real requirements such as auth, user state, live AI calls, or large-scale search.
3. **Data First** — structured and sourced data precedes AI features.
4. **AI Later** — AI is used from day one for development and content assistance, but is not forced into the product UI.
5. **JSON First, DB Later** — static JSON/Markdown is the default persistence layer for v1.
6. **Deploy Automation First, Data Automation Later** — automate build/deploy first; scheduled scraping comes later.
7. **Public Data Only** — no internal/confidential company data.
8. **Fact / Insight / Source separation** — factual statements and interpretation must be distinguishable.

---

# 3. Information architecture

## 3.1 Main navigation
Desktop navigation directly exposes all six services:

- Hero Lab
- VOC Studio
- Broker Atlas
- Market Time Capsule
- CEO Lens
- Normalman Archive

Secondary controls:
- Search
- About
- GitHub

Mobile may collapse the six services into a menu, but every service must remain one tap away.

## 3.2 Main routes

```text
/
/hero-lab
/voc-studio
/broker-atlas
/market-time-capsule
/ceo-lens
/normalman-archive
/about
/search
/content-policy
/source-policy
```

## 3.3 Home page layout
1. Hero section
2. 3×2 service-card grid
3. Integrated KPI row (4 metrics initially)
4. Latest from the Lab (about 6 items)
5. About / project statement
6. Footer

### Service mapping labels
- PRODUCT → Hero Lab
- CUSTOMER → VOC Studio
- COMPANY → Broker Atlas
- MARKET → Market Time Capsule
- INDUSTRY → CEO Lens
- ARCHIVE → Normalman Archive

Labels support the narrative but service names remain the primary navigation.

---

# 4. Visual design system

## 4.1 Global theme
**Dark Editorial + Kiwoom Accent**

- base: near-black / charcoal / deep navy
- primary text: white / light gray
- primary accent: Kiwoom-inspired red
- secondary accent: blue
- cards: deep navy/charcoal
- borders and color contrast instead of heavy shadows
- small corner radius, not highly rounded SaaS cards

## 4.2 Typography
Hybrid typography:
- Korean/body/UI: clean sans-serif
- major editorial headers: selective serif use
- screen numbers/data/code: mono

## 4.3 Responsive rule
**Desktop First + Mobile Readable**
- desktop presentation quality has priority
- mobile must not break
- dense maps/charts may simplify or use local horizontal scrolling

## 4.4 Service accents
- Hero Lab: blue / terminal/data feel
- VOC Studio: magenta/red / museum/timeline feel
- Broker Atlas: navy / data visualization
- Market Time Capsule: era-specific themes
- CEO Lens: black/white with restrained gold/executive accents
- Normalman Archive: paper/archive editorial tone

---

# 5. Shared UX and components

## 5.1 Shared content model

```ts
interface BaseContent {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  tags: string[];
  sources: SourceRef[];
  publishedAt?: string;
  lastUpdated: string;
}
```

## 5.2 Source model

```ts
interface SourceRef {
  sourceName: string;
  sourceType: 'official' | 'disclosure' | 'research' | 'media' | 'reference' | 'editorial';
  sourceUrl?: string;
  sourceDate?: string;
  retrievedAt?: string;
}
```

## 5.3 Shared components
- `ContentCard`
- `MetricCard`
- `SourceCard`
- `TimelineCard`
- `FilterBar`
- `SearchInput`
- `TagChip`
- `SourceBadge`
- `LatestItem`
- `RelatedContent`

Specialized cards may extend shared patterns:
- `HeroScreenCard`
- `BrokerCard`
- `SignalCard`

## 5.4 Shared chart components
- BarChart
- LineChart
- Donut/PieChart
- RankingBar
- TimelineChart

Prefer ECharts for data visualization.

## 5.5 Search
Global search groups results by service.

Dedicated local search:
- Hero Lab
- Normalman Archive

VOC Studio, Broker Atlas, CEO Lens prioritize filters over local free-text search in v1.

## 5.6 Sources in UI
Card level:
- compact source badge only

Detail page:
- full Sources section

Content should distinguish:
- **Fact**
- **Insight / Observation**
- **Source**

## 5.7 Latest section
`Latest from the Lab` shows roughly six most recently updated items across services.

## 5.8 Home KPI
Start with four integrated metrics, for example:
- Labs
- Sources
- Years Covered
- Contents

Expand into per-service KPI after content volume grows.

---

# 6. Service 1 — Hero Lab

## 6.1 Purpose
A modern research/curation layer over Hero4 screens.

Core question:
> 영웅문에서 무엇을 보고, 어떤 화면을 함께 쓰면 좋을까?

Public official references include:
- 영웅문 길라잡이: https://download.kiwoom.com/hero4_help_new/hero100/hero.htm
- 영웅문 100% 활용하기: https://download.kiwoom.com/hero4_help_new/intro/intro.htm

The site should modernize discovery and curation without reproducing large copyrighted passages.

## 6.2 Routes
```text
/hero-lab
/hero-lab/discover
/hero-lab/hall-of-fame
/hero-lab/recipes
/hero-lab/layouts
/hero-lab/map
/hero-lab/screens/[screenNo]
/hero-lab/insights
```

## 6.3 Home layout
1. Hero title
2. Search: “영웅문에서 무엇을 하고 싶으세요?”
3. Today’s Recommended Workflow
4. Purpose-based discovery
5. Investor-style discovery
6. Hall of Fame
7. Hero Map teaser
8. Recent updates

## 6.4 Discovery dimensions
### Investor style
- 초보
- 단타
- 스윙
- 장기
- 파생
- 해외

### Analysis interest
- 수급
- 차트
- 종목발굴
- 시황
- 뉴스

Additional filters:
- product
- difficulty
- screen type

## 6.5 Hall of Fame
### Legend’s Pick
All experts/investors from the selected Kiwoom book/source material should be included where source data exists.

Each card:
- person name/nickname
- investment style
- representative screens (3–5)
- one-line characteristic
- book/chapter source

### Hero Essential
Curated core screens based on official guides, expert usage, screen connectivity, and usefulness.

### Most Asked
Do **not** populate until VOC analysis supports it. It replaces unsupported “Popular” rankings.

## 6.6 Screen Encyclopedia detail
Fields / sections:
- screen number
- screen name
- category
- product
- recommended investment styles
- analysis styles
- difficulty
- why this screen matters
- when to use
- core features
- similar screens
- related screens
- recommended workflows
- book reference
- short editorial comment
- official screenshot reference where appropriate
- Hero Lab schematic/mockup
- official help URL
- guide URL
- Hero100 URL
- sources
- last updated

## 6.7 Recommended Workflow
No “My Recipe” authority claim.

Workflow classes:
- `Legend Workflow`
- `Official Workflow`
- `Recommended Workflow / Curated Combo`

Example starting combo:
- 0641 당일 시장 등락률 차트
- 0780 투자자별 매매동향
- 0130 관심종목

The combination should be explained as a curated workflow based on function/usage context, not as professional investment advice.

## 6.8 Hero Map
Purpose-based tree, not numeric screen order.

Top-level branches:
- 시장 파악
- 종목 발굴
- 종목 분석
- 주문
- 계좌
- 파생
- 해외

Node click opens a side panel with:
- screen number/name
- short description
- category
- related screens
- detail link
- official-help link

## 6.9 Layout Lab
Inputs:
- Monitor: 1 / 2 / 3
- Style: 단타 / 스윙 / 장기 / 파생 / 해외
- Focus: 수급 / 차트 / 주문 / 시황

Output: a visual screen-layout schematic.

## 6.10 Screen universe construction
Do not force exactly 50 screens.

Build the universe from:
1. all Legend screens from book/reference material
2. major screens from official guides
3. screens explicitly identified as useful during research
4. screen relationships and recurring workflow hubs

Initial target: **50+ well-sourced screens**, expandable to 100+.

Any internal importance scoring stays internal and is not shown to users.

## 6.11 Hero Lab Definition of Done
- search works
- purpose/style filters work
- 50+ real screen records (target)
- all available Legend’s Pick entries imported
- detail pages render correctly
- Recommended Workflow works
- Hero Map interaction works
- Layout Lab works
- official links work
- Sources visible

---

# 7. Service 2 — VOC Studio

## 7.1 Purpose
An annual museum of Kiwoom’s public changes and public customer questions.

Core question:
> 그 해 키움에서는 무슨 일이 있었고, 고객들은 무엇을 궁금해했을까?

## 7.2 Scope
Start with the most recent **5 years** and expand backward later.

## 7.3 Routes
```text
/voc-studio
/voc-studio/year/[year]
/voc-studio/topics
/voc-studio/topics/[topic]
/voc-studio/timeline
/voc-studio/compare
/voc-studio/methodology
```

## 7.4 Home/year experience
Horizontal year timeline.

For selected year show:
1. one-sentence year summary
2. Top 10 customer-question topics
3. major topics
4. Kiwoom Timeline
5. topic-based keyword cloud
6. selected Notice × VOC observations
7. external market/regulatory context
8. latest updates

## 7.5 Top 10 question card
- rank
- topic
- question count
- YoY change
- representative summarized questions (2–3)
- category tags
- one-line observation

## 7.6 Taxonomy
### Level 1
- 주문
- 계좌
- HTS/MTS
- 인증
- 해외주식
- 파생
- 신용/미수
- 수수료
- 입출금/이체
- 기타

### Level 2
Domain-specific subtopics, e.g. overseas stocks:
- 환전
- 거래시간
- 주문거부
- 결제
- 수수료
- 세금

### Inquiry intent
No sentiment analysis.

Use intent such as:
- how_to
- error
- request
- policy
- fee
- status

## 7.7 Public-question handling
Store cleaned/normalized text internally for the project, but public UI should prefer:
- summarized representative question
- topic/type
- year/date
- source link

Remove/mask personal data.

## 7.8 Kiwoom Timeline
Event fields:
- date
- title
- category
- short summary
- official notice URL
- external related context
- related VOC topic (optional)

Suggested categories:
- 서비스
- 시스템
- 제도
- 상품
- 해외
- 보안/인증
- 장애/점검
- 기타

## 7.9 Notice × VOC Insight
Only show when there is a meaningful observable temporal pattern.
Never claim causality.

Good language:
> 관련 공지 시점 전후로 같은 주제의 문의가 함께 증가했다.

## 7.10 Year compare
User selects any two available years.

Compare:
- total question volume
- Top 10 topics
- Level-1 category share
- newly emerged topics
- declining topics
- topic cloud
- major-notice count

## 7.11 Topic page
For each topic show:
- volume by year
- top subquestions
- related notices
- related external policy/context
- representative summarized questions
- key changes

## 7.12 External context
Per year: roughly 5–10 major events initially, expandable.
Sources may include FSC, FSS, KRX, KOFIA, KCMI, major media, etc.

## 7.13 Data model
```ts
interface VocPost {
  id: string;
  date: string;
  year: number;
  title: string;
  cleanedText?: string;
  categoryL1: string;
  categoryL2?: string;
  topic: string;
  inquiryIntent?: string;
  screenNo?: string;
  product?: string;
  questionSummary: string;
  keywords: string[];
  sourceUrl: string;
  relatedNoticeId?: string;
}
```

## 7.14 Methodology page
Must explain:
- data source
- collection period
- PII handling
- duplicate handling
- taxonomy method
- question-count method
- notice/VOC relationship rule
- limitations

## 7.15 VOC Studio Definition of Done
- latest five years selectable
- Top 10 topics per year
- question taxonomy works
- timeline works
- topic page works
- year compare works
- topic cloud works
- methodology page exists
- no raw PII exposed
- observational wording used

---

# 8. Service 3 — Broker Atlas

## 8.1 Purpose
Explore how major Korean securities firms grow, earn, and change through public disclosures.

## 8.2 Universe
- Base universe: top 10 by equity for the selected year
- **Kiwoom Securities is always visually pinned first** regardless of rank
- comparison metrics must retain actual rank values

## 8.3 Time range
Recent five years initially.

## 8.4 Routes
```text
/broker-atlas
/broker-atlas/brokers/[broker]
/broker-atlas/compare
/broker-atlas/rankings
/broker-atlas/money-map
/broker-atlas/methodology
```

## 8.5 Main page order
1. year selector
2. 10 broker cards
3. industry Top Rankings
4. Money Map highlight
5. annual industry insight
6. Compare Broker

## 8.6 Broker detail
1. name + Character
2. 4 major metrics
3. 5-year trend
4. Money Map
5. disclosed business segments
6. Turning Points
7. major strategy/IR/news references
8. Sources

## 8.7 Common metrics
Preferred common comparison metrics:
- equity
- net income
- ROE
- total assets

Ranking categories:
- equity
- net income
- ROE
- growth

Growth:
- default: net-income YoY
- secondary: equity YoY

## 8.8 Segment rule
Preserve both:
- raw disclosed segment names
- mapped common tags where defensible

Common tags may include:
- Brokerage
- WM
- IB
- Trading
- Other

Ambiguous items remain `Unmapped/Other`.

## 8.9 Money Map
Company-specific and visually connected:
`customer/company/market → business segment → revenue source`

Do **not** force disclosed numbers into the same visual structure when the disclosures do not support it.
Keep:
- qualitative business-structure map
- quantitative disclosure charts

separate but visually related.

## 8.10 Character
AI may draft, but final one-line Character is human-reviewed.
It must be supportable by public disclosures/materials.

## 8.11 Turning Point
```ts
interface TurningPoint {
  year: number;
  title: string;
  summary: string;
  type: 'capital' | 'business' | 'regulation' | 'ma' | 'global' | 'digital' | 'other';
  sourceUrl: string;
}
```

## 8.12 Compare
Two brokers only in v1.
Compare:
- equity
- net income
- ROE
- total assets
- five-year trend
- disclosed business structure
- Character
- Turning Points

## 8.13 Data model
```ts
interface BrokerMetric {
  brokerId: string;
  name: string;
  year: number;
  equity?: number;
  netIncome?: number;
  roe?: number;
  totalAssets?: number;
  rankEquity?: number;
  rankNetIncome?: number;
  rankRoe?: number;
  growthNetIncome?: number;
  growthEquity?: number;
  businessSegmentsRaw: unknown[];
  businessSegmentsMapped: unknown[];
  character?: string;
  turningPoints: TurningPoint[];
  sources: SourceRef[];
  lastUpdated: string;
}
```

## 8.14 Sources
Primary/supplemental sources may include KIND, official company disclosures/IR, KOFIA, and other authoritative public sources.

## 8.15 Broker Atlas Definition of Done
- selected-year universe works
- Kiwoom is pinned first visually
- 10 broker cards render
- four common rankings work
- broker detail works
- two-company compare works
- Money Map works
- Turning Points render
- source/methodology page exists
- incomparable segment data is not forced into false equivalence

---

# 9. Service 4 — Market Time Capsule

## 9.1 Purpose
A market encyclopedia and time-travel game inspired by Korean “returner/reincarnation” fiction.

Core concept:
> 과거로 돌아간다면, 그 시대의 무엇을 기억하고 싶을까?

## 9.2 Coverage
**1990 through 2026**, all years represented with a common structure.

Each year contains 12 month routes.
Missing/uncertain data must show a truthful `자료 확인 중` state rather than invented values.

## 9.3 Routes
```text
/market-time-capsule
/market-time-capsule/[year]
/market-time-capsule/[year]/[month]
/market-time-capsule/game
/market-time-capsule/methodology
```

## 9.4 Era themes
- 1990–1997: DOS / PC통신 / early terminal
- 1998–2004: Windows 98/XP / early portal
- 2005–2011: Cyworld/Nate/blog-era web
- 2012–2016: early smartphone/app design
- 2017–2020: flat/mobile-finance design
- 2021–2026: modern data/trading UI

Strongly themed milestone years:
- 1998
- 2008
- 2020
- 2026

## 9.5 Year page
1. year hero
2. 12-month picker
3. one-sentence year summary
4. Winner
5. Loser
6. Tenbagger
7. Theme
8. Surprise
9. annual event timeline
10. annual market snapshot
11. returner memo
12. Sources

## 9.6 Month page
1. month hero
2. What Happened
3. Market Snapshot
4. Korea Top 10
5. US Top 10
6. Major Events
7. THEN
8. NOW
9. Returner Memo
10. Sources

## 9.7 Monthly stock-return definition
Default:
- first trading day’s adjusted close → last trading day’s adjusted close
- use split-adjusted prices where available
- dividends excluded unless reliable total-return data is available
- methodology must disclose exact source/definition

## 9.8 Equity universe
US:
- S&P 500 and Nasdaq 100 oriented

Korea:
- KOSPI 200 and KOSDAQ 150 oriented
- broader market may be used with liquidity/size filters

Filters may consider:
- point-in-time index membership where available
- market capitalization
- average traded value
- listing date
- trading halt
- exclusion reason

Avoid survivorship bias. If historical membership is unavailable, label the approximation.

## 9.9 Monthly top lists
Each month:
- Korea Top 10
- US Top 10

The UI may distinguish:
- raw ranking if available
- meaningful/liquid filtered ranking

Do not present an editorially filtered list as a purely mechanical full-market ranking without disclosure.

## 9.10 Market Snapshot
Track monthly start/end/change for:
- KOSPI
- KOSDAQ
- S&P 500
- NASDAQ
- USD/KRW
- US 10Y
- WTI
- Gold

## 9.11 Major events
Per year: roughly 10–15 major events
Per month: roughly 3–7

Categories:
- Market
- Macro
- Company
- Technology
- Regulation
- Global Event

Every factual event requires a source.

## 9.12 THEN / NOW / Returner Memo
- `THEN`: what was knowable at that time
- `NOW`: hindsight from today
- `Returner Memo`: concise time-traveler memory hook

Keep hindsight clearly separated from contemporaneous information.

## 9.13 Returner Mode game
10 questions per game.

Question types:
1. which stock performed best?
2. which asset would have been the best choice?
3. which event mattered most?

Flow:
- 4 choices
- answers stored until the end
- results revealed after 10 questions
- hypothetical final asset value
- grade S/A/B/C
- shareable result card

## 9.14 Data models
```ts
interface MarketEvent {
  date: string;
  title: string;
  category: string;
  summary: string;
  region?: string;
  sourceUrl: string;
  importance?: number;
}

interface MarketMonth {
  year: number;
  month: number;
  snapshot: Record<string, unknown>;
  koreaTop10: unknown[];
  usTop10: unknown[];
  events: MarketEvent[];
  thenSummary?: string;
  nowSummary?: string;
  returnerMemo?: string;
  sources: SourceRef[];
}
```

## 9.15 Market Time Capsule Definition of Done
- years 1990–2026 selectable
- 12 month routes exist for every year
- era theme changes work
- representative real data is visible
- Top 10 components work
- market snapshot works
- event/source cards work
- THEN/NOW separation is visible
- Returner Mode works
- methodology explains returns/universe/bias limitations
- missing data is never fabricated

---

# 10. Service 5 — CEO Lens

## 10.1 Purpose
An executive-view archive for learning how a securities-company CEO might frame industry change.

Core question:
> 내가 증권사 CEO라면, 지금 무엇을 봐야 할까?

The site should ask good questions rather than pretending to prescribe executive decisions.

## 10.2 Routes
```text
/ceo-lens
/ceo-lens/signals
/ceo-lens/competitors
/ceo-lens/regulation
/ceo-lens/capital-roadmap
/ceo-lens/digital-assets
/ceo-lens/ai-digital
/ceo-lens/global
/ceo-lens/archive
/ceo-lens/methodology
```

## 10.3 Main page
1. Hero
2. compact KPI row
3. This Week’s Signal (5)
4. CEO Question of the Week
5. Capital & License Roadmap teaser
6. Digital Asset / Token Securities
7. Competitor Moves
8. AI & Digital
9. Global Cases
10. Archive
11. Sources / Last Updated

## 10.4 Core topic axes
- Market
- Industry
- Competitor
- Regulation
- Capital & License
- Digital Asset / Token Securities
- AI & Digital
- Global Cases

## 10.5 Signal card
- date
- category
- title
- What happened
- Why it might matter
- Who is moving
- Questions to consider
- Source

## 10.6 CEO Question of the Week
One large question on the home page.
Clicking connects to relevant signals, companies, regulation, research and sources.

## 10.7 Capital & License Roadmap
Show:
- capital scale
- current stage
- relevant business/license state
- publicly announced goals
- recent changes
- sources

Visual comparison can show each major broker’s current position along a roadmap.
Do not infer unannounced targets.

## 10.8 Digital Assets / Token Securities
Sections:
1. Policy Timeline
2. Market Structure
3. Who is moving
4. Questions to Consider

Track authoritative public information from regulators/infrastructure institutions/company disclosures.

## 10.9 AI & Digital
Categories:
- AI 상담
- 투자정보
- 개인화
- Agent
- 업무자동화
- 개발/Coding
- Research
- Risk/Compliance

Case fields:
- company
- service
- application area
- public date
- one-line description
- source

## 10.10 Competitor Moves
Tabs:
- Korea
- Global

Domestic universe generally aligns with Broker Atlas major brokers.
Global examples may include major securities/investment firms and capital-market platforms.

## 10.11 Regulation
Filters:
- Brokerage
- WM
- IB
- Trading
- Digital Asset
- AI/Data
- Consumer Protection

Card:
- policy/rule
- institution
- date
- key change
- potentially affected business area
- question
- source

## 10.12 Global Cases
Case-study card:
- problem/context
- what was introduced
- what changed publicly
- question for Korean securities industry
- source

## 10.13 Tone framework
Use four-step framing:
1. What changed?
2. Why might it matter?
3. What should we watch?
4. Questions to consider

Avoid authoritative “I would do X as CEO” claims.

## 10.14 Archive
Filter by:
- year
- topic

Topics may include:
- AI
- Regulation
- Capital
- Digital Asset
- Global
- Competitor

## 10.15 Initial content targets
- Signals: 20
- Competitor Moves: 20
- Regulation: 10
- Capital Roadmap: 10 companies
- Digital Asset: 10
- AI/Digital: 15
- Global Cases: 10

Targets are minimum presentation goals, not hard product limits.

## 10.16 Data model
```ts
interface CeoSignal {
  id: string;
  date: string;
  category: string;
  title: string;
  summary: string;
  whyItMatters?: string;
  companies: string[];
  topics: string[];
  questions: string[];
  sourceName: string;
  sourceUrl: string;
  publishedAt?: string;
  lastUpdated: string;
  regulator?: string;
  effectiveDate?: string;
  businessArea?: string[];
  capitalRequirement?: string;
  licenseStage?: string;
}
```

## 10.17 CEO Lens Definition of Done
- weekly-signal cards work
- question-of-the-week works
- capital roadmap works
- digital-assets page works
- AI/Digital page works
- competitor cards work
- regulation filter works
- global cases work
- archive filter works
- all major claims are sourced
- tone stays exploratory, not prescriptive

---

# 11. Service 6 — Normalman Archive

## 11.1 Purpose
A chronological public archive of selected personal study, development and research material.

This is centered on the author’s learning history, not a category-first knowledge base.

## 11.2 Routes
```text
/normalman-archive
/normalman-archive/timeline
/normalman-archive/tags/[tag]
/normalman-archive/notes/[slug]
/normalman-archive/projects
/normalman-archive/about
```

## 11.3 Home
1. Hero
2. chronological timeline
3. recent entries
4. major tags
5. representative study materials
6. projects
7. links to existing GitHub blog posts

## 11.4 Organization
Chronology first, tags second.
No rigid top-level category hierarchy required.

Suggested free tags:
- Finance
- Development
- AI
- Career
- Books
- Reports
- University
- Trading
- Python
- React
- Django
- etc.

## 11.5 Note fields
- title
- date
- original date
- source
- tags
- content
- summary
- current comment
- related projects
- visibility
- original link

## 11.6 Content state
- Original
- Rewritten
- Summary

The site should indicate the state when relevant.

## 11.7 Visibility
Internal content state:
- public
- private
- review

Only `public` content is built into the public site.

## 11.8 Existing GitHub blog
Import metadata where practical:
- date
- title
- link
- tags

Keep the original blog intact and link to it rather than duplicating everything.

## 11.9 Initial content target
- 30–50 representative public notes/materials
- existing public GitHub posts linked
- further Evernote migration later

## 11.10 Data model
```ts
interface ArchiveNote {
  id: string;
  title: string;
  slug: string;
  date: string;
  originalDate?: string;
  tags: string[];
  sourceType?: string;
  sourceUrl?: string;
  contentType: 'original' | 'rewritten' | 'summary';
  summary?: string;
  currentComment?: string;
  relatedProjects: string[];
  visibility: 'public' | 'private' | 'review';
  lastUpdated: string;
}
```

## 11.11 Normalman Archive Definition of Done
- timeline works
- tags filter works
- note detail works
- only public items are shipped
- Original/Rewritten/Summary state visible
- existing blog links work
- 30+ representative items targeted

---

# 12. Data directory

```text
data/
├─ hero/
│  ├─ screens.json
│  ├─ legends.json
│  ├─ recipes.json
│  └─ layouts.json
│
├─ voc/
│  ├─ posts.json
│  ├─ topics.json
│  ├─ years.json
│  └─ notices.json
│
├─ brokers/
│  ├─ brokers.json
│  ├─ metrics.json
│  └─ turning-points.json
│
├─ market/
│  ├─ years/
│  ├─ months/
│  ├─ events.json
│  └─ game.json
│
├─ ceo/
│  ├─ signals.json
│  ├─ regulation.json
│  ├─ capital-roadmap.json
│  ├─ digital-assets.json
│  └─ global-cases.json
│
└─ archive/
   └─ notes/
```

---

# 13. Repository architecture

```text
insight-lab/
├─ src/
│  ├─ pages/
│  │  ├─ index.astro
│  │  ├─ hero-lab/
│  │  ├─ voc-studio/
│  │  ├─ broker-atlas/
│  │  ├─ market-time-capsule/
│  │  ├─ ceo-lens/
│  │  └─ normalman-archive/
│  ├─ components/
│  │  ├─ common/
│  │  ├─ hero/
│  │  ├─ voc/
│  │  ├─ broker/
│  │  ├─ market/
│  │  ├─ ceo/
│  │  └─ archive/
│  ├─ layouts/
│  ├─ styles/
│  ├─ utils/
│  └─ types/
├─ data/
├─ scripts/
├─ docs/
├─ public/
├─ tests/
├─ .github/workflows/
├─ AGENTS.md
├─ CLAUDE.md
├─ README.md
└─ package.json
```

---

# 14. Data scripts

```text
scripts/
├─ hero/
│  ├─ collect_help.py
│  ├─ normalize_screens.py
│  └─ build_hero_data.py
├─ voc/
│  ├─ crawl_board.py
│  ├─ clean_posts.py
│  ├─ classify_topics.py
│  └─ build_voc_data.py
├─ broker/
│  ├─ collect_disclosures.py
│  ├─ normalize_metrics.py
│  └─ build_broker_data.py
├─ market/
│  ├─ collect_prices.py
│  ├─ calculate_returns.py
│  ├─ collect_events.py
│  └─ build_market_data.py
├─ ceo/
│  ├─ collect_signals.py
│  └─ build_ceo_data.py
└─ archive/
   └─ import_notes.py
```

Each service follows:
`collect → clean/normalize → validate → build JSON`

---

# 15. Technology stack

## Frontend
- Astro
- React
- TypeScript
- Tailwind CSS

## Data processing
- Python

## Visualization
- ECharts

## Repository
- GitHub

## Hosting
- GitHub Pages

## CI/CD
- GitHub Actions

## AI development
- Codex CLI
- Claude Code

## v1 backend/database
- none

---

# 16. Git and development workflow

## 16.1 Branches
```text
main
feature/hero-lab
feature/voc-studio
feature/broker-atlas
feature/market-time-capsule
feature/ceo-lens
feature/archive
```

## 16.2 Writer / Reviewer model
### Codex = Writer
- implementation
- file changes
- tests
- builds
- refactoring
- bug fixes

### Claude Code = Reviewer
- requirements coverage
- structural review
- UX omissions
- code review
- data-model review
- source/edge-case review

Do not let both agents concurrently edit the same worktree/files.

## 16.3 Standard task cycle
1. Read `AGENTS.md`, `docs/`, and relevant service requirements.
2. Inspect current repository.
3. Propose implementation plan.
4. List files to create/change.
5. Implement.
6. Run lint/typecheck/tests/build.
7. Summarize changes.
8. Claude reviews.
9. Codex fixes Critical/High and justified Medium issues.
10. Claude re-reviews.

---

# 17. CI/CD and deployment

## 17.1 Production URL
`https://scarletbreeze.github.io/insight-lab/`

Existing `scarletbreeze.github.io` remains unchanged.

## 17.2 Deployment
`main` merge triggers GitHub Actions:
1. install Node
2. install Python if needed
3. validate/build data
4. run checks
5. Astro build
6. deploy GitHub Pages

## 17.3 Data update policy
Initially manual build/update:
- Hero Lab: manual
- VOC Studio: manual; periodic later
- Broker Atlas: manual at disclosure update
- Market Time Capsule: mostly fixed/historical; enrich manually
- CEO Lens: about weekly manual refresh
- Normalman Archive: on author update

Scheduled data automation comes later.

---

# 18. Content and source policy

## 18.1 Public content allowed
- university assignments safe for publication
- lecture/study notes
- book summaries within copyright-safe limits
- development study
- public reports
- public-data financial research
- existing public GitHub posts

## 18.2 Review before publication
- work-adjacent personal study notes
- material that could be mistaken for internal-company information

## 18.3 Never public
- company internal/confidential information
- customer/employee private information
- internal systems details
- private diary/personal notes
- credentials/secrets

## 18.4 Source priority
Prefer:
1. official regulators/public institutions/exchanges
2. official disclosure / company IR
3. recognized research institutions
4. reputable media
5. reference/encyclopedia as supplementary context

## 18.5 AI-assisted content
Do not badge every sentence as “AI generated.”
State in About/Methodology:
> AI-assisted, human-reviewed.

AI may draft summaries, tags and mappings. Final factual content must be source-backed and reviewed.

---

# 19. v1 product scope

The goal is **not** to finish every historical dataset permanently.

The goal is to ship a coherent, working v1 in which:
- all six services are accessible
- core interaction of each service works
- representative real public data is visible
- sources are shown
- no fake precision is used
- UI is coherent
- site is deployed

Mock/demo data is allowed only when:
- clearly labeled `demo/mock`
- real data is not yet available
- it is replaced where possible before presentation

---

# 20. Global Definition of Done

## Function
- all six services accessible from home
- navigation works
- search works
- major filters/interactions work
- no broken primary links
- 404 page exists

## Data
- JSON/schema validation passes
- major factual content has sources
- mock data clearly labeled
- missing data is honest

## UI
- common nav/footer/design system used
- service themes retained
- cards/typography/chart styling consistent
- hover/focus states exist
- empty/error states exist
- mobile is readable and non-broken

## Engineering
- lint passes
- typecheck passes
- tests pass
- build passes
- GitHub Pages deployment succeeds

## Presentation
- the six-service concept is understandable from the home page
- each service has at least one compelling end-to-end demo path
- Kiwoom Lab 2기 activity is stated in the footer/about context

---

# 21. Implementation order

## Foundation
1. project scaffold
2. design system
3. common layout/nav/footer/search shell
4. home page
5. six route shells
6. GitHub Pages deployment

## Services
1. Hero Lab
2. VOC Studio
3. Broker Atlas
4. Market Time Capsule
5. CEO Lens
6. Normalman Archive

## Finalization
- content population
- cross-service latest/search
- mobile QA
- source QA
- final Claude review
- presentation QA

---

# 22. First Codex task boundary

The first Codex task must **not** implement all six services.

It should only deliver:
- Astro + React + TypeScript + Tailwind scaffold
- repository structure
- common layout
- common design tokens
- navigation/footer
- home page
- six placeholder landing routes
- global search shell
- GitHub Pages configuration
- baseline lint/typecheck/test/build

After review, implement services one by one.

---

# 23. Footer

Include:
- Insight Lab
- About
- GitHub
- Data Sources
- Content Policy
- Source Policy
- Last Updated
- **Kiwoom Lab 2기 활동**

Suggested supporting copy:
> Built with public data, AI-assisted development, and personal research.
