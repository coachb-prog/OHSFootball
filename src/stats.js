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
 * @returns {number|null} null when 2 or fewer plays (nothing left to average)
 */
export function exTop2Avg(yards) {
  const sample = toSample(yards, 'exTop2Avg').sort(descending);
  if (sample.length <= 2) return null;

  const remaining = sample.slice(2);
  return sum(remaining) / remaining.length;
}

/**
 * @typedef {object} Top2Concentration
 * @property {number} top2 combined yards of the two longest plays
 * @property {number} total total yards in the sample
 * @property {number|null} concentration top2 as a percent of total; null when
 *   total yards is zero or negative (percent-of-total is meaningless there)
 * @property {number} baseline the even-split share for two plays, 2/n as a
 *   percent — what the top two would hold if every play gained the same.
 *   Capped at 100 so a 1- or 2-play sample reports 100, not 200.
 * @property {number|null} multiple concentration ÷ baseline; 1 means perfectly
 *   even, 3 means the top two carry three times their fair share. null
 *   whenever concentration is null.
 */

/**
 * How top-heavy a sample is: what share of total yardage the two longest
 * plays account for, measured against an even split.
 *
 * @param {number[]} yards
 * @returns {Top2Concentration|null} null for an empty sample
 */
export function top2Concentration(yards) {
  const sample = toSample(yards, 'top2Concentration').sort(descending);
  const n = sample.length;
  if (n === 0) return null;

  const top2 = sum(sample.slice(0, 2));
  const total = sum(sample);
  const baseline = Math.min(100, (2 / n) * 100);

  if (total <= 0) {
    return { top2, total, concentration: null, baseline, multiple: null };
  }

  const concentration = (top2 / total) * 100;
  return { top2, total, concentration, baseline, multiple: concentration / baseline };
}
