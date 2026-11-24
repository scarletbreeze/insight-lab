import assert from 'node:assert/strict';
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
