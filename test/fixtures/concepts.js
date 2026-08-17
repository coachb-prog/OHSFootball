/**
 * Concept fixtures for sanity-checking the stats layer.
 *
 * IMPORTANT: these yardages are ARCHETYPES, not charted reps. They were
 * written to have the distribution shape each concept is known for, so the
 * math can be checked against coaching feel before anything gets rendered.
 * Replace `plays` with real charting when it is available — the assertions in
 * concepts.test.js are written against the shape, so honest data should keep
 * them passing. If real data breaks them, that is the finding.
 *
 * `feel` is the one-line scouting read each concept should produce. If the
 * numbers stop matching the feel line, the math is wrong.
 */

export const CONCEPTS = [
  {
    name: 'INSIDE ZONE',
    kind: 'grinder',
    feel: 'Steady 4. No play carries it. Median and ex-top-2 should sit close.',
    plays: [4, 2, 6, 3, 5, -1, 8, 4, 3, 12, 2, 5, 7, 1, 4, 3, 6, 2],
  },
  {
    name: 'BUBBLE SCREEN',
    kind: 'grinder',
    feel: 'Tight cluster around 5, one house call. Barely moves without it.',
    plays: [5, 3, 7, 4, 6, 5, 2, 8, 4, 20, 5, 3, 6, 4, 7, 5],
  },
  {
    name: 'FOUR VERTS',
    kind: 'explosive',
    feel: 'Mean flatters it. Mostly incompletions, two shots make the season.',
    plays: [0, 0, 45, 0, 12, 0, 38, 0, 0, 9, 0, 0, 16, 0],
  },
  {
    name: 'GIANTS',
    kind: 'explosive',
    feel: 'PLACEHOLDER SHAPE — assumed max-protect shot concept: boom or nothing. '
      + 'Should show the highest concentration on the sheet and a brutal ex-top-2.',
    plays: [0, 0, 52, 0, 0, 41, 0, 7, 0, 0, 11, 0],
  },
  {
    name: 'QB DRAW vs LOADED BOX',
    kind: 'negative',
    feel: 'Dead concept. Total yardage is negative — percentages must refuse to print.',
    plays: [2, -6, 1, -8, 3, -2, 4, -5, 1, 0, -1],
  },
  {
    name: 'SPEED SWEEP',
    kind: 'thin',
    feel: 'Only 6 reps charted. Too thin to judge — top-two metrics must stay silent.',
    plays: [8, 3, 22, 4, 2, 5],
  },
];

export const byName = (name) => {
  const concept = CONCEPTS.find((c) => c.name === name);
  if (!concept) throw new Error(`no fixture named ${name}`);
  return concept;
};

export const mean = (plays) =>
  plays.length === 0 ? null : plays.reduce((a, b) => a + b, 0) / plays.length;
