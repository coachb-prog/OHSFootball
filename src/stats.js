/**
 * Stats layer: pure math over per-play (or per-game) yardage samples.
 *
 * Every function here takes a plain array of numbers and returns numbers.
 * No formatting, no rounding, no rendering — callers decide how to display.
 * Shared by self-scout, opponent defense scout, and the live tracker.
 */

/**
 * Validate and copy an input sample so callers' arrays are never mutated.
 *
 * @param {number[]} yards
 * @param {string} fnName used in error messages
 * @returns {number[]} a defensive copy
 */
function toSample(yards, fnName) {
  if (!Array.isArray(yards)) {
    throw new TypeError(`${fnName}: expected an array of yards`);
  }
  return yards.map((value, i) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError(`${fnName}: yards[${i}] is not a finite number`);
    }
    return value;
  });
}

/**
 * Rep floor for ex-top-2: enough plays left to average once the two longest are
 * gone. This is a floor on "is there anything here", NOT a reliability
 * threshold — ex-top-2's spread is essentially flat across sample size
 * (±1.5 yds at 4 reps, ±1.1 at 60), so a higher gate blanks cells that would
 * have been perfectly usable. The old gate of 10 was costing us the concept
 * level, which is exactly where the metric earns its keep.
 *
 * @type {number}
 */
export const MIN_REPS_EX_TOP2 = 6;

/**
 * Rep floor for the top-two share. Not about noise either — below this the top
 * two plays ARE most of the sample by construction ("2 of 5 plays were 70% of
 * our yards" describes arithmetic, not an offense).
 *
 * @type {number}
 */
export const MIN_REPS_SHARE = 10;

/**
 * Top-heaviness cut, in yards of mean-over-median. Chosen by measuring, not by
 * eye: at 5.0 it flags 9% of ordinary concepts and catches 62% of genuinely
 * boom-or-bust ones. Lower cuts catch more but cry wolf — 3.0 flags a third of
 * ordinary concepts, and a flag that fires on everything gets ignored.
 *
 * @type {number}
 */
export const TOP_HEAVY_YDS = 5;

const ascending = (a, b) => a - b;
const descending = (a, b) => b - a;
const sum = (values) => values.reduce((total, value) => total + value, 0);

/**
 * Middle value of the sample. With an even count, averages the two middle
 * values. Less sensitive than the mean to one busted coverage / big gain.
 *
 * @param {number[]} yards
 * @returns {number|null} null for an empty sample
 */
export function median(yards) {
  const sample = toSample(yards, 'median').sort(ascending);
  if (sample.length === 0) return null;

  const mid = Math.floor(sample.length / 2);
  return sample.length % 2 === 1
    ? sample[mid]
    : (sample[mid - 1] + sample[mid]) / 2;
}

/**
 * Average yardage with the two longest plays removed — the "what does this
 * offense do on a normal snap" number, once the explosives are stripped out.
 *
 * @param {number[]} yards
 * @returns {number|null} null below MIN_REPS_EX_TOP2 plays
 */
export function exTop2Avg(yards) {
  const sample = toSample(yards, 'exTop2Avg').sort(descending);
  if (sample.length < MIN_REPS_EX_TOP2) return null;

  const remaining = sample.slice(2);
  return sum(remaining) / remaining.length;
}

/**
 * @typedef {object} Top2Concentration
 * @property {number} top2 combined yards of the two longest plays
 * @property {number} total total yards in the sample
 * @property {number|null} concentration top2 as a percent of total. Null when
 *   total yards is zero or negative — a percent-of-total is meaningless once
 *   the denominator collapses, and sack-heavy or loaded-box concepts get there
 *   regularly. Note it can still exceed 100 when the sample mixes negatives
 *   (two 40s alongside enough sacks), which is real, not a bug.
 */

/**
 * How top-heavy a sample is, in yards: the mean minus the median.
 *
 * This replaces an earlier "multiple" that divided the top-two share by an even
 * split of 2/n. That number was unusable across cuts — for one fixed
 * distribution it read 3.7x over 10 plays and 7.9x over 60, because two plays
 * out of a growing sample are always a larger multiple of an even split. Any
 * statistic built on a FIXED COUNT of longest plays has that problem; it is not
 * a baseline that can be tuned away.
 *
 * Mean and median are both stable estimators, so their gap converges instead of
 * drifting. Measured on one distribution it reads ~2.3 yds for an ordinary
 * concept and ~6.6 for a boom-or-bust one at EVERY sample size from 6 to 60 —
 * the same 2.8x separation throughout. Compare against TOP_HEAVY_YDS.
 *
 * @param {number[]} yards
 * @returns {number|null} null for an empty sample
 */
export function topHeaviness(yards) {
  const sample = toSample(yards, 'topHeaviness');
  if (sample.length === 0) return null;
  return sum(sample) / sample.length - median(sample);
}

/**
 * @typedef {object} Top2Concentration
 * @property {number} top2 combined yards of the two longest plays
 * @property {number} total total yards in the sample
 * @property {number|null} concentration top2 as a percent of total. Null when
 *   total yards is zero or negative — a percent-of-total is meaningless once
 *   the denominator collapses, and sack-heavy or loaded-box concepts get there
 *   regularly. Note it can still exceed 100 when the sample mixes negatives
 *   (two 40s alongside enough sacks), which is real, not a bug.
 *
 *   This is a DESCRIPTION of one sample, not a score: the share falls as reps
 *   climb no matter how the offense plays, so read it as "two plays were this
 *   much of that film" and never compare it between cuts of different size.
 *   For a comparable number use topHeaviness().
 */

/**
 * What share of total yardage the two longest plays account for. Descriptive
 * only — see the typedef. topHeaviness() is the comparable measure.
 *
 * @param {number[]} yards
 * @returns {Top2Concentration|null} null below MIN_REPS_SHARE plays
 */
export function top2Concentration(yards) {
  const sample = toSample(yards, 'top2Concentration').sort(descending);
  const n = sample.length;
  if (n < MIN_REPS_SHARE) return null;

  const top2 = sum(sample.slice(0, 2));
  const total = sum(sample);

  if (total <= 0) return { top2, total, concentration: null };

  return { top2, total, concentration: (top2 / total) * 100 };
}
