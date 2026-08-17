import test from 'node:test';
import assert from 'node:assert/strict';

import { median, exTop2Avg, top2Concentration, MIN_REPS } from '../src/stats.js';

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
  // sorted desc: 50, 20, 10, 8, 7, 6, 5, 4, 3, 2
  // drop 50 and 20 -> mean of the remaining 8 (sum 45)
  close(exTop2Avg([10, 50, 4, 20, 6, 8, 7, 5, 3, 2]), 45 / 8, 'exTop2Avg');
});

test('exTop2Avg: drops two entries even when the longest are tied', () => {
  // both 30s are removed, not just one — keeping one would average 8.67
  assert.equal(exTop2Avg([30, 30, 6, 6, 6, 6, 6, 6, 6, 6]), 6);
});

test('exTop2Avg: sack yardage pulls the average negative', () => {
  // sorted desc: 8, 5, 3, 2, 1, 0, -1, -2, -4, -7 -> drop 8 and 5,
  // remaining sum -8 over 8 plays
  close(exTop2Avg([3, -7, 8, 0, -4, 1, 2, -1, 5, -2]), -1, 'exTop2Avg');
});

test('exTop2Avg: rep gate returns null below MIN_REPS', () => {
  const nine = [9, 8, 7, 6, 5, 4, 3, 2, 1];
  assert.equal(nine.length, MIN_REPS - 1);
  assert.equal(exTop2Avg(nine), null);

  assert.equal(exTop2Avg([]), null);
  assert.equal(exTop2Avg([12]), null);
  assert.equal(exTop2Avg([12, 8]), null);
  assert.equal(exTop2Avg([12, 8, 1]), null);

  // one more rep clears the gate
  const ten = [...nine, 10];
  assert.equal(ten.length, MIN_REPS);
  assert.equal(exTop2Avg(ten), 4.5); // drop 10 and 9 -> mean of 8..1 (36 / 8)
});

test('top2Concentration: percent of total, baseline, and multiple', () => {
  // top2 = 60 + 50 = 110 of 200 total, n = 10 -> baseline 20%
  const result = top2Concentration([60, 50, 20, 15, 15, 10, 10, 8, 7, 5]);
  assert.equal(result.top2, 110);
  assert.equal(result.total, 200);
  close(result.concentration, 55, 'concentration');
  close(result.baseline, 20, 'baseline');
  close(result.multiple, 2.75, 'multiple');
});

test('top2Concentration: an even split scores a multiple of 1', () => {
  const result = top2Concentration([10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
  close(result.concentration, 20, 'concentration');
  close(result.baseline, 20, 'baseline');
  close(result.multiple, 1, 'multiple');
});

test('top2Concentration: baseline falls as reps climb', () => {
  const twenty = Array.from({ length: 20 }, () => 5);
  close(top2Concentration(twenty).baseline, 10, 'baseline');
  close(top2Concentration(twenty).multiple, 1, 'multiple');
});

test('top2Concentration: two explosives carrying a quiet day', () => {
  // top2 = 75 + 65 = 140 of 150, n = 10 -> baseline 20%
  const result = top2Concentration([75, 65, 2, 2, 1, 1, 1, 1, 1, 1]);
  close(result.concentration, (140 / 150) * 100, 'concentration');
  close(result.baseline, 20, 'baseline');
  close(result.multiple, ((140 / 150) * 100) / 20, 'multiple');
  assert.ok(result.multiple > 4, 'top-heavy sample should be well above 1x');
});

test('top2Concentration: rep gate returns null below MIN_REPS', () => {
  const nine = [9, 8, 7, 6, 5, 4, 3, 2, 1];
  assert.equal(nine.length, MIN_REPS - 1);
  assert.equal(top2Concentration(nine), null);

  assert.equal(top2Concentration([]), null);
  assert.equal(top2Concentration([25]), null);
  assert.equal(top2Concentration([25, 15]), null);

  // one more rep clears the gate
  const ten = [...nine, 10];
  assert.equal(ten.length, MIN_REPS);
  assert.notEqual(top2Concentration(ten), null);
  assert.equal(top2Concentration(ten).top2, 19);
});

test('top2Concentration: zero total yards yields null percentages', () => {
  // every gain cancelled by a loss — the denominator collapses
  const zero = top2Concentration([5, -5, 3, -3, 4, -4, 2, -2, 1, -1]);
  assert.equal(zero.total, 0);
  assert.equal(zero.concentration, null);
  assert.equal(zero.multiple, null);
  // the countable fields still come back
  assert.equal(zero.top2, 9);
  close(zero.baseline, 20, 'baseline');
});

test('top2Concentration: negative total yards yields null, not a negative percent', () => {
  // a loaded box: nothing but losses
  const negative = top2Concentration([-1, -2, -3, -1, -1, -1, -1, -1, -1, -1]);
  assert.equal(negative.total, -13);
  assert.equal(negative.concentration, null);
  assert.equal(negative.multiple, null);
  assert.equal(negative.top2, -2); // the two "longest" are still the least bad
});

test('top2Concentration: concentration can exceed 100 when losses drag the total', () => {
  // two 40s against four sacks: total 44, top2 80. Denominator is positive,
  // so this is a real reading, not the guard case — the top two really did
  // out-gain everything the offense netted.
  const result = top2Concentration([40, 40, -10, -10, -10, -10, 1, 1, 1, 1]);
  assert.equal(result.total, 44);
  assert.equal(result.top2, 80);
  close(result.concentration, (80 / 44) * 100, 'concentration');
  assert.ok(result.concentration > 100, 'expected concentration above 100');
});

test('top2Concentration: does not mutate the caller array', () => {
  const plays = [4, 44, 14, 9, 9, 9, 9, 9, 9, 9];
  const copy = [...plays];
  top2Concentration(plays);
  assert.deepEqual(plays, copy);
});

test('the multiple is n-dependent — it must not be compared across sample sizes', () => {
  // Characterization test, not a wish. The baseline is an even split of 2/n, but
  // the top two plays of a large sample are always a bigger multiple of that
  // split than the top two of a small one, even when the underlying distribution
  // is identical. So `multiple` compares concepts charted a similar number of
  // times, and nothing else — in particular not a concept against a season
  // aggregate. If this ever stops holding, the presenters that rely on it
  // (coach.html's shape column and its deliberately multiple-free season tile)
  // need to be revisited.
  let seed = 42;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const meanMultiple = (n, trials = 2000) => {
    let total = 0;
    for (let i = 0; i < trials; i += 1) {
      const plays = Array.from({ length: n }, () => Math.round(-8 * Math.log(1 - rng())));
      total += top2Concentration(plays).multiple;
    }
    return total / trials;
  };

  const small = meanMultiple(10);
  const large = meanMultiple(150);
  assert.ok(small < 3, `expected ~2.5x over 10 reps, got ${small}`);
  assert.ok(large > 4.5, `expected ~5x over 150 reps, got ${large}`);
  assert.ok(
    large - small > 1.5,
    `the same distribution should drift by more than 1.5x across n (${small} -> ${large})`,
  );
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
