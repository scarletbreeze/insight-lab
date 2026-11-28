import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const dataDir = new URL('../data/', import.meta.url);
function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(new URL(path, dataDir), 'utf8')) as T;
}
const isHttps = (url: string) => new URL(url).protocol === 'https:';

test('Recorded Nasdaq-100 changes through 2026 are dated, sourced and consistent', () => {
  type Change = { date: string; sourceUrl: string; sourceType?: string; note?: string; remove: string[];
    add: Record<string, string | { name: string; archiveSymbol?: string; archiveSymbolSource?: string }> };
  const changes = readJson<Change[]>('market/qqq-index-changes.json');
  assert.deepEqual(changes.map(({ date }) => date), [...changes.map(({ date }) => date)].sort());
  for (const { date, sourceUrl, sourceType, note, remove, add } of changes) {
    assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(isHttps(sourceUrl));
    assert.ok(remove.length + Object.keys(add).length > 0);
    assert.equal(new Set(remove).size, remove.length);
    assert.ok(remove.every((symbol) => !(symbol in add)));
    // A secondary (news) source is allowed only when flagged and explained.
    if (sourceType !== undefined) assert.ok(['secondary', 'inferred'].includes(sourceType) && (note ?? '').length > 0, date);
    assert.ok(!/ir\.nasdaq\.com/.test(sourceUrl) || date < '2020-01-01', `${date} should cite a fetchable copy of the announcement`);
  }
  const byDate = (date: string) => changes.filter((change) => change.date === date);
  assert.deepEqual(byDate('2018-12-24')[0].remove, ['ESRX', 'HOLX', 'QRTEA', 'SHPG', 'STX', 'VOD']);
  assert.deepEqual(Object.keys(byDate('2018-12-24')[0].add).sort(), ['AMD', 'LULU', 'NTAP', 'UAL', 'VRSN', 'WLTW']);
  assert.deepEqual(byDate('2019-12-23')[0].remove, ['HAS', 'HSIC', 'JBHT', 'MYL', 'NLOK', 'WYNN']);
  assert.deepEqual(Object.keys(byDate('2019-12-23')[0].add).sort(), ['ANSS', 'CDW', 'CPRT', 'CSGP', 'SGEN', 'SPLK']);
  // Same-share ticker changes are modelled as remove/add pairs, as the 2014 LINTA → QVCA record does.
  assert.ok(byDate('2018-03-12').some(({ remove, add }) => remove.includes('QVCA') && 'QRTEA' in add));
  assert.ok(byDate('2019-11-05').some(({ remove, add }) => remove.includes('SYMC') && 'NLOK' in add));
  assert.ok(byDate('2019-11-05').some(({ remove, add }) => remove.includes('CTRP') && 'TCOM' in add));
  const periodic2018 = changes.filter(({ date }) => date >= '2018-01-01' && date < '2018-12-24');
  assert.deepEqual(periodic2018.flatMap(({ remove }) => remove).sort(), ['CA', 'DISH', 'LILA', 'LILAK', 'LVNTA', 'QVCA', 'XRAY']);
  assert.deepEqual(periodic2018.flatMap(({ add }) => Object.keys(add)).sort(), ['NXPI', 'PEP', 'QRTEA', 'XEL']);
  // 2020–2026 membership comes from Nasdaq index-change announcements (annual reconstitutions, replacements, spin-offs).
  assert.deepEqual(byDate('2020-12-21')[0].remove, ['BMRN', 'CTXS', 'EXPE', 'LBTYA', 'LBTYK', 'TTWO', 'ULTA']);
  assert.deepEqual(Object.keys(byDate('2020-12-21')[0].add).sort(), ['AEP', 'MRVL', 'MTCH', 'OKTA', 'PTON', 'TEAM']);
  assert.deepEqual(byDate('2022-12-19')[0].remove, ['BIDU', 'DOCU', 'MTCH', 'NTES', 'SPLK', 'SWKS', 'VRSN']);
  assert.deepEqual(byDate('2025-12-22')[0].remove, ['BIIB', 'CDW', 'GFS', 'LULU', 'ON', 'TTD']);
  assert.deepEqual(Object.keys(byDate('2025-12-22')[0].add).sort(), ['ALNY', 'FER', 'INSM', 'MPWR', 'STX', 'WDC']);
  assert.ok(byDate('2022-06-09').some(({ remove, add }) => remove.includes('FB') && 'META' in add));
  assert.ok(byDate('2023-06-07').some(({ remove, add }) => remove.includes('FISV') && 'GEHC' in add));
  assert.ok(byDate('2026-10-09').some(({ remove, add }) => remove.includes('WBD') && 'MRNA' in add));
  const sinceStooq = changes.filter(({ date }) => date >= '2020-01-01');
  assert.equal(sinceStooq.length, 40);
  // Every other entry cites an index announcement (or a reprint of it). KHC's exit rests on news of its NYSE transfer;
  // HONA's entry and EA's exit are inferred from a spin-off notice plus the index rule and from an acquisition-completion release.
  assert.deepEqual(sinceStooq.filter(({ sourceType }) => sourceType === 'secondary').map(({ date }) => date), ['2026-09-14']);
  assert.deepEqual(sinceStooq.filter(({ sourceType }) => sourceType === 'inferred').map(({ date }) => date), ['2026-06-29', '2026-08-04']);
  assert.equal(changes.at(-1)?.date, '2026-10-09');
});

test('QQQ complex actions and ticker changes carry HTTPS sources and cover the 2018–2019 events', () => {
  const actions = readJson<{ date: string; symbols: string[]; sourceUrl: string }[]>('market/qqq-complex-actions.json');
  assert.deepEqual(actions.map(({ date }) => date), [...actions.map(({ date }) => date)].sort());
  assert.ok(actions.every(({ symbols, sourceUrl }) => symbols.length > 0 && isHttps(sourceUrl)));
  assert.ok(actions.some(({ date, symbols }) => date === '2018-03-09' && symbols.includes('LVNTA')));
  assert.ok(actions.some(({ date, symbols }) => date === '2019-03-19' && symbols.includes('FOXA') && symbols.includes('FOX')));
  // Spin-offs by 2020–2026 members exclude the parent for the month of the distribution.
  assert.deepEqual(actions.filter(({ date }) => date >= '2020-01-01').map(({ date, symbols }) => `${symbols.join('+')}@${date}`),
    ['EXC@2022-02-02', 'ILMN@2024-06-25', 'HON@2025-10-30', 'CMCSA@2026-01-05', 'HON@2026-06-29']);
  const renames = readJson<{ from: string; to: string; date: string; sourceUrl: string }[]>('market/qqq-ticker-changes.json');
  assert.equal(new Set(renames.map(({ from }) => from)).size, renames.length);
  assert.ok(renames.every(({ from, to, sourceUrl }) => from !== to && isHttps(sourceUrl)));
  assert.deepEqual(renames.map(({ from, to, date }) => `${from}>${to}@${date}`).sort(),
    ['CTRP>TCOM@2019-11-05', 'FB>META@2022-06-09', 'QVCA>QRTEA@2018-03-12', 'SYMC>NLOK@2019-11-05']);
});

test('Every QQQ holdings snapshot is a dated SEC filing with unique tickers', () => {
  type Snapshot = { asOf: string; fund: string; sourceUrl: string; members: { symbol: string; name: string; cusip?: string }[] };
  const files = readdirSync(dataDir.pathname + 'market').filter((name) => /^qqq-holdings-\d{4}-\d{2}\.json$/.test(name)).sort();
  assert.ok(files.length >= 5);
  for (const file of files) {
    const snapshot = readJson<Snapshot>('market/' + file);
    assert.equal(snapshot.asOf.slice(0, 7), file.slice('qqq-holdings-'.length, -'.json'.length));
    assert.equal(new URL(snapshot.sourceUrl).hostname, 'www.sec.gov');
    assert.ok(snapshot.members.length >= 100);
    assert.equal(new Set(snapshot.members.map(({ symbol }) => symbol)).size, snapshot.members.length);
    assert.ok(snapshot.members.every(({ symbol, name }) => /^[A-Z][A-Z0-9.-]*$/.test(symbol) && name.length > 0));
    if (snapshot.asOf >= '2019-09-30') {
      assert.ok(snapshot.members.every(({ cusip }) => cusip && /^[A-Z0-9]{9}$/.test(cusip)));
    }
  }
  if (existsSync(new URL('market/qqq-holdings-2024-12.json', dataDir))) {
    const { members } = readJson<Snapshot>('market/qqq-holdings-2024-12.json');
    assert.ok(members.some(({ symbol }) => symbol === 'NVDA') && members.some(({ symbol }) => symbol === 'AAPL'));
  }
});

test('Stooq-based QQQ months from 2018-03 declare the total-return basis and map renamed tickers to sourced archive symbols', () => {
  type Member = { symbol: string; archiveSymbol?: string; archiveSymbolSource?: string };
  type Added = string | { name: string; archiveSymbol?: string; archiveSymbolSource?: string };
  type Ranking = { eligibleCount: number; universeCount: number; exclusions: Record<string, number>; priceBasis?: string; priceMethod: string;
    priceDisclosure?: string; archiveTickers?: { symbol: string; archiveSymbol: string; sourceUrl: string }[]; items: { sourceUrl: string; firstDate: string }[];
    excludedSymbols?: string[]; knownIncomplete?: string[] };
  const snapshot = readJson<{ asOf: string; members: Member[] }>('market/qqq-holdings-2017-09.json');
  const holdings = snapshot.members;
  const changes = readJson<{ date: string; remove: string[]; add: Record<string, Added> }[]>('market/qqq-index-changes.json');
  // Roll the 2017-09 snapshot forward to a first trading day, as scripts/market/rank_wiki_portfolio.py portfolio_at_start does.
  const membersOn = (firstTradingDay: string) => {
    const members = new Set(holdings.map(({ symbol }) => symbol));
    for (const { date, remove, add } of changes) {
      if (!(snapshot.asOf < date && date <= firstTradingDay)) continue;
      for (const symbol of remove) { assert.ok(members.delete(symbol), `${date} removes absent ${symbol}`); }
      for (const symbol of Object.keys(add)) { assert.ok(!members.has(symbol), `${date} adds duplicate ${symbol}`); members.add(symbol); }
    }
    return members;
  };
  const archived = new Map<string, string>();
  const sources = new Map<string, string>();
  for (const { symbol, archiveSymbol, archiveSymbolSource } of holdings) {
    if (archiveSymbol) { archived.set(symbol, archiveSymbol); sources.set(symbol, archiveSymbolSource ?? ''); }
  }
  for (const { add } of changes) {
    for (const [symbol, added] of Object.entries(add)) {
      if (typeof added !== 'string' && added.archiveSymbol) { archived.set(symbol, added.archiveSymbol); sources.set(symbol, added.archiveSymbolSource ?? ''); }
    }
  }
  assert.deepEqual([...archived.entries()].sort(), [['CTRP', 'TCOM'], ['FB', 'META'], ['NLOK', 'GEN'], ['PCLN', 'BKNG'], ['SYMC', 'GEN'], ['WLTW', 'WTW']]);
  assert.ok([...sources.values()].every(isHttps));
  const monthly = readJson<Record<string, { US?: Ranking }>>('market/months/equity-rankings.json');
  const stooqMonths = Object.keys(monthly).filter((period) => period >= '2018-03' && period <= '2026-10').sort();
  assert.equal(stooqMonths.length, 22 + 82);
  assert.equal(stooqMonths.at(-1), '2026-10');
  assert.equal(monthly['2026-11'], undefined); // the archive ends 2026-11-25: complete months only
  for (const period of stooqMonths) {
    const ranking = monthly[period].US;
    assert.ok(ranking, period);
    assert.equal(ranking.priceBasis, 'total-return', period);
    assert.match(ranking.priceMethod, /배당 재투자/);
    assert.match(ranking.priceDisclosure ?? '', /총수익 기준.*2026년 11월 28일/s, period);
    if (period >= '2020-01') assert.match(ranking.priceDisclosure ?? '', /Nasdaq-100 편입·제외 발표/, period);
    const excluded = Object.values(ranking.exclusions).reduce((sum, count) => sum + count, 0);
    assert.equal(ranking.eligibleCount + excluded, ranking.universeCount, period);
    // 2018–2019 months keep at least 80 priced holdings; 2020–2026 months (more delistings in the current-tickers archive) at least 85.
    assert.ok(ranking.eligibleCount >= (period >= '2020-01' ? 85 : 80) && ranking.eligibleCount * 2 > ranking.universeCount, period);
    assert.ok(ranking.universeCount >= 100 && ranking.universeCount <= 104, period);
    assert.equal(ranking.items.length, 10, period);
    const members = membersOn(ranking.items[0].firstDate);
    assert.equal(ranking.universeCount, members.size, `${period} universe must equal the rolled-forward membership`);
    if (period === '2023-09') assert.ok(!members.has('SPLK'), 'Splunk was outside the index when Cisco announced its acquisition');
    for (const [firstMonth, label] of [['2026-07', 'HONA 편입'], ['2026-09', 'EA 제외'], ['2026-10', 'KHC 제외']]) {
      assert.equal(ranking.priceDisclosure?.includes(label), period >= firstMonth, `${period} ${label}`);
    }
    assert.ok((ranking.knownIncomplete ?? []).every((symbol) => ranking.excludedSymbols?.includes(symbol) && (ranking.priceDisclosure ?? '').includes(`(${symbol})`)), period);
    assert.ok(ranking.items.every(({ sourceUrl }) => isHttps(sourceUrl)), period);
    for (const { symbol, archiveSymbol, sourceUrl } of ranking.archiveTickers ?? []) {
      assert.equal(archived.get(symbol), archiveSymbol, `${period} ${symbol}`);
      assert.equal(sources.get(symbol), sourceUrl, `${period} ${symbol}`);
    }
  }
  // Months in which a takeover target was still a member but is absent from the current-tickers archive are flagged as known-incomplete.
  const flagged = stooqMonths.filter((period) => monthly[period].US?.knownIncomplete?.length).map((period) => `${period}:${monthly[period].US?.knownIncomplete?.join('+')}`);
  assert.deepEqual(flagged, ['2020-10:XLNX', '2020-12:ALXN', '2021-12:CERN', '2022-01:ATVI', '2023-03:SGEN']);
  // Months before 2018-03 keep the dividend-excluded WIKI basis.
  assert.equal(monthly['2018-02'].US?.priceBasis, undefined);
});
