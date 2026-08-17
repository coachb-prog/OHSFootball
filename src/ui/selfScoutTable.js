/**
 * Renders the self-scout sheet to an HTML string.
 *
 * Framework-free on purpose — the presenter has already done every decision
 * that matters, so this file only places text. Any logic that creeps in here
 * belongs in presenters/selfScout.js where it can be tested without a DOM.
 */

import { selfScoutRows, SELF_SCOUT_COLUMNS } from '../presenters/selfScout.js';

const escape = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch],
  );

/**
 * A gated cell renders the dash and its reason stacked, so the reason is
 * visible on the sheet rather than hidden behind a hover.
 */
function cellHtml(cell) {
  if (!cell.gated) {
    return `<span class="value">${escape(cell.text)}</span>`;
  }
  return [
    `<span class="gated" role="img" aria-label="${escape(cell.label)}">`,
    `<span class="dash" aria-hidden="true">${escape(cell.text)}</span>`,
    `<span class="note gate-${escape(cell.reason)}" aria-hidden="true">${escape(cell.note)}</span>`,
    '</span>',
  ].join('');
}

function rowHtml(row) {
  const cells = SELF_SCOUT_COLUMNS.map((column) => {
    if (column.key === 'concept') {
      return `<th scope="row" class="concept">${escape(row.concept)}`
        + `<span class="reps">${row.reps} reps</span></th>`;
    }
    return `<td class="num">${cellHtml(row[column.key])}</td>`;
  });
  return `<tr>${cells.join('')}</tr>`;
}

/**
 * @param {Array<{name: string, plays: number[]}>} concepts
 * @param {{caption?: string}} [options]
 * @returns {string} a <table> element
 */
export function renderSelfScoutTable(concepts, options = {}) {
  const rows = selfScoutRows(concepts);
  const head = SELF_SCOUT_COLUMNS.map(
    (column) =>
      `<th scope="col" class="${column.numeric ? 'num' : ''}">${escape(column.label)}</th>`,
  ).join('');

  return [
    '<table class="self-scout">',
    options.caption ? `<caption>${escape(options.caption)}</caption>` : '',
    `<thead><tr>${head}</tr></thead>`,
    `<tbody>${rows.map(rowHtml).join('')}</tbody>`,
    '</table>',
  ].join('');
}
