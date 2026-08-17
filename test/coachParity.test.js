import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { median, exTop2Avg, top2Concentration, MIN_REPS } from '../src/stats.js';
import { CONCEPTS } from './fixtures/concepts.js';

/**
 * coach.html is a single self-contained file on purpose: it is an offline-first
 * PWA that has to open on a sideline with no connection, so it cannot import
 * src/stats.js at runtime. The shape math is therefore ported into its inline
 * script — and a port that nobody checks is a port that drifts.
 *
 * This test pulls those functions back out of coach.html, runs them next to the
 * module they were copied from, and fails if the two ever disagree. Change one,
 * change both.
 *
 * Only valid numeric samples are compared: src/stats.js validates its input and
 * throws on garbage, while the coach.html copy is fed pre-cleaned arrays by
 * dbSampleYards. That difference is deliberate, so it is not part of parity.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'coach.html'), 'utf8');

/** Lift the ported block out of the inline script and evaluate it. */
function loadPortedStats() {
  const start = html.indexOf('const DB_MIN_REPS');
  const end = html.indexOf('function dbSuccessStats(');
  assert.ok(start > -1, 'coach.html should define DB_MIN_REPS');
  assert.ok(end > start, 'coach.html should define dbSuccessStats after the shape math');

  const source = html.slice(start, end);
  for (const name of ['dbMedian', 'dbExTop2Avg', 'dbTop2Concentration']) {
    assert.ok(source.includes(`function ${name}(`), `coach.html should define ${name}`);
  }

  // eslint-disable-next-line no-new-func
  return new Function(`${source}
    return { DB_MIN_REPS, dbMedian, dbExTop2Avg, dbTop2Concentration };`)();
}

const ported = loadPortedStats();

/** Samples that exercise every branch on both sides. */
const SAMPLES = [
  [],
  [5],
  [5, 9],
  [9, 8, 7, 6, 5, 4, 3, 2, 1],                       // MIN_REPS - 1
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 10],                   // exactly MIN_REPS
  [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],          // perfectly even
  [75, 65, 2, 2, 1, 1, 1, 1, 1, 1],                  // two explosives
  [30, 30, 6, 6, 6, 6, 6, 6, 6, 6],                  // tied longest
  [5, -5, 3, -3, 4, -4, 2, -2, 1, -1],               // total exactly zero
  [-1, -2, -3, -1, -1, -1, -1, -1, -1, -1],          // all losses
  [40, 40, -10, -10, -10, -10, 1, 1, 1, 1],          // concentration over 100
  [1, 2, 3, 4],                                       // even count, below gate
  [2.5, 3.5, -1.5, 0, 7.25, 4, 6, 1, 9, 12],         // fractional yardage
  ...CONCEPTS.map((c) => c.plays),
];

test('the rep gate matches', () => {
  assert.equal(ported.DB_MIN_REPS, MIN_REPS);
});

test('dbMedian matches median on every sample', () => {
  for (const sample of SAMPLES) {
    assert.deepEqual(
      ported.dbMedian(sample),
      median(sample),
      `median disagreed on [${sample}]`,
    );
  }
});

test('dbExTop2Avg matches exTop2Avg on every sample', () => {
  for (const sample of SAMPLES) {
    const a = ported.dbExTop2Avg(sample);
    const b = exTop2Avg(sample);
    if (a === null || b === null) {
      assert.equal(a, b, `exTop2Avg gate disagreed on [${sample}]`);
      continue;
    }
    assert.ok(Math.abs(a - b) < 1e-9, `exTop2Avg disagreed on [${sample}]: ${a} vs ${b}`);
  }
});

test('dbTop2Concentration matches top2Concentration on every sample', () => {
  for (const sample of SAMPLES) {
    const a = ported.dbTop2Concentration(sample);
    const b = top2Concentration(sample);
    if (a === null || b === null) {
      assert.equal(a, b, `concentration gate disagreed on [${sample}]`);
      continue;
    }
    for (const key of ['top2', 'total', 'concentration', 'baseline', 'multiple']) {
      if (a[key] === null || b[key] === null) {
        assert.equal(a[key], b[key], `${key} null-ness disagreed on [${sample}]`);
        continue;
      }
      assert.ok(
        Math.abs(a[key] - b[key]) < 1e-9,
        `${key} disagreed on [${sample}]: ${a[key]} vs ${b[key]}`,
      );
    }
  }
});

test('the ported copy does not mutate the caller array', () => {
  const plays = [4, 44, 14, 9, 9, 9, 9, 9, 9, 9];
  const copy = [...plays];
  ported.dbMedian(plays);
  ported.dbExTop2Avg(plays);
  ported.dbTop2Concentration(plays);
  assert.deepEqual(plays, copy, 'sorting must not reorder the row array it was built from');
});
