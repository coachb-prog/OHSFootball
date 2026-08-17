/**
 * Prints the stats layer's output for every concept fixture, so the numbers
 * can be checked against coaching feel before any UI exists.
 *
 *   npm run scout
 */

import { median, exTop2Avg, top2Concentration, MIN_REPS } from '../src/stats.js';
import { CONCEPTS, mean } from '../test/fixtures/concepts.js';

const GATED = '—';
const num = (value, digits = 1) =>
  value === null ? GATED : value.toFixed(digits);
const pct = (value) => (value === null ? GATED : `${value.toFixed(1)}%`);
const mult = (value) => (value === null ? GATED : `${value.toFixed(2)}x`);

const rows = CONCEPTS.map((concept) => {
  const conc = top2Concentration(concept.plays);
  return {
    Concept: concept.name,
    n: concept.plays.length,
    Mean: num(mean(concept.plays)),
    Median: num(median(concept.plays)),
    'ExTop2Avg': num(exTop2Avg(concept.plays)),
    'Top2%': conc === null ? GATED : pct(conc.concentration),
    Baseline: conc === null ? GATED : pct(conc.baseline),
    Multiple: conc === null ? GATED : mult(conc.multiple),
  };
});

console.log(`\nConcept sheet — rep gate at ${MIN_REPS}, "${GATED}" means the layer declined to answer\n`);
console.table(rows);

console.log('Feel check:\n');
for (const concept of CONCEPTS) {
  console.log(`  ${concept.name}`);
  console.log(`    ${concept.feel}\n`);
}
