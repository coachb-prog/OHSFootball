import test from 'node:test';
import assert from 'node:assert/strict';

import { selfScoutRow, selfScoutRows, DASH, GateReason } from '../src/presenters/selfScout.js';
import { MIN_REPS_EX_TOP2, MIN_REPS_SHARE } from '../src/stats.js';
import { CONCEPTS, byName } from './fixtures/concepts.js';

const row = (name) => selfScoutRow(byName(name));

test('a healthy concept fills all three columns', () => {
  const zone = row('INSIDE ZONE');
  assert.equal(zone.concept, 'INSIDE ZONE');
  assert.equal(zone.reps, 18);
  assert.equal(zone.median.text, '4.0');
  assert.equal(zone.exTop2.text, '3.5');
  assert.equal(zone.concentration.text, '26%');
  assert.equal(zone.topHeavy.text, '+0.2');

  for (const cell of [zone.median, zone.exTop2, zone.concentration, zone.topHeavy]) {
    assert.equal(cell.gated, false);
  }
});

test('the share is a plain percent — the comparable number is the mean-median gap', () => {
  assert.equal(row('GIANTS').concentration.text, '84%');
  assert.equal(row('FOUR VERTS').concentration.text, '69%');
  assert.equal(row('BUBBLE SCREEN').concentration.text, '30%');

  for (const concept of CONCEPTS) {
    const cell = selfScoutRow(concept).concentration;
    if (cell.gated) continue;
    assert.match(cell.text, /^-?\d+%$/, `bad format: ${cell.text}`);
  }
});

test('the top-heavy flag fires on boom-or-bust concepts and nothing else', () => {
  const flagged = CONCEPTS.filter((c) => selfScoutRow(c).topHeavy.topHeavy).map((c) => c.name);
  assert.deepEqual(flagged, ['FOUR VERTS', 'GIANTS'],
    'exactly the two explosive archetypes should trip it');
});

test('a negative gap prints its sign instead of a stray plus', () => {
  assert.equal(row('QB DRAW vs LOADED BOX').topHeavy.text, '-1.0');
});

test('a six-rep concept answers everything except the share', () => {
  const sweep = row('SPEED SWEEP');
  assert.equal(sweep.reps, MIN_REPS_EX_TOP2);

  // median, ex-top-2 and the gap all hold at six reps — the old gate of 10 threw
  // away two of these for no reliability gain
  assert.equal(sweep.median.text, '4.5');
  assert.equal(sweep.exTop2.text, '3.5');
  assert.equal(sweep.topHeavy.text, '+2.8');
  for (const cell of [sweep.median, sweep.exTop2, sweep.topHeavy]) {
    assert.equal(cell.gated, false);
  }

  // the share stays gated: two of six plays is most of the sample by construction
  assert.equal(sweep.concentration.text, DASH);
  assert.equal(sweep.concentration.gated, true);
  assert.equal(sweep.concentration.reason, GateReason.REPS);
  assert.equal(sweep.concentration.note, `6 / ${MIN_REPS_SHARE} reps`);
});

test('a gated cell never reads as a zero', () => {
  for (const concept of CONCEPTS) {
    const r = selfScoutRow(concept);
    for (const cell of [r.median, r.exTop2, r.concentration, r.topHeavy]) {
      if (!cell.gated) continue;
      assert.equal(cell.text, DASH, 'gated cells show a dash, not a number');
      assert.notEqual(cell.text, '0', 'a gate must never print zero');
      assert.notEqual(cell.text, '0.0', 'a gate must never print zero');
      assert.ok(cell.note && cell.note.length > 0, 'every dash carries its reason');
    }
  }
});

test('a real zero still prints as a zero, not a dash', () => {
  // boom-or-nothing concepts genuinely median at 0 — that is a finding, not a gate
  const giants = row('GIANTS');
  assert.equal(giants.median.text, '0.0');
  assert.equal(giants.median.gated, false);
});

test('the no-yards gate is distinct from the rep gate', () => {
  const draw = row('QB DRAW vs LOADED BOX');
  assert.equal(draw.reps, 11); // plenty of reps — this is not a rep problem

  // the honest numbers still print
  assert.equal(draw.median.text, '0.0');
  assert.equal(draw.exTop2.text, '-2.0');
  assert.equal(draw.topHeavy.text, '-1.0');

  const cell = draw.concentration;
  assert.equal(cell.text, DASH);
  assert.equal(cell.reason, GateReason.NO_YARDS);
  assert.equal(cell.note, '-11 yds total');
  assert.doesNotMatch(cell.note, /rep/i, 'must not blame the rep count');
  assert.match(cell.label, /No positive yardage/);
});

test('an empty concept gates every column', () => {
  const empty = selfScoutRow({ name: 'UNRUN', plays: [] });
  assert.equal(empty.reps, 0);
  for (const cell of [empty.median, empty.exTop2, empty.concentration, empty.topHeavy]) {
    assert.equal(cell.text, DASH);
    assert.ok(cell.gated, 'an unrun concept gates every column');
  }
});

test('selfScoutRows keeps call-sheet order', () => {
  const rows = selfScoutRows(CONCEPTS);
  assert.equal(rows.length, CONCEPTS.length);
  assert.deepEqual(
    rows.map((r) => r.concept),
    CONCEPTS.map((c) => c.name),
  );
});
