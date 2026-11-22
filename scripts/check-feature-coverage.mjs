#!/usr/bin/env node
// Gate: every e2e/features/**/*.feature file's @tag appears in the CI
// acceptance matrix (.github/workflows/ci.yml) so no spec can silently stop running.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const walk = (dir, out = []) => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (n.endsWith('.feature')) out.push(p);
  }
  return out;
};
const ci = readFileSync(join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
const matrix = (ci.match(/feature:\s*\[([^\]]*)\]/) ?? [])[1] ?? '';
const listed = new Set(
  matrix
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);

const missing = [];
for (const file of walk(join(ROOT, 'e2e', 'features'))) {
  const tag = (readFileSync(file, 'utf8').match(/^@([\w-]+)/m) ?? [])[1];
  if (!tag) missing.push(`${relative(ROOT, file)} has no leading @tag`);
  else if (!listed.has(tag)) missing.push(`${relative(ROOT, file)} (@${tag}) is not in the ci.yml matrix`);
}
if (missing.length > 0) {
  console.error('FAIL check-feature-coverage:');
  for (const m of missing) console.error(`  ${m}`);
  process.exit(1);
}
console.log(`PASS check-feature-coverage: ${listed.size} feature area(s) all mapped in ci.yml.`);
