#!/usr/bin/env node
// Gate: every LOGIC .ts/.tsx file under src/ must be <= 100 logic lines
// (comments and blank lines excluded). Tests and src/test are exempt.
import { join } from 'node:path';
import { ROOT, walkSourceFiles } from './lib/ts-source.mjs';

const MAX_LINES = 100;

export function countLogicLines(text) {
  const noBlock = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ''));
  return noBlock
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('//')).length;
}

const offenders = walkSourceFiles(join(ROOT, 'src'))
  .map(({ path, text }) => ({ path, lines: countLogicLines(text) }))
  .filter(({ lines }) => lines > MAX_LINES);

if (offenders.length > 0) {
  console.error(`FAIL check-file-lines: ${offenders.length} file(s) exceed ${MAX_LINES} logic lines.`);
  console.error('Split them into smaller units — fix the code, never the gate.');
  for (const { path, lines } of offenders) console.error(`  ${path}: ${lines} lines`);
  process.exit(1);
}
console.log(`PASS check-file-lines: all logic source files are <= ${MAX_LINES} lines.`);
