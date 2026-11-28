import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const dataDir = new URL('../data/', import.meta.url);
function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(new URL(path, dataDir), 'utf8')) as T;
}
const isHttps = (url: string) => new URL(url).protocol === 'https:';

test('Recorded Nasdaq-100 changes through 2019 are dated, sourced and consistent', () => {
  type Change = { date: string; sourceUrl: string; remove: string[]; add: Record<string, string | { name: string; archiveSymbol?: string; archiveSymbolSource?: string }> };
  const changes = readJson<Change[]>('market/qqq-index-changes.json');
  assert.deepEqual(changes.map(({ date }) => date), [...changes.map(({ date }) => date)].sort());
  for (const { date, sourceUrl, remove, add } of changes) {
    assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(isHttps(sourceUrl));
    assert.ok(remove.length + Object.keys(add).length > 0);
    assert.equal(new Set(remove).size, remove.length);
    assert.ok(remove.every((symbol) => !(symbol in add)));
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
});

test('QQQ complex actions and ticker changes carry HTTPS sources and cover the 2018–2019 events', () => {
  const actions = readJson<{ date: string; symbols: string[]; sourceUrl: string }[]>('market/qqq-complex-actions.json');
  assert.deepEqual(actions.map(({ date }) => date), [...actions.map(({ date }) => date)].sort());
  assert.ok(actions.every(({ symbols, sourceUrl }) => symbols.length > 0 && isHttps(sourceUrl)));
  assert.ok(actions.some(({ date, symbols }) => date === '2018-03-09' && symbols.includes('LVNTA')));
  assert.ok(actions.some(({ date, symbols }) => date === '2019-03-19' && symbols.includes('FOXA') && symbols.includes('FOX')));
  const renames = readJson<{ from: string; to: string; date: string; sourceUrl: string }[]>('market/qqq-ticker-changes.json');
  assert.equal(new Set(renames.map(({ from }) => from)).size, renames.length);
  assert.ok(renames.every(({ from, to, sourceUrl }) => from !== to && isHttps(sourceUrl)));
  assert.deepEqual(renames.map(({ from, to, date }) => `${from}>${to}@${date}`).sort(),
    ['CTRP>TCOM@2019-11-05', 'QVCA>QRTEA@2018-03-12', 'SYMC>NLOK@2019-11-05']);
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
    priceDisclosure?: string; archiveTickers?: { symbol: string; archiveSymbol: string; sourceUrl: string }[]; items: { sourceUrl: string }[] };
  const holdings = readJson<{ members: Member[] }>('market/qqq-holdings-2017-09.json').members;
  const changes = readJson<{ add: Record<string, Added> }[]>('market/qqq-index-changes.json');
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
  const stooqMonths = Object.keys(monthly).filter((period) => period >= '2018-03' && period <= '2019-12').sort();
  assert.equal(stooqMonths.length, 22);
  for (const period of stooqMonths) {
    const ranking = monthly[period].US;
    assert.ok(ranking, period);
    assert.equal(ranking.priceBasis, 'total-return', period);
    assert.match(ranking.priceMethod, /배당 재투자/);
    assert.match(ranking.priceDisclosure ?? '', /총수익 기준.*2026년 11월 28일/s, period);
    const excluded = Object.values(ranking.exclusions).reduce((sum, count) => sum + count, 0);
    assert.equal(ranking.eligibleCount + excluded, ranking.universeCount, period);
    assert.ok(ranking.eligibleCount >= 80 && ranking.eligibleCount * 2 > ranking.universeCount, period);
    assert.ok(ranking.items.every(({ sourceUrl }) => isHttps(sourceUrl)), period);
    for (const { symbol, archiveSymbol, sourceUrl } of ranking.archiveTickers ?? []) {
      assert.equal(archived.get(symbol), archiveSymbol, `${period} ${symbol}`);
      assert.equal(sources.get(symbol), sourceUrl, `${period} ${symbol}`);
    }
  }
  // Months before 2018-03 keep the dividend-excluded WIKI basis.
  assert.equal(monthly['2018-02'].US?.priceBasis, undefined);
});
