import test from 'node:test';
import assert from 'node:assert/strict';

import {
  median, exTop2Avg, top2Concentration, topHeaviness,
  MIN_REPS_EX_TOP2, MIN_REPS_SHARE, TOP_HEAVY_YDS,
} from '../src/stats.js';

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

test('exTop2Avg: floor is about having plays left, not about noise', () => {
  const five = [9, 8, 7, 6, 5];
  assert.equal(five.length, MIN_REPS_EX_TOP2 - 1);
  assert.equal(exTop2Avg(five), null);

  assert.equal(exTop2Avg([]), null);
  assert.equal(exTop2Avg([12]), null);
  assert.equal(exTop2Avg([12, 8]), null);

  // six reps clears it — four plays left to average is enough to say something
  const six = [...five, 4];
  assert.equal(six.length, MIN_REPS_EX_TOP2);
  assert.equal(exTop2Avg(six), 5.5); // drop 9 and 8 -> mean of 7,6,5,4
});

test('top2Concentration: percent of total, baseline, and multiple', () => {
  // top2 = 60 + 50 = 110 of 200 total, n = 10 -> baseline 20%
  const result = top2Concentration([60, 50, 20, 15, 15, 10, 10, 8, 7, 5]);
  assert.equal(result.top2, 110);
  assert.equal(result.total, 200);
  close(result.concentration, 55, 'concentration');
});

test('top2Concentration: an even split gives the top two exactly 2/n', () => {
  const result = top2Concentration([10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
  close(result.concentration, 20, 'concentration');
});

test('top2Concentration: two explosives carrying a quiet day', () => {
  // top2 = 75 + 65 = 140 of 150, n = 10 -> baseline 20%
  const result = top2Concentration([75, 65, 2, 2, 1, 1, 1, 1, 1, 1]);
  close(result.concentration, (140 / 150) * 100, 'concentration');
});

test('top2Concentration: share stays gated — below the floor it is arithmetic', () => {
  const nine = [9, 8, 7, 6, 5, 4, 3, 2, 1];
  assert.equal(nine.length, MIN_REPS_SHARE - 1);
  assert.equal(top2Concentration(nine), null);

  assert.equal(top2Concentration([]), null);
  assert.equal(top2Concentration([25]), null);
  assert.equal(top2Concentration([25, 15]), null);

  // one more rep clears the gate
  const ten = [...nine, 10];
  assert.equal(ten.length, MIN_REPS_SHARE);
  assert.notEqual(top2Concentration(ten), null);
  assert.equal(top2Concentration(ten).top2, 19);
});

test('top2Concentration: zero total yards yields null percentages', () => {
  // every gain cancelled by a loss — the denominator collapses
  const zero = top2Concentration([5, -5, 3, -3, 4, -4, 2, -2, 1, -1]);
  assert.equal(zero.total, 0);
  assert.equal(zero.concentration, null);
  // the countable fields still come back
  assert.equal(zero.top2, 9);
});

test('top2Concentration: negative total yards yields null, not a negative percent', () => {
  // a loaded box: nothing but losses
  const negative = top2Concentration([-1, -2, -3, -1, -1, -1, -1, -1, -1, -1]);
  assert.equal(negative.total, -13);
  assert.equal(negative.concentration, null);
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

test('topHeaviness holds its meaning across sample sizes', () => {
  // This is why it replaced the top-two multiple. The multiple's centre drifted
  // from 3.7x at 10 reps to 7.9x at 60 for one fixed distribution, so a single
  // threshold could not mean the same thing at both ends. Mean and median are
  // stable estimators, so their gap converges instead of drifting.
  let seed = 42;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const ordinary = () => {
    const u = rng();
    return u < 0.12 ? Math.round(12 + 25 * rng()) : Math.round(-2 + 7 * rng());
  };
  const boom = () => (rng() < 0.15 ? Math.round(30 + 25 * rng()) : 0);
  const meanGap = (n, draw, trials = 2000) => {
    let total = 0;
    for (let i = 0; i < trials; i += 1) {
      total += topHeaviness(Array.from({ length: n }, draw));
    }
    return total / trials;
  };

  for (const n of [6, 20, 60]) {
    const ord = meanGap(n, ordinary);
    const bm = meanGap(n, boom);
    assert.ok(ord > 1.5 && ord < 3.5, `n=${n}: ordinary should sit near 2.3, got ${ord}`);
    assert.ok(bm > 5 && bm < 8, `n=${n}: boom should sit near 6.6, got ${bm}`);
    assert.ok(bm / ord > 2, `n=${n}: the two should stay well separated, got ${bm / ord}`);
  }
});

test('TOP_HEAVY_YDS separates the fixture archetypes', () => {
  assert.ok(topHeaviness([4, 2, 6, 3, 5, -1, 8, 4, 3, 12]) < TOP_HEAVY_YDS, 'a grinder must not trip the flag');
  assert.ok(topHeaviness([0, 0, 45, 0, 12, 0, 38, 0, 0, 9, 0, 0, 16, 0]) >= TOP_HEAVY_YDS, 'verts must trip it');
});

test('topHeaviness: empty sample returns null, negatives read below zero', () => {
  assert.equal(topHeaviness([]), null);
  // median above mean: a few bad plays dragging the average down
  assert.ok(topHeaviness([5, 5, 5, 5, -30]) < 0);
});

test('all four reject non-array and non-finite input', () => {
  for (const fn of [median, exTop2Avg, top2Concentration, topHeaviness]) {
    assert.throws(() => fn(null), TypeError);
    assert.throws(() => fn('12,4'), TypeError);
    assert.throws(() => fn([1, 2, NaN]), TypeError);
    assert.throws(() => fn([1, 2, '3']), TypeError);
    assert.throws(() => fn([1, Infinity]), TypeError);
  }
});
