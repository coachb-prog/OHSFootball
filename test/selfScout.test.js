import test from 'node:test';
import assert from 'node:assert/strict';

import { selfScoutRow, selfScoutRows, DASH, GateReason } from '../src/presenters/selfScout.js';
import { CONCEPTS, byName } from './fixtures/concepts.js';

const row = (name) => selfScoutRow(byName(name));

test('a healthy concept fills all three columns', () => {
  const zone = row('INSIDE ZONE');
  assert.equal(zone.concept, 'INSIDE ZONE');
  assert.equal(zone.reps, 18);
  assert.equal(zone.median.text, '4.0');
  assert.equal(zone.exTop2.text, '3.5');
  assert.equal(zone.concentration.text, '26% (2.4x)');

  for (const cell of [zone.median, zone.exTop2, zone.concentration]) {
    assert.equal(cell.gated, false);
  }
});

test('concentration shows percent and multiple together', () => {
  assert.equal(row('GIANTS').concentration.text, '84% (5.0x)');
  assert.equal(row('FOUR VERTS').concentration.text, '69% (4.8x)');
  assert.equal(row('BUBBLE SCREEN').concentration.text, '30% (2.4x)');

  // the shape holds for every ungated concept
  for (const concept of CONCEPTS) {
    const cell = selfScoutRow(concept).concentration;
    if (cell.gated) continue;
    assert.match(cell.text, /^-?\d+% \(-?\d+\.\dx\)$/, `bad format: ${cell.text}`);
  }
});

test('a thin concept dashes the gated cells and shows the rep count', () => {
  const sweep = row('SPEED SWEEP');
  assert.equal(sweep.reps, 6);

  // median is ungated by design
  assert.equal(sweep.median.text, '4.5');
  assert.equal(sweep.median.gated, false);

  for (const cell of [sweep.exTop2, sweep.concentration]) {
    assert.equal(cell.text, DASH);
    assert.equal(cell.gated, true);
    assert.equal(cell.reason, GateReason.REPS);
    assert.equal(cell.note, '6 / 10 reps');
    assert.match(cell.label, /Not enough reps: 6 of 10/);
  }
});

test('a gated cell never reads as a zero', () => {
  for (const concept of CONCEPTS) {
    const r = selfScoutRow(concept);
    for (const cell of [r.median, r.exTop2, r.concentration]) {
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
  for (const cell of [empty.median, empty.exTop2, empty.concentration]) {
    assert.equal(cell.text, DASH);
    assert.equal(cell.note, '0 / 10 reps');
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
