#!/usr/bin/env node
// Gate: docs/state-machines.md is live. Every `owner`/`tests` path it cites
// exists, every `explicit` row's owner carries a `@stateMachine('<row>')`
// marker comment, and every marker in src/ has a row.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, walkSourceFiles } from './lib/ts-source.mjs';

// The catalog is docs/state-machines.md plus one fragment per slice under
// docs/state-machines/<slice>.md (so parallel slices never edit one file).
const FRAGMENTS = join(ROOT, 'docs', 'state-machines');
const doc = [
  join(ROOT, 'docs', 'state-machines.md'),
  ...(existsSync(FRAGMENTS)
    ? readdirSync(FRAGMENTS)
        .filter((f) => f.endsWith('.md'))
        .map((f) => join(FRAGMENTS, f))
    : []),
]
  .map((p) => readFileSync(p, 'utf8'))
  .join('\n');
const rows = [
  ...doc.matchAll(
    /^\|\s*([^|]+?)\s*\|[^|]*\|\s*([^|]*?)\s*\|\s*(explicit|guarded|implicit)\s*\|\s*([^|]*?)\s*\|$/gm,
  ),
].map((m) => ({ name: m[1], owners: paths(m[2]), status: m[3], tests: paths(m[4]) }));
function paths(cell) {
  return [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1]).filter((p) => p.includes('/'));
}
const problems = [];
for (const row of rows) {
  for (const p of [...row.owners, ...row.tests])
    if (!existsSync(join(ROOT, p))) problems.push(`${row.name}: missing ${p}`);
  if (row.status === 'explicit') {
    const marked = row.owners.some(
      (p) =>
        existsSync(join(ROOT, p)) &&
        readFileSync(join(ROOT, p), 'utf8').includes(`@stateMachine('${row.name}')`),
    );
    if (!marked) problems.push(`${row.name}: explicit row but no owner carries @stateMachine('${row.name}')`);
  }
}
const names = new Set(rows.map((r) => r.name));
for (const { path, text } of walkSourceFiles(join(ROOT, 'src'))) {
  for (const m of text.matchAll(/@stateMachine\('([^']+)'\)/g))
    if (!names.has(m[1])) problems.push(`${path}: marker '${m[1]}' has no row in docs/state-machines.md`);
}
if (problems.length > 0) {
  console.error('FAIL check-state-machines:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`PASS check-state-machines: ${rows.length} row(s) verified.`);
