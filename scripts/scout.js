/**
 * Prints the stats layer's output for every concept fixture, so the numbers
 * can be checked against coaching feel before any UI exists.
 *
 *   npm run scout
 */

import { median, exTop2Avg, top2Concentration, topHeaviness, MIN_REPS_EX_TOP2 } from '../src/stats.js';
import { CONCEPTS, mean } from '../test/fixtures/concepts.js';

const GATED = '—';
const num = (value, digits = 1) =>
  value === null ? GATED : value.toFixed(digits);
const pct = (value) => (value === null ? GATED : `${value.toFixed(1)}%`);
const gapf = (value) => (value === null ? GATED : `${value >= 0 ? '+' : ''}${value.toFixed(1)}`);

const rows = CONCEPTS.map((concept) => {
  const conc = top2Concentration(concept.plays);
  return {
    Concept: concept.name,
    n: concept.plays.length,
    Mean: num(mean(concept.plays)),
    Median: num(median(concept.plays)),
    'ExTop2Avg': num(exTop2Avg(concept.plays)),
    'Top2%': conc === null ? GATED : pct(conc.concentration),
    'Mean-Med': gapf(topHeaviness(concept.plays)),
  };
});

console.log(`\nConcept sheet — ex-top-2 floor at ${MIN_REPS_EX_TOP2}, "${GATED}" means the layer declined to answer\n`);
console.table(rows);

console.log('Feel check:\n');
for (const concept of CONCEPTS) {
  console.log(`  ${concept.name}`);
  console.log(`    ${concept.feel}\n`);
}
