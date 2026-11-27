import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const dataDir = new URL('../data/', import.meta.url);
function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(new URL(path, dataDir), 'utf8')) as T;
}
const isHttps = (url: string) => new URL(url).protocol === 'https:';

test('Recorded Nasdaq-100 changes through 2019 are dated, sourced and consistent', () => {
  type Change = { date: string; sourceUrl: string; remove: string[]; add: Record<string, string> };
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
