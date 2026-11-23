#!/usr/bin/env node
// Gate: docs/state-machines.md is live. Every `owner`/`tests` path it cites
// exists, every `explicit` row's owner carries a `@stateMachine('<row>')`
// marker comment, and every marker in src/ has a row. Two more checks ported
// from the Android gate: (3) the fullscreen overlay has ONE writer —
// `OverlayState` mutators are called only inside the command executor — and
// (4) a new implicit machine is caught early: a `consume*()` one-shot or a
// class-level `pending` / `armed` field may only live in a file this catalog
// cites (add a row, never an exclusion).
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
const cited = new Set(rows.flatMap((r) => [...r.owners, ...r.tests]));
// (3) OverlayState mutators: only the executor (and the store itself) may call them.
const OVERLAY_WRITERS = [
  'src/features/playback/overlay/playbackCommands.ts',
  'src/features/playback/overlay/overlayState.ts',
];
const OVERLAY_MUTATOR = /\boverlays\.(set|showAutoHiding|keepAlive)\(/;
// (4) a parameterless consume*() method or a class-level `pending` / `armed` field.
const ONE_SHOT =
  /^\s{2}(?:(?:private|protected|public|readonly|static|override|async)\s+)*consume\w*\(\)|^\s{2}(?:(?:private|protected|public|readonly|static|override)\s+)+(?:pending|armed)\b/;
for (const { path, text } of walkSourceFiles(join(ROOT, 'src'))) {
  const rel = path.startsWith(ROOT) ? path.slice(ROOT.length + 1) : path;
  for (const m of text.matchAll(/@stateMachine\('([^']+)'\)/g))
    if (!names.has(m[1])) problems.push(`${path}: marker '${m[1]}' has no row in docs/state-machines.md`);
  if (/\.test\.tsx?$/.test(rel) || rel.startsWith('src/test/')) continue;
  text.split('\n').forEach((line, i) => {
    if (!OVERLAY_WRITERS.includes(rel) && OVERLAY_MUTATOR.test(line))
      problems.push(`${rel}:${i + 1}: overlay written outside playbackCommands.ts`);
    if (!cited.has(rel) && ONE_SHOT.test(line))
      problems.push(
        `${rel}:${i + 1}: one-shot state in a file the catalog does not cite (add a row or convert)`,
      );
  });
}
if (problems.length > 0) {
  console.error('FAIL check-state-machines:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`PASS check-state-machines: ${rows.length} row(s) verified.`);
