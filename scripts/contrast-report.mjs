/**
 * ტოკენების კონტრასტის ცხრილი Markdown-ში: `npm run tokens:report`.
 * წყვილები და ბარიერები იგივეა, რასაც src/styles/tokens.test.js ამოწმებს.
 */
import { readFileSync } from 'node:fs';

import { PAIRS, THEME_NAMES, measure, parseThemes } from '../src/test/contrast.js';

const themes = parseThemes(readFileSync('src/styles/tokens.css', 'utf8'));
const label = (name) => name.replace('--mc-', '');
const rows = [];
const seen = new Set();

for (const pair of PAIRS) {
  const key = `${pair.label}|${pair.bg}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const cells = THEME_NAMES.map((theme) => {
    if (pair.themes && !pair.themes.includes(theme)) return '—';
    const tokens = themes[theme];
    const { ratio, fg } = measure(tokens, pair);
    const mark = ratio >= pair.min ? '✓' : '✗';
    return `${tokens[fg].toUpperCase()} / ${tokens[pair.bg].toUpperCase()} — ${ratio.toFixed(2)} ${mark}`;
  });
  const fg = Array.isArray(pair.fg) ? pair.fg.map(label).join(' ან ') : label(pair.fg);
  rows.push(`| ${pair.label} | ${fg} → ${label(pair.bg)} | ${cells.join(' | ')} | ${pair.min}:1 |`);
}

console.log('| როლი | ტოკენი → ფონი | light | dark | contrast | ბარიერი |');
console.log('|---|---|---|---|---|---|');
console.log(rows.join('\n'));
