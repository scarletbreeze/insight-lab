import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { findServices, services } from '../src/utils/services.ts';

test('the catalog has six unique service paths', () => {
  assert.equal(services.length, 6);
  assert.equal(new Set(services.map(({ slug }) => slug)).size, 6);
});

test('blank search returns the full catalog', () => {
  assert.deepEqual(findServices('  '), services);
});

test('search matches title, category and Korean description', () => {
  assert.deepEqual(findServices('HERO  product 영웅문').map(({ slug }) => slug), ['hero-lab']);
  assert.deepEqual(findServices('찾을 수 없는 검색어'), []);
});

test('home updates identify their service and carry a dated local destination', () => {
  const updates = JSON.parse(readFileSync(new URL('../data/updates.json', import.meta.url), 'utf8')) as
    { updatedAt: string; service: string; route: string; title: string }[];
  assert.ok(updates.length >= 6);
  for (const { updatedAt, service, route, title } of updates) {
    assert.match(updatedAt, /T.*(?:Z|[+-]\d{2}:\d{2})$/);
    assert.ok(Number.isFinite(Date.parse(updatedAt)) && title.trim());
    assert.ok(services.some(({ slug }) => slug === service));
    assert.match(route, /^[^/:?#]+(?:\/[^/:?#]+)*$/);
  }
});
