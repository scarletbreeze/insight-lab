import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(new URL('../data/' + path, import.meta.url), 'utf8')) as T;
}

test('VOC public-board totals contain only sourced aggregate counts', () => {
  const snapshot = readJson<{
    sourceUrl: string;
    start: string;
    end: string;
    oldestObserved: string;
    newestObserved: string;
    stop: string;
    years: Record<string, { total: number; categories: Record<string, number> }>;
    topicCounts?: Record<string, Record<string, number>>;
  }>('voc/public-board-sample.json');
  assert.equal(new URL(snapshot.sourceUrl).hostname, 'bbn.kiwoom.com');
  assert.ok(snapshot.start <= snapshot.end && snapshot.oldestObserved <= snapshot.newestObserved);
  if (snapshot.stop === 'reached-older-posts') assert.ok(snapshot.oldestObserved < snapshot.start);
  for (const [year, row] of Object.entries(snapshot.years)) {
    assert.ok(year >= snapshot.start.slice(0, 4) && year <= snapshot.end.slice(0, 4));
    assert.deepEqual(Object.keys(row).sort(), ['categories', 'total']);
    const counts = Object.entries(row.categories);
    assert.ok(counts.every(([category, count]) => ['문의', '제안', '칭찬·불만', '분류 확인 중'].includes(category)
      && Number.isSafeInteger(count) && count > 0));
    assert.equal(row.total, counts.reduce((total, [, count]) => total + count, 0));
  }
  if (snapshot.topicCounts) {
    const topicIds = new Set(readJson<{ id: string }[]>('voc/topics.json').map(({ id }) => id));
    topicIds.add('ambiguous');
    topicIds.add('unclassified');
    assert.deepEqual(Object.keys(snapshot.topicCounts), Object.keys(snapshot.years));
    for (const [year, topics] of Object.entries(snapshot.topicCounts)) {
      const counts = Object.entries(topics);
      assert.ok(counts.every(([topic, count]) => topicIds.has(topic) && Number.isSafeInteger(count) && count > 0));
      assert.equal(snapshot.years[year].categories['문의'], counts.reduce((total, [, count]) => total + count, 0));
    }
    const monthly = readJson<{ start: string; end: string; months: Record<string, Record<string, number>> }>('voc/monthly-topics.json');
    assert.equal(monthly.start, snapshot.start);
    assert.equal(monthly.end, snapshot.end);
    for (const [year, topics] of Object.entries(snapshot.topicCounts)) {
      for (const [topic, annualCount] of Object.entries(topics)) {
        if (topic === 'ambiguous' || topic === 'unclassified') continue;
        const sum = Object.entries(monthly.months).filter(([period]) => period.startsWith(year))
          .reduce((count, [, values]) => count + (values[topic] ?? 0), 0);
        assert.equal(sum, annualCount, `${year} ${topic}`);
      }
    }
  }
});

test('Independent VOC review reconciles year and topic agreement counts', () => {
  type Counts = { reviewed: number; agreement: number };
  const review = readJson<{
    samplePerYear: number;
    differences: Record<string, number>;
    development: { reviewed: number; before: number; after: number };
    years: (Counts & { year: number; sample: number })[];
    topics: (Counts & { topic: string })[];
  }>('voc/annual-classification-review.json');
  assert.deepEqual(review.years.map(({ year }) => year), [2022, 2023, 2024, 2025, 2026]);
  assert.ok(review.years.every(({ sample, reviewed, agreement }) => sample === review.samplePerYear && sample >= reviewed && reviewed >= agreement && agreement >= 0));
  const valid = new Set(readJson<{ id: string }[]>('voc/topics.json').map(({ id }) => id));
  assert.ok(review.topics.every(({ topic, reviewed, agreement }) => valid.has(topic) && reviewed >= agreement && agreement >= 0));
  for (const key of ['reviewed', 'agreement'] as const) {
    assert.equal(review.years.reduce((sum, row) => sum + row[key], 0), review.topics.reduce((sum, row) => sum + row[key], 0));
  }
  assert.deepEqual(Object.keys(review.differences).sort(), ['ambiguous', 'differentTopic', 'unclassified']);
  assert.equal(Object.values(review.differences).reduce((sum, count) => sum + count, 0),
    review.years.reduce((sum, row) => sum + row.reviewed - row.agreement, 0));
  assert.ok(review.development.reviewed >= Math.max(review.development.before, review.development.after));
});

test('Broker segment amounts reconcile with disclosed consolidated totals', () => {
  type Disclosure = { years: number[]; total: number[]; sourceUrl: string; segments: { name: string; amounts: number[] }[] };
  const filings = readJson<Record<string, Disclosure>>('brokers/disclosed-segments.json');
  for (const filing of Object.values(filings)) {
    assert.ok(['kind.krx.co.kr', 'dart.fss.or.kr'].includes(new URL(filing.sourceUrl).hostname));
    assert.equal(new Set(filing.segments.map(({ name }) => name)).size, filing.segments.length);
    assert.ok(filing.segments.every(({ amounts }) => amounts.length === filing.years.length));
    assert.deepEqual(filing.years.map((_, index) =>
      filing.segments.reduce((sum, segment) => sum + segment.amounts[index], 0)), filing.total);
  }
});

test('VOC notice windows use published dates and cover both 14-day periods', () => {
  type Notice = { id: string; date: string; topic: string; dateType?: string; sourceUrl: string };
  const general = readJson<{ oldestObserved: string; start: string; notices: Notice[]; yearCounts: Record<string, number> }>('voc/general-notices.json');
  assert.ok(general.oldestObserved < general.start);
  assert.equal(Object.keys(general.yearCounts).length, 5);
  assert.ok(general.notices.every((notice) => new URL(notice.sourceUrl).hostname === 'bbn.kiwoom.com'));
  const notices = new Map(general.notices.map((notice) => [notice.id, notice]));
  for (const filename of ['notice-index.json', 'notices.json', 'historical-notices.json']) {
    for (const notice of readJson<Notice[]>('voc/' + filename)) {
      notices.set(notice.id, filename === 'notices.json' ? { ...notice, dateType: 'published' } : notice);
    }
  }
  const { collectionStart, collectionEnd, observations } = readJson<{
    collectionStart: string; collectionEnd: string;
    observations: { noticeId: string; date: string; topic: string; before: number; after: number }[];
  }>('voc/notice-windows.json');
  assert.ok(observations.length > 0);
  assert.equal(new Set(observations.map(({ noticeId }) => noticeId)).size, observations.length);
  for (const { noticeId, date, topic, before, after } of observations) {
    const notice = notices.get(noticeId);
    assert.ok(notice?.dateType === 'published' && notice.date === date && notice.topic === topic, noticeId);
    assert.ok(before >= 0 && after >= 0 && before + after >= 5 && Math.abs(before - after) >= 2, noticeId);
    assert.ok(Date.parse(date) - 14 * 86_400_000 >= Date.parse(collectionStart), noticeId);
    assert.ok(Date.parse(date) + 14 * 86_400_000 <= Date.parse(collectionEnd), noticeId);
  }
});

test('Hero screen numbers and workflow references resolve to sourced records', () => {
  const screens = readJson<{ number: string, officialHelpUrl?: string, sources: { sourceUrl: string }[] }[]>('hero/screens.json');
  const workflows = readJson<{ steps: { number: string }[] }[]>('hero/recipes.json');
  const numbers = new Set(screens.map(({ number }) => number));
  const mentions = readJson<{ matchedThreads: number; screens: Record<string, number>; years: Record<string, { categories: { 문의: number } }> }>('voc/screen-mentions.json');
  const inquiryTotal = Object.values(mentions.years).reduce((total, year) => total + year.categories.문의, 0);
  assert.ok(mentions.matchedThreads <= inquiryTotal);
  assert.ok(Object.values(mentions.screens).reduce((sum, count) => sum + count, 0) >= mentions.matchedThreads);
  for (const [number, count] of Object.entries(mentions.screens)) {
    assert.ok(numbers.has(number) && Number.isInteger(count) && count > 0 && count <= mentions.matchedThreads);
  }
  assert.equal(numbers.size, screens.length);
  assert.ok(screens.length >= 50);
  for (const { number, sources, officialHelpUrl } of screens) {
    assert.match(number, /^\d{4}$/);
    assert.equal(officialHelpUrl ?? sources[0].sourceUrl, 'https://download.kiwoom.com/hero4_help_new/' + number + '.htm');
    assert.equal(new URL(sources[0].sourceUrl).hostname, 'download.kiwoom.com');
  }
  for (const { steps } of workflows) {
    assert.ok(steps.every(({ number }) => numbers.has(number)));
  }
  const guides = readJson<Record<string, { image?: string; focus: string[]; sections?: string[][] }>>('hero/screen-guides.json');
  assert.deepEqual(Object.keys(guides).sort(), [...numbers].sort());
  for (const [number, { image, focus, sections }] of Object.entries(guides)) {
    assert.ok(numbers.has(number));
    if (image) assert.match(image, /^\d{4}_\d+\.(gif|png)$/);
    assert.ok(sections && sections.length >= 2 && sections.every((section) => section.length === 2 && section.every((field) => field.trim())), number);
    assert.ok(focus.length > 0 && focus.every((step) => step.trim()));
  }
});

test('Official directory keeps distinct numbers, searchable names and image dimensions for every guide', () => {
  const index = readJson<{ screens: { number: string; title: string; group: string; menuTitles?: string[] }[] }>('hero/official-directory.json');
  const entries = new Map(index.screens.map(row => [row.number, row]));
  assert.equal(entries.size, index.screens.length);
  assert.ok(index.screens.every(row => /^\d{4}$/.test(row.number) && row.title.trim() && row.group.trim()));
  assert.ok(entries.get('0279')?.menuTitles?.includes('ETF시간대별추이'));
  const guides = readJson<Record<string, { width: number; height: number; relatedHelp?: { number: string }[] }>>('hero/screen-guides.json');
  for (const [number, guide] of Object.entries(guides)) {
    assert.ok(entries.has(number));
    assert.ok(Number.isInteger(guide.width) && guide.width > 0 && Number.isInteger(guide.height) && guide.height > 0);
    for (const link of guide.relatedHelp ?? []) assert.ok(entries.has(link.number), link.number);
  }
});

test('VOC notice and inquiry samples use known topics and retain distinct coverage', () => {
  const topics = new Set(readJson<{ id: string }[]>('voc/topics.json').map(({ id }) => id));
  const years = readJson<{ year: number, questionCoverage: string }[]>('voc/years.json');
  assert.deepEqual(years.map(({ year }) => year), [2026, 2025, 2024, 2023, 2022]);
  for (const path of ['voc/notices.json', 'voc/historical-notices.json', 'voc/notice-index.json', 'voc/posts.json']) {
    const records = readJson<{ id: string, topic: string, sourceUrl: string, date: string }[]>(path);
    assert.equal(new Set(records.map(({ id }) => id)).size, records.length);
    assert.ok(records.every(({ topic, sourceUrl, date }) => topics.has(topic)
      && new URL(sourceUrl).hostname.endsWith('.kiwoom.com')
      && years.some(({ year }) => date.startsWith(String(year)))));
  }
  const posts = readJson<{ date: string }[]>('voc/posts.json');
  for (const { year, questionCoverage } of years) {
    assert.equal(posts.some(({ date }) => date.startsWith(String(year))), questionCoverage === 'sample');
  }
});

test('Market quiz has ten valid choices with identifiable event sources', () => {
  const events = new Set(readJson<{ date: string }[]>('market/events.json').map(({ date }) => date));
  const questions = readJson<{ choices: string[], date: string, answer: number, series?: string[], sourceUrl?: string }[]>('market/game.json');
  assert.equal(questions.length, 10);
  const { months } = readJson<{ months: Record<string, Record<string, unknown>> }>('market/months/snapshots.json');
  for (const { choices, date, answer, series, sourceUrl } of questions) {
    assert.equal(choices.length, 4);
    assert.ok(choices[answer]);
    assert.ok(series ? series.every((id) => Boolean(months[date]?.[id])) : sourceUrl ? new URL(sourceUrl).protocol === 'https:' : events.has(date));
  }
});

test('Archive includes only public metadata and stable source links', () => {
  const notes = readJson<{ slug: string, contentType: string, visibility: string, sourceUrl: string }[]>('archive/notes/index.json');
  assert.ok(notes.length >= 30);
  assert.equal(new Set(notes.map(({ slug }) => slug)).size, notes.length);
  for (const { visibility, contentType, sourceUrl } of notes) {
    assert.equal(visibility, 'public');
    assert.equal(contentType, 'original');
    assert.match(sourceUrl, /^https:\/\/github\.com\/scarletbreeze\/scarletbreeze\.github\.io\/blob\/[a-f0-9]{40}\//);
  }
});

test('Market snapshots retain ordered observation dates and unit changes', () => {
  type Observation = { firstDate: string, lastDate: string, first: number, last: number, change: number | null };
  const data = readJson<{ through: string, months: Record<string, Record<string, Observation>> }>('market/months/snapshots.json');
  assert.ok(Object.keys(data.months).length >= 400);
  for (const [month, series] of Object.entries(data.months)) {
    for (const { firstDate, lastDate, first, last, change } of Object.values(series)) {
      assert.ok(firstDate.startsWith(month) && lastDate.startsWith(month));
      assert.ok(firstDate <= lastDate && lastDate <= data.through);
      assert.ok(change === null ? firstDate === lastDate : Math.abs(last - first - change) < 1e-8);
    }
  }
});

test('Index snapshots and the market timeline cover the documented periods', () => {
  type Snapshot = { firstDate: string; lastDate: string; first: number[]; last: number[]; firstSource: string; lastSource: string };
  const { annual, monthly } = readJson<{ annual: { rows: Record<string, [number, number | null]> }; monthly: Record<string, Snapshot> }>('market/korea-index-closes.json');
  const events = readJson<{ date: string; sourceUrl: string }[]>('market/events.json');
  const eventYears = new Set(events.map(({ date }) => Number(date.slice(0, 4))));
  for (let year = 1989; year <= 2025; year++) {
    const [kospi, kosdaq] = annual.rows[year];
    assert.ok(Number.isFinite(kospi) && kospi > 0);
    assert.equal(kosdaq === null, year < 1997);
    if (year >= 1990) assert.ok(eventYears.has(year));
  }
  assert.ok(eventYears.has(2026));
  assert.deepEqual(events.map(({ date }) => date), events.map(({ date }) => date).sort());
  assert.ok(events.every(({ sourceUrl }) => new URL(sourceUrl).protocol === 'https:'));
  const us = readJson<Record<string, Snapshot>>('market/us-index-closes.json');
  for (const [period, row] of [...Object.entries(monthly), ...Object.entries(us)]) {
    assert.ok(row.firstDate.startsWith(period) && row.lastDate.startsWith(period) && row.firstDate < row.lastDate);
    assert.ok(row.first.length === 2 && row.last.length === 2 && [...row.first, ...row.last].every((value) => value > 0));
    assert.ok([row.firstSource, row.lastSource].every((url) => new URL(url).protocol === 'https:'));
  }
  for (const [year, count] of [[2024, 12], [2025, 12], [2026, 10]]) {
    assert.ok(Array.from({ length: count }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`).every((period) => monthly[period]));
  }
  assert.ok(Array.from({ length: 12 }, (_, i) => `2024-${String(i + 1).padStart(2, '0')}`).every((month) => us[month]));
  assert.equal(us['2024-03'].lastDate, '2024-03-28');
  assert.equal(monthly['2024-03'].lastDate, '2024-03-29');
  assert.equal(monthly['2025-03'].firstDate, '2025-03-04');
  assert.deepEqual(monthly['2025-10'].last, [4107.50, 900.42]);
  assert.ok(Array.from({ length: 12 }, (_, i) => `2025-${String(i + 1).padStart(2, '0')}`).every((period) => us[period]));
  assert.ok(Array.from({ length: 10 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`).every((period) => us[period]));
  assert.deepEqual(us['2026-06'].first, [7599.96, 27086.81]);
  assert.deepEqual(us['2024-11'].last, [6032.38, 19218.17]);
  assert.equal(us['2024-12'].lastDate, '2024-12-31');
  assert.equal(monthly['2024-12'].lastDate, '2024-12-30');
  assert.equal(us['2025-03'].firstDate, '2025-03-03');
  assert.equal(us['2025-09'].firstDate, '2025-09-02');
  assert.deepEqual(us['2025-12'].last, [6845.50, 23241.99]);
});

test('2025 broker cohort keeps one consistent basis and Kiwoom is eighth by equity', () => {
  const data = readJson<{ date: string, basis: string, companies: { id: string, assets: number, liabilities: number, equity: number }[] }>('brokers/industry-2025.json');
  assert.equal(data.date, '2025-12-31');
  assert.equal(data.basis, '별도 재무제표');
  assert.equal(data.companies.length, 10);
  assert.equal(new Set(data.companies.map(({ id }) => id)).size, 10);
  assert.ok(data.companies.every(({ assets, liabilities, equity }) => Math.abs(assets - liabilities - equity) <= 1));
  const ranked = [...data.companies].sort((a, b) => b.equity - a.equity);
  assert.equal(ranked[7].id, 'kiwoom');
});

test('Capital roadmap maps each of the ten companies to a sourced designation', () => {
  const { companies } = readJson<{ companies: { id: string }[] }>('brokers/industry-2025.json');
  const roadmap = readJson<{ broker: string, stage: number, sourceUrl: string }[]>('ceo/capital-roadmap.json');
  assert.deepEqual(roadmap.map(({ broker }) => broker).sort(), companies.map(({ id }) => id).sort());
  assert.ok(roadmap.every(({ stage, sourceUrl }) => [3, 4, 8].includes(stage) && new URL(sourceUrl).hostname === 'www.fsc.go.kr'));
});

test('CEO Lens maintains sourced competitor and AI case coverage', () => {
  const signals = readJson<{ id: string; date: string; areas: string[]; sourceUrl: string }[]>('ceo/signals.json');
  assert.equal(new Set(signals.map(({ id }) => id)).size, signals.length);
  assert.ok(signals.filter(({ areas }) => areas.includes('competitors')).length >= 20);
  assert.ok(signals.filter(({ areas }) => areas.includes('ai-digital')).length >= 15);
  assert.ok(signals.every(({ sourceUrl }) => new URL(sourceUrl).protocol === 'https:'));
  assert.deepEqual(signals.map(({ date }) => date), signals.map(({ date }) => date).sort().reverse());
});

test('CEO Lens weekly editions reference five signals released in the stated date range', () => {
  type Edition = { start: string; through: string; questionSignal: string; signals: string[]; relatedSignals: string[] };
  const editions = readJson<Edition[]>('ceo/weekly.json');
  const byId = new Map(readJson<{ id: string; date: string }[]>('ceo/signals.json').map(({ id, date }) => [id, date]));
  for (const { start, through, questionSignal, signals, relatedSignals } of editions) {
    assert.ok(start <= through);
    assert.equal(new Set(signals).size, 5);
    assert.ok(signals.includes(questionSignal));
    assert.ok(relatedSignals.every((id) => id !== questionSignal && byId.has(id) && byId.get(id)! <= through));
    for (const id of signals) {
      const date = byId.get(id);
      assert.ok(date && date >= start && date <= through, id);
    }
  }
  const followUps = readJson<Record<string, { date: string; label: string; sourceUrl: string }[]>>('ceo/follow-ups.json');
  for (const [id, milestones] of Object.entries(followUps)) {
    const published = byId.get(id);
    assert.ok(published && milestones.length > 0, id);
    for (const { date, label, sourceUrl } of milestones) {
      assert.ok(date >= published && label.trim() && new URL(sourceUrl).protocol === 'https:', id);
    }
  }
});

test('Legend’s Pick covers nine book profiles and links to catalog screens', () => {
  const { profiles } = readJson<{ profiles: { chapter: number, name: string, screens: string[] }[] }>('hero/legends.json');
  const catalog = new Set(readJson<{ number: string }[]>('hero/screens.json').map(({ number }) => number));
  assert.deepEqual(profiles.map(({ chapter }) => chapter), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(new Set(profiles.map(({ name }) => name)).size, 9);
  for (const { screens } of profiles) {
    assert.ok(screens.length >= 3 && screens.length <= 5);
    assert.ok(screens.every((number) => catalog.has(number)));
  }
});

test('Connected broker trend covers five sourced annual periods per company', () => {
  const rows = readJson<{ id: string; year: number; netIncome: number; operatingIncome: number; sourceUrl: string }[]>('brokers/metrics.json');
  for (const id of ['kiwoom', 'mirae-asset', 'nh-investment', 'samsung', 'meritz', 'kb', 'hana', 'daishin', 'shinhan', 'korea-investment']) {
    const records = rows.filter((row) => row.id === id);
    assert.deepEqual(records.map(({ year }) => year).sort(), [2021, 2022, 2023, 2024, 2025]);
    assert.ok(records.every(({ sourceUrl }) => new URL(sourceUrl).protocol === 'https:'));
    assert.ok(records.every(({ netIncome, operatingIncome }) => Number.isFinite(netIncome) && Number.isFinite(operatingIncome)));
  }
});

test('Broker profits compare ten companies over the same 2026 reporting period', () => {
  type Profit = { id: string; netIncome: number; operatingIncome: number; sourceUrl: string };
  const { start, end, companies } = readJson<{ start: string; end: string; companies: Profit[] }>('brokers/profit-2026-q3.json');
  const cohort = readJson<{ companies: { id: string }[] }>('brokers/industry-2025.json');
  assert.equal(start, '2026-01-01');
  assert.equal(end, '2026-09-30');
  assert.deepEqual(companies.map(({ id }) => id).sort(), cohort.companies.map(({ id }) => id).sort());
  assert.ok(companies.every(({ netIncome, operatingIncome, sourceUrl }) =>
    Number.isFinite(netIncome) && Number.isFinite(operatingIncome) && new URL(sourceUrl).protocol === 'https:'));
  assert.equal([...companies].sort((a, b) => b.netIncome - a.netIncome)[0].id, 'mirae-asset');
  assert.equal([...companies].sort((a, b) => b.operatingIncome - a.operatingIncome)[0].id, 'mirae-asset');
  assert.equal(companies.find(({ id }) => id === 'kb')?.netIncome, 741866);
  assert.equal(companies.find(({ id }) => id === 'shinhan')?.operatingIncome, 831735);
  const prior = readJson<{ start: string; end: string; companies: Profit[] }>('brokers/profit-2025-q3.json');
  assert.equal(prior.start, '2025-01-01');
  assert.equal(prior.end, '2025-09-30');
  assert.deepEqual(prior.companies.map(({ id }) => id).sort(), companies.map(({ id }) => id).sort());
  assert.equal(prior.companies.find(({ id }) => id === 'shinhan')?.operatingIncome, 462624);
  assert.ok(prior.companies.every(({ netIncome, operatingIncome, sourceUrl }) =>
    netIncome > 0 && operatingIncome > 0 && new URL(sourceUrl).protocol === 'https:'));
});

test('Industry snapshot distinguishes 2026 reporting periods and preserves source ranks', () => {
  for (const [period, date] of [['q1', '2026-03-31'], ['h1', '2026-06-30']]) {
    const data = readJson<{ date: string; basis: string; companies: { id: string; equity: number; assets: number; liabilities: number }[] }>(`brokers/industry-2026-${period}.json`);
    assert.equal(data.date, date);
    assert.equal(data.basis, '별도 재무제표');
    assert.equal(new Set(data.companies.map(({ id }) => id)).size, 10);
    assert.ok(data.companies.every(({ assets, liabilities, equity }) => Math.abs(assets - liabilities - equity) <= 1));
    assert.equal([...data.companies].sort((a, b) => b.equity - a.equity)[6].id, 'kiwoom');
  }
});

test('Historical companies retain their comparison scope and supplemental disclosures', () => {
  type HistoricalCompany = { id: string; assets: number; liabilities: number; equity: number; sourceUrl?: string };
  for (const year of [2020, 2021, 2022, 2023, 2024]) {
    const data = readJson<{ date: string; basis: string; scope: string; sourceUrl?: string; companies: HistoricalCompany[] }>(`brokers/industry-${year}.json`);
    assert.equal(data.date, `${year}-12-31`);
    assert.equal(data.basis, '별도 재무제표');
    assert.equal(data.scope, year === 2022 || year === 2023 ? '자본총계 상위 10개사' : '수록 10개사 자본총계 순위');
    assert.equal(new Set(data.companies.map(({ id }) => id)).size, 10);
    assert.ok(data.companies.every(({ assets, liabilities, equity }) => Math.abs(assets - liabilities - equity) <= (year === 2020 ? 5 : 1)));
    for (const company of data.companies) {
      const source = company.sourceUrl ?? data.sourceUrl;
      assert.ok(source);
      assert.equal(new URL(source).protocol, 'https:');
    }
    const ranked = [...data.companies].sort((a, b) => b.equity - a.equity);
    assert.equal(ranked[8].id, 'kiwoom');
    assert.notEqual(ranked[8].sourceUrl, data.sourceUrl);
  }
});

test('Early consolidated comparison inputs cover every 2021 company', () => {
  type Report = { id: string; assets: number; equity: number; operatingIncome: number; netIncome: number; sourceUrl: string };
  const annual = readJson<{ id: string; year: number }[]>('brokers/metrics.json');
  const expected = annual.filter(({ year }) => year === 2021).map(({ id }) => id).sort();
  for (const path of ['brokers/annual-2019.json', 'brokers/opening-2020.json']) {
    const rows = readJson<Report[]>(path);
    assert.deepEqual(rows.map(({ id }) => id).sort(), expected);
    for (const { assets, equity, operatingIncome, netIncome, sourceUrl } of rows) {
      assert.ok(assets > equity && equity > 0 && operatingIncome > 0 && netIncome > 0);
      assert.equal(new URL(sourceUrl).protocol, 'https:');
    }
  }
});

test('2026 third-quarter separate figures cover the ten-company cohort with verified filings', () => {
  const data = readJson<{ date: string; basis: string; scope: string; companies: { id: string; assets: number; liabilities: number; equity: number; sourceUrl: string }[] }>('brokers/industry-2026-q3.json');
  assert.equal(data.date, '2026-09-30');
  assert.equal(data.basis, '별도 재무제표');
  const cohort = readJson<{ companies: { id: string }[] }>('brokers/industry-2025-q3.json');
  assert.deepEqual(data.companies.map(({ id }) => id).sort(), cohort.companies.map(({ id }) => id).sort());
  assert.match(data.scope, /수록 10개사/);
  assert.equal(data.companies[0].id, 'korea-investment');
  assert.equal(data.companies[3].id, 'kb');
  assert.equal(data.companies[6].id, 'kiwoom');
  assert.ok(data.companies.every(({ assets, liabilities, equity, sourceUrl }) => Math.abs(assets - liabilities - equity) <= 1 && new URL(sourceUrl).hostname === 'dart.fss.or.kr'));
});

test('Published QQQ price rankings show covered and excluded constituents', () => {
  type Equity = { symbol: string; returnPct: number; firstDate: string; lastDate: string };
  type Coverage = { membership: string; eligibleCount: number; universeCount: number; excludedSymbols: string[] };
  const monthly = readJson<Record<string, { US?: Coverage & { items: Equity[] } }>>('market/months/equity-rankings.json');
  for (const [month, { US }] of Object.entries(monthly)) {
    if (!US) continue;
    assert.equal(US.membership, 'approximate');
    assert.equal(US.eligibleCount + US.excludedSymbols.length, US.universeCount);
    assert.equal(US.items.length, 10);
    assert.equal(new Set(US.items.map(({ symbol }) => symbol)).size, 10);
    assert.ok(US.items.every(({ symbol, firstDate, lastDate }) =>
      !US.excludedSymbols.includes(symbol) && firstDate.startsWith(month) && lastDate.startsWith(month) && firstDate < lastDate));
    assert.deepEqual(US.items.map(({ returnPct }) => returnPct), US.items.map(({ returnPct }) => returnPct).sort((a, b) => b - a));
  }
  assert.equal(monthly['2017-10'].US?.eligibleCount, 98);
  for (const year of [2015, 2016, 2017]) {
    assert.ok(Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`).every((period) => monthly[period]?.US));
  }
  assert.equal(monthly['2015-10'].US?.universeCount, 109);
  assert.ok(monthly['2016-04'].US?.excludedSymbols.includes('LMCA'));
  const annual = readJson<Record<string, { US: Coverage & { winner: Equity; loser: Equity; tenbaggers: Equity[] } }>>('market/annual-equity-rankings.json');
  const { eligibleCount, universeCount, excludedSymbols, winner, loser, tenbaggers } = annual['2017'].US;
  assert.equal(annual['2015'].US.eligibleCount, 93);
  assert.equal(annual['2015'].US.winner.symbol, 'NFLX');
  assert.equal(annual['2015'].US.loser.symbol, 'MU');
  assert.equal(annual['2016'].US.winner.symbol, 'NVDA');
  assert.equal(annual['2016'].US.loser.symbol, 'ENDP');
  assert.equal(universeCount, 107);
  assert.equal(eligibleCount + excludedSymbols.length, universeCount);
  assert.equal(winner.firstDate, '2017-01-03');
  assert.equal(loser.lastDate, '2017-12-29');
  assert.ok(winner.returnPct > loser.returnPct && tenbaggers.every(({ returnPct }) => returnPct >= 900));
});

test('SPY rankings retain period coverage and account for ticker changes and exclusions', () => {
  type Equity = { symbol: string; returnPct: number; firstDate: string; lastDate: string };
  type Coverage = { eligibleCount: number; universeCount: number; excludedSymbols: string[] };
  const monthly = readJson<Record<string, { US: Coverage & { items: Equity[] } }>>('market/months/spy-equity-rankings.json');
  const periods = Array.from({ length: 17 }, (_, offset) => new Date(Date.UTC(2016, 9 + offset)).toISOString().slice(0, 7));
  assert.deepEqual(Object.keys(monthly).sort(), periods);
  for (const [month, { US }] of Object.entries(monthly)) {
    assert.equal(US.eligibleCount + US.excludedSymbols.length, US.universeCount);
    assert.equal(new Set(US.items.map(({ symbol }) => symbol)).size, 10);
    assert.ok(US.items.every(({ symbol, firstDate, lastDate }) => !US.excludedSymbols.includes(symbol)
      && firstDate.startsWith(month) && lastDate.startsWith(month) && firstDate < lastDate));
    const returns = US.items.map(({ returnPct }) => returnPct);
    assert.deepEqual(returns, [...returns].sort((a, b) => b - a));
  }
  assert.equal(monthly['2017-10'].US.eligibleCount, 505);
  assert.ok(monthly['2017-12'].US.excludedSymbols.includes('DLPH'));
  const { US } = readJson<Record<string, { US: Coverage & { winner: Equity; loser: Equity } }>>('market/annual-spy-equity-rankings.json')['2017'];
  assert.equal(US.universeCount, 506);
  assert.equal(US.eligibleCount, 459);
  assert.equal(US.eligibleCount + US.excludedSymbols.length, US.universeCount);
  assert.equal(US.winner.symbol, 'NRG');
  assert.equal(US.loser.symbol, 'MNK');
});

test('VOC context references valid topics and has sources for all five years', () => {
  type Item = { date: string; sourceUrl: string; topics: string[] };
  const { events, relatedSignals } = readJson<{ events: Item[]; relatedSignals: Record<string, string[]> }>('voc/context.json');
  const signals = readJson<{ id: string; date: string; sourceUrl: string }[]>('ceo/signals.json');
  const topics = new Set(readJson<{ id: string }[]>('voc/topics.json').map(({ id }) => id));
  const imported = Object.entries(relatedSignals).map(([id, tags]) => {
    const signal = signals.find((entry) => entry.id === id);
    assert.ok(signal, id);
    return { ...signal, topics: tags };
  });
  const items = [...events, ...imported];
  assert.ok(items.every(({ topics: tags, sourceUrl }) => tags.length && tags.every((tag) => topics.has(tag))
    && new URL(sourceUrl).protocol === 'https:'));
  for (const year of [2022, 2023, 2024, 2025, 2026]) {
    assert.ok(items.filter(({ date }) => date.startsWith(String(year))).length >= 5);
  }
});

test('Korean monthly research reconciles eligibility and points to dated fund holdings', () => {
  type Coverage = { provider: string; first: string; last: string; universe: number; eligible: number; excluded: Record<string, number>; holdingsSources: string[] };
  const periods = readJson<Record<string, Coverage>>('market/months/kr-equity-coverage.json');
  const korea = readJson<{monthly: Record<string, {firstDate: string; lastDate: string}>}>('market/korea-index-closes.json');
  assert.equal(periods['2024-11'].universe, 355);
  assert.equal(periods['2024-11'].eligible, 323);
  assert.equal(periods['2024-11'].excluded['첫날·마지막 날 거래량 미확인 또는 0'], 5);
  assert.equal(Object.keys(periods).filter((period) => period.startsWith('2024-')).length, 12);
  for (const [period, data] of Object.entries(periods)) {
    assert.equal(data.first, korea.monthly[period].firstDate);
    assert.equal(data.last, korea.monthly[period].lastDate);
    assert.equal(data.eligible + Object.values(data.excluded).reduce((a,b) => a + b, 0), data.universe);
    assert.equal(new Set(data.holdingsSources).size, 2);
    const tiger = data.provider === 'TIGER';
    const sources = data.holdingsSources.map((value) => new URL(value));
    assert.ok(sources.every((url) => url.searchParams.get(tiger ? 'fixDate' : 'gijunYMD') === data.first.replaceAll('-', '.')));
    if (tiger) assert.deepEqual(sources.map((url) => url.searchParams.get('ksdFund')), ['KR7102110004', 'KR7232080002']);
  }
});

test('The 2008 price archive keeps issuers distinct when a ticker was reused', () => {
  type Member = { symbol: string; archiveSymbol?: string };
  const { members } = readJson<{ members: Member[] }>('market/qqq-holdings-2008-09.json');
  const archived = new Map(members.map((member) => [member.symbol, member.archiveSymbol ?? member.symbol]));
  assert.equal(archived.size, 100);
  assert.equal(new Set(archived.values()).size, 100);
  assert.equal(archived.get('HANS'), 'MNST');
  assert.equal(archived.get('MNST'), 'MWW');
  const monthly = readJson<Record<string, { US: { eligibleCount: number; archiveTickers: Member[] } }>>('market/months/equity-rankings.json');
  for (const period of ['2008-10', '2008-11', '2008-12']) {
    const ranking = monthly[period].US;
    assert.equal(ranking.eligibleCount, 84);
    assert.ok(ranking.archiveTickers.every(({ symbol, archiveSymbol }) => archived.get(symbol) === archiveSymbol));
  }
});

test('The 2021 equity review reconciles the 58 insured securities firms', () => {
  const review = readJson<{ records: number; belowThreshold: {count: number; maxAssets: number};
    companies: {name: string; assets: number; equity: number; sourceUrl: string}[];
    pending: {assets: number}[] }>('brokers/2021-equity-review.json');
  const { companies } = readJson<{ companies: {id: string; equity: number}[] }>('brokers/industry-2021.json');
  const threshold = (id: string) => companies.find((row) => row.id === id)!.equity / 100;
  assert.equal(review.records, companies.length + 1 + review.belowThreshold.count + review.companies.length + review.pending.length);
  assert.ok(review.belowThreshold.maxAssets < threshold('daishin'));
  assert.ok(review.companies.every(({ assets, equity, sourceUrl }) =>
    assets > threshold('daishin') && equity < threshold('daishin') && new URL(sourceUrl).hostname === 'kisrating.com'));
  assert.ok(review.pending.every(({ assets }) => assets < threshold('kiwoom') && assets >= threshold('daishin')));
});
