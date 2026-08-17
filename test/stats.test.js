import test from 'node:test';
import assert from 'node:assert/strict';

import { median, exTop2Avg, top2Concentration } from '../src/stats.js';

const close = (actual, expected, message) =>
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `${message ?? 'value'}: expected ${expected}, got ${actual}`,
  );

test('median: odd count returns the middle value', () => {
  assert.equal(median([7, 1, 3]), 3);
  assert.equal(median([12, 4, 4, 9, 20]), 9);
});

test('median: even count averages the two middle values', () => {
  assert.equal(median([1, 3, 7, 9]), 5);
  assert.equal(median([2, 4]), 3);
  assert.equal(median([0, 1, 2, 100]), 1.5);
});

test('median: handles unsorted input, negatives, and a single play', () => {
  assert.equal(median([9, -3, 2, 40, 1]), 2);
  assert.equal(median([-8, -2]), -5);
  assert.equal(median([6]), 6);
});

test('median: empty sample returns null', () => {
  assert.equal(median([]), null);
});

test('median: does not mutate the caller array', () => {
  const plays = [10, 2, 30];
  median(plays);
  assert.deepEqual(plays, [10, 2, 30]);
});

test('exTop2Avg: drops the two longest and averages the rest', () => {
  // sorted desc: 50, 20, 10, 6, 4 -> mean of 10, 6, 4
  close(exTop2Avg([10, 50, 4, 20, 6]), 20 / 3, 'exTop2Avg');
  assert.equal(exTop2Avg([100, 100, 5, 5]), 5);
});

test('exTop2Avg: drops two entries even when the longest are tied', () => {
  // both 30s are removed, not just one
  assert.equal(exTop2Avg([30, 30, 3, 9]), 6);
});

test('exTop2Avg: needs more than two plays', () => {
  assert.equal(exTop2Avg([]), null);
  assert.equal(exTop2Avg([12]), null);
  assert.equal(exTop2Avg([12, 8]), null);
  assert.equal(exTop2Avg([12, 8, 1]), 1);
});

test('exTop2Avg: sack yardage pulls the average negative', () => {
  // sorted desc: 8, 3, 0, -4, -7 -> mean of 0, -4, -7
  close(exTop2Avg([3, -7, 8, 0, -4]), -11 / 3, 'exTop2Avg');
});

test('top2Concentration: percent of total, baseline, and multiple', () => {
  // top2 = 60 + 50 = 110 of 200 total, n = 5 -> baseline 40%
  const result = top2Concentration([60, 40, 50, 30, 20]);
  assert.equal(result.top2, 110);
  assert.equal(result.total, 200);
  close(result.concentration, 55, 'concentration');
  close(result.baseline, 40, 'baseline');
  close(result.multiple, 1.375, 'multiple');
});

test('top2Concentration: an even split scores a multiple of 1', () => {
  const result = top2Concentration([10, 10, 10, 10, 10, 10, 10, 10]);
  close(result.concentration, 25, 'concentration');
  close(result.baseline, 25, 'baseline');
  close(result.multiple, 1, 'multiple');
});

test('top2Concentration: two explosives carrying a quiet day', () => {
  // top2 = 75 + 65 = 140 of 150, n = 10 -> baseline 20%
  const result = top2Concentration([75, 65, 2, 2, 1, 1, 1, 1, 1, 1]);
  close(result.concentration, (140 / 150) * 100, 'concentration');
  close(result.baseline, 20, 'baseline');
  close(result.multiple, ((140 / 150) * 100) / 20, 'multiple');
  assert.ok(result.multiple > 4, 'top-heavy sample should be well above 1x');
});

test('top2Concentration: baseline caps at 100 for tiny samples', () => {
  const one = top2Concentration([25]);
  assert.equal(one.top2, 25);
  close(one.concentration, 100, 'concentration');
  close(one.baseline, 100, 'baseline');
  close(one.multiple, 1, 'multiple');

  const two = top2Concentration([25, 15]);
  close(two.concentration, 100, 'concentration');
  close(two.baseline, 100, 'baseline');
  close(two.multiple, 1, 'multiple');
});

test('top2Concentration: non-positive total yields null percentages', () => {
  const zero = top2Concentration([5, -5, 3, -3]);
  assert.equal(zero.total, 0);
  assert.equal(zero.concentration, null);
  assert.equal(zero.multiple, null);
  close(zero.baseline, 50, 'baseline');

  const negative = top2Concentration([-1, -2, -3]);
  assert.equal(negative.total, -6);
  assert.equal(negative.concentration, null);
  assert.equal(negative.multiple, null);
});

test('top2Concentration: empty sample returns null', () => {
  assert.equal(top2Concentration([]), null);
});

test('top2Concentration: does not mutate the caller array', () => {
  const plays = [4, 44, 14];
  top2Concentration(plays);
  assert.deepEqual(plays, [4, 44, 14]);
});

test('all three reject non-array and non-finite input', () => {
  for (const fn of [median, exTop2Avg, top2Concentration]) {
    assert.throws(() => fn(null), TypeError);
    assert.throws(() => fn('12,4'), TypeError);
    assert.throws(() => fn([1, 2, NaN]), TypeError);
    assert.throws(() => fn([1, 2, '3']), TypeError);
    assert.throws(() => fn([1, Infinity]), TypeError);
  }
});
