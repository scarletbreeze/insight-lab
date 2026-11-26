import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatEok, formatKrwMillion } from '../src/utils/krw.ts';

test('amounts of one trillion won and above read as 조 and 억', () => {
  assert.equal(formatEok(37_933), '3조 7,933억 원');
  assert.equal(formatEok(10_000), '1조 원');
  assert.equal(formatEok(123_456.7), '12조 3,457억 원');
  assert.equal(formatEok(-12_000), '-1조 2,000억 원');
  assert.equal(formatEok(9_999.6), '1조 원');
});

test('amounts below one trillion won keep 억 with precision that narrows as they grow', () => {
  assert.equal(formatEok(6_378.82), '6,379억 원');
  assert.equal(formatEok(99.44), '99.4억 원');
  assert.equal(formatEok(3.456), '3.46억 원');
  assert.equal(formatEok(0), '0억 원');
  assert.equal(formatEok(-250.4), '-250억 원');
});

test('filing values in 백만원 convert before formatting', () => {
  assert.equal(formatKrwMillion(3_793_300), '3조 7,933억 원');
  assert.equal(formatKrwMillion(637_882), '6,379억 원');
  assert.equal(formatKrwMillion(Number.NaN), '자료 확인 중');
});
