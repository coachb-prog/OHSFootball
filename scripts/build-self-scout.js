/**
 * Builds dist/self-scout.html — the self-scout sheet rendered against the
 * concept fixtures, so the UI can be looked at without a server or a build.
 *
 *   npm run build:self-scout && open dist/self-scout.html
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderSelfScoutTable } from '../src/ui/selfScoutTable.js';
import { MIN_REPS_EX_TOP2 } from '../src/stats.js';
import { CONCEPTS } from '../test/fixtures/concepts.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const styles = `
  :root {
    color-scheme: light dark;
    --bg: #10131a;
    --panel: #171b24;
    --line: #262c3a;
    --text: #e8ecf4;
    --muted: #7d879c;
    --gate: #5f6980;
    --accent: #f0b429;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 2.5rem 1.25rem;
    background: var(--bg);
    color: var(--text);
    font: 16px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  main { max-width: 720px; margin: 0 auto; }
  h1 {
    font-size: 1.05rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 1.5rem;
  }
  .sheet {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 10px;
    overflow-x: auto;
  }
  table.self-scout {
    width: 100%;
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
  }
  caption {
    caption-side: top;
    text-align: left;
    padding: 1rem 1.25rem 0;
    color: var(--muted);
    font-size: 0.8rem;
  }
  thead th {
    text-align: left;
    padding: 1rem 1.25rem 0.6rem;
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
    border-bottom: 1px solid var(--line);
    white-space: nowrap;
  }
  thead th.num, td.num { text-align: right; }
  tbody tr + tr th, tbody tr + tr td { border-top: 1px solid var(--line); }
  th.concept {
    text-align: left;
    padding: 0.85rem 1.25rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  th.concept .reps {
    display: block;
    font-weight: 400;
    font-size: 0.72rem;
    color: var(--muted);
    letter-spacing: 0.04em;
  }
  td.num { padding: 0.85rem 1.25rem; }
  .value {
    font-size: 1.15rem;
    font-variant-numeric: tabular-nums;
  }
  .gated { display: inline-block; text-align: right; }
  .gated .dash {
    display: block;
    font-size: 1.15rem;
    color: var(--gate);
  }
  .gated .note {
    display: block;
    font-size: 0.7rem;
    color: var(--muted);
    white-space: nowrap;
  }
  .gated .note.gate-no-yards { color: var(--accent); }
  .legend {
    margin: 1rem 0 0;
    color: var(--muted);
    font-size: 0.78rem;
  }
  .legend b { color: var(--gate); font-weight: 600; }
`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Self-Scout</title>
<style>${styles}</style>
</head>
<body>
<main>
  <h1>Self-Scout</h1>
  <div class="sheet">
    ${renderSelfScoutTable(CONCEPTS, { caption: `Ex-top-2 floor at ${MIN_REPS_EX_TOP2} reps.` })}
  </div>
  <p class="legend">
    <b>&mdash;</b> means the sheet declined to answer, and says why underneath.
    A printed <b>0.0</b> is a real zero.
  </p>
</main>
</body>
</html>
`;

await mkdir(join(root, 'dist'), { recursive: true });
await writeFile(join(root, 'dist', 'self-scout.html'), html, 'utf8');
console.log('wrote dist/self-scout.html');
