/**
 * Presenter for the self-scout sheet. Turns raw stats into display strings.
 *
 * Pure: takes plays, returns text. No DOM, no rendering. The rule this layer
 * exists to enforce is that a gated cell must never read as a zero — every
 * dash carries the reason it is a dash.
 */

import { median, exTop2Avg, top2Concentration, MIN_REPS } from '../stats.js';

export const DASH = '—';

/** Reasons a cell declines to show a number. */
export const GateReason = {
  /** Fewer than MIN_REPS plays charted. */
  REPS: 'reps',
  /** Enough reps, but total yardage is zero or negative. */
  NO_YARDS: 'no-yards',
};

const yards = (value) => value.toFixed(1);

/**
 * A cell holding a real number.
 *
 * @param {string} text
 * @returns {{text: string, gated: false}}
 */
const value = (text) => ({ text, gated: false });

/**
 * A cell that declined to answer. `note` is rendered next to the dash so the
 * cell reads as "not enough reps" rather than "zero", and `label` is the
 * long-form version for screen readers and tooltips.
 *
 * @param {string} reason one of GateReason
 * @param {string} note short text shown under the dash
 * @param {string} label full sentence for assistive tech
 */
const gate = (reason, note, label) => ({
  text: DASH,
  gated: true,
  reason,
  note,
  label,
});

const repGate = (reps) =>
  gate(
    GateReason.REPS,
    `${reps} / ${MIN_REPS} reps`,
    `Not enough reps: ${reps} of ${MIN_REPS} charted`,
  );

/**
 * Format one concept into the three self-scout columns.
 *
 * @param {{name: string, plays: number[]}} concept
 * @returns {{
 *   concept: string,
 *   reps: number,
 *   median: object,
 *   exTop2: object,
 *   concentration: object,
 * }}
 */
export function selfScoutRow(concept) {
  const { name, plays } = concept;
  const reps = plays.length;

  const med = median(plays);
  const ex = exTop2Avg(plays);
  const conc = top2Concentration(plays);

  return {
    concept: name,
    reps,
    // Median is ungated by design — it stays honest on small samples — but an
    // empty sample still has nothing to show.
    median: med === null ? repGate(reps) : value(yards(med)),
    exTop2: ex === null ? repGate(reps) : value(yards(ex)),
    concentration: formatConcentration(conc, reps),
  };
}

/**
 * The concentration cell carries two numbers at once: the top-two share and
 * how many times the even-split baseline that is — "58% (3.5x)".
 *
 * Its two gate reasons are different and must not be conflated. Too few reps
 * is "come back later"; a non-positive total is "this concept lost yardage",
 * which is a finding in its own right.
 */
function formatConcentration(conc, reps) {
  if (conc === null) return repGate(reps);

  if (conc.concentration === null) {
    return gate(
      GateReason.NO_YARDS,
      `${conc.total} yds total`,
      `No positive yardage to divide: ${conc.total} total yards across ${reps} reps`,
    );
  }

  const pct = Math.round(conc.concentration);
  const mult = conc.multiple.toFixed(1);
  return value(`${pct}% (${mult}x)`);
}

/**
 * Format a whole call sheet.
 *
 * @param {Array<{name: string, plays: number[]}>} concepts
 */
export const selfScoutRows = (concepts) => concepts.map(selfScoutRow);

/** Column headers, in render order. */
export const SELF_SCOUT_COLUMNS = [
  { key: 'concept', label: 'Concept', numeric: false },
  { key: 'median', label: 'Median', numeric: true },
  { key: 'exTop2', label: 'Ex-Top-2', numeric: true },
  { key: 'concentration', label: 'Top-2 Conc.', numeric: true },
];
