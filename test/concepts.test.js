import test from 'node:test';
import assert from 'node:assert/strict';

import { median, exTop2Avg, top2Concentration, topHeaviness, TOP_HEAVY_YDS } from '../src/stats.js';
import { CONCEPTS, byName, mean } from './fixtures/concepts.js';

/**
 * These tests encode coaching feel, not arithmetic. Each one says "a concept
 * that behaves like X must read like Y." If a fixture is swapped for real
 * charting and one of these fails, the disagreement between the data and the
 * feel is the finding — look at it before changing the assertion.
 */

const conc = (name) => top2Concentration(byName(name).plays);
const grinders = CONCEPTS.filter((c) => c.kind === 'grinder');
const explosives = CONCEPTS.filter((c) => c.kind === 'explosive');

test('grinders: median, mean, and ex-top-2 all agree', () => {
  for (const concept of grinders) {
    const m = median(concept.plays);
    const ex = exTop2Avg(concept.plays);
    const avg = mean(concept.plays);

    assert.ok(
      Math.abs(m - ex) < 1.5,
      `${concept.name}: median ${m} and exTop2Avg ${ex} should sit close`,
    );
    assert.ok(
      Math.abs(avg - m) < 1.5,
      `${concept.name}: mean ${avg} should not run away from median ${m}`,
    );
  }
});

test('explosives: mean flatters, median tells the truth', () => {
  for (const concept of explosives) {
    const m = median(concept.plays);
    const avg = mean(concept.plays);

    assert.equal(m, 0, `${concept.name}: a boom-or-nothing concept medians at 0`);
    assert.ok(
      avg - m > 8,
      `${concept.name}: mean ${avg} should badly overstate median ${m}`,
    );
  }
});

test('explosives: stripping the top two guts the concept', () => {
  for (const concept of explosives) {
    const ex = exTop2Avg(concept.plays);
    const avg = mean(concept.plays);

    assert.ok(
      avg - ex > 5,
      `${concept.name}: mean ${avg} should collapse to ${ex} without the top two`,
    );
  }
});

test('the headline finding: a 4-yard grinder beats an 8-yard explosive on ex-top-2', () => {
  // FOUR VERTS means nearly double INSIDE ZONE (8.6 vs 4.2). Strip each
  // concept's two longest plays and the ranking flips. This is the entire
  // reason exTop2Avg exists — if it ever stops flipping, the metric is broken.
  const zone = byName('INSIDE ZONE').plays;
  const verts = byName('FOUR VERTS').plays;

  assert.ok(mean(verts) > mean(zone) * 1.9, 'setup: verts should out-mean zone');
  assert.ok(
    exTop2Avg(zone) > exTop2Avg(verts),
    `exTop2Avg should rank zone (${exTop2Avg(zone)}) above verts (${exTop2Avg(verts)})`,
  );
});

test('top-heaviness separates explosives from grinders with no overlap', () => {
  const worstExplosive = Math.min(...explosives.map((c) => topHeaviness(c.plays)));
  const bestGrinder = Math.max(...grinders.map((c) => topHeaviness(c.plays)));

  assert.ok(worstExplosive >= TOP_HEAVY_YDS, `explosives should trip the flag, worst was ${worstExplosive}`);
  assert.ok(bestGrinder < TOP_HEAVY_YDS, `grinders should not trip it, best was ${bestGrinder}`);
  assert.ok(worstExplosive > bestGrinder, 'the two groups must not overlap');
});

test('GIANTS reads like GIANTS: top of the sheet on concentration', () => {
  const giants = conc('GIANTS');
  const others = CONCEPTS.filter((c) => c.name !== 'GIANTS')
    .map((c) => conc(c.name))
    .filter((r) => r !== null && r.concentration !== null);

  assert.ok(giants.concentration > 80, `expected >80%, got ${giants.concentration}`);
  for (const other of others) {
    assert.ok(
      giants.concentration > other.concentration,
      'GIANTS should carry the highest top-two share on the sheet',
    );
  }

  // and the corollary: without those two plays there is nothing there
  assert.ok(exTop2Avg(byName('GIANTS').plays) < 2, 'ex-top-2 should be near nothing');
});

test('a negative-total concept refuses to print percentages', () => {
  const draw = conc('QB DRAW vs LOADED BOX');
  assert.ok(draw.total < 0, 'setup: total should be negative');
  assert.equal(draw.concentration, null);

  // the honest numbers still come through
  assert.equal(median(byName('QB DRAW vs LOADED BOX').plays), 0);
  assert.ok(exTop2Avg(byName('QB DRAW vs LOADED BOX').plays) < 0);
});

test('a thin sample still answers where it honestly can', () => {
  const sweep = byName('SPEED SWEEP');
  assert.equal(sweep.plays.length, 6);
  // the share stays gated — two of six plays is most of the sample by construction
  assert.equal(top2Concentration(sweep.plays), null);
  // but ex-top-2 and the median hold up at six reps, and used to be thrown away
  assert.equal(median(sweep.plays), 4.5);
  assert.equal(exTop2Avg(sweep.plays), 3.5);
  assert.ok(topHeaviness(sweep.plays) < TOP_HEAVY_YDS, 'a thin sweep is not boom-or-bust');
});

test('no concept produces a NaN or Infinity anywhere on the sheet', () => {
  const finiteOrNull = (value, label) =>
    assert.ok(
      value === null || Number.isFinite(value),
      `${label} produced ${value}`,
    );

  for (const concept of CONCEPTS) {
    finiteOrNull(median(concept.plays), `${concept.name} median`);
    finiteOrNull(exTop2Avg(concept.plays), `${concept.name} exTop2Avg`);
    finiteOrNull(topHeaviness(concept.plays), `${concept.name} topHeaviness`);

    const result = top2Concentration(concept.plays);
    if (result === null) continue;
    finiteOrNull(result.concentration, `${concept.name} concentration`);
  }
});
