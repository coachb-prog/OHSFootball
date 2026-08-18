import test from 'node:test';
import assert from 'node:assert/strict';

import { renderSelfScoutTable } from '../src/ui/selfScoutTable.js';
import { CONCEPTS, byName } from './fixtures/concepts.js';

const html = renderSelfScoutTable(CONCEPTS);

test('renders one row per concept with the three columns', () => {
  assert.equal((html.match(/<tr>/g) ?? []).length, CONCEPTS.length + 1); // + header
  for (const label of ['Median', 'Ex-Top-2', 'Top-2 Share', 'Mean-Med']) {
    assert.ok(html.includes(`>${label}</th>`), `missing column ${label}`);
  }
});

test('every row shows its rep count next to the concept name', () => {
  for (const concept of CONCEPTS) {
    assert.ok(
      html.includes(`${concept.name}<span class="reps">${concept.plays.length} reps</span>`),
      `${concept.name} should carry its rep count`,
    );
  }
});

test('gated cells render a dash plus a visible reason', () => {
  assert.ok(html.includes('6 / 10 reps'), 'the share gate names the reps it wants');
  assert.ok(html.includes('-11 yds total'), 'negative concept shows its total');
  // the two gate reasons carry different classes so they can be styled apart
  assert.ok(html.includes('note gate-no-yards'), 'no-yards gate is styled apart');
  assert.ok(html.includes('note gate-reps'), 'rep gate is styled apart');
});

test('gated cells carry an assistive label spelling out the reason', () => {
  assert.ok(html.includes('aria-label="Not enough reps: 6 of 10 charted"'));
  assert.ok(html.includes('No positive yardage to divide'));
});

test('the share and the mean-median gap each get their own cell', () => {
  assert.ok(html.includes('>84%<'), 'GIANTS share cell');
  assert.ok(html.includes('>26%<'), 'INSIDE ZONE share cell');
  assert.ok(html.includes('>+9.3<'), 'GIANTS mean-median gap');
  assert.ok(html.includes('>+0.2<'), 'INSIDE ZONE mean-median gap');
});

test('concept names are escaped', () => {
  const nasty = renderSelfScoutTable([
    { name: '<script>alert(1)</script>', plays: byName('INSIDE ZONE').plays },
  ]);
  assert.ok(!nasty.includes('<script>'), 'must not emit a raw script tag');
  assert.ok(nasty.includes('&lt;script&gt;'));
});

test('caption is optional and escaped when present', () => {
  assert.ok(!html.includes('<caption>'), 'no caption by default');
  const withCaption = renderSelfScoutTable(CONCEPTS, { caption: 'Weeks 1-4 & 6' });
  assert.ok(withCaption.includes('<caption>Weeks 1-4 &amp; 6</caption>'));
});
