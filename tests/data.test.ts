import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(new URL('../data/' + path, import.meta.url), 'utf8')) as T;
}

test('Hero screen numbers and workflow references resolve to sourced records', () => {
  const screens = readJson<{ number: string, officialHelpUrl?: string, sources: { sourceUrl: string }[] }[]>('hero/screens.json');
  const workflows = readJson<{ steps: { number: string }[] }[]>('hero/recipes.json');
  const numbers = new Set(screens.map(({ number }) => number));
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
  const questions = readJson<{ choices: string[], date: string, answer: number }[]>('market/game.json');
  assert.equal(questions.length, 10);
  for (const { choices, date, answer } of questions) {
    assert.equal(choices.length, 4);
    assert.ok(choices[answer]);
    assert.ok(events.has(date));
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
