#!/usr/bin/env node
// Gate: per-function CRAP = complexity^2 * (1 - coverage)^3 + complexity <= 15.
// Complexity = cyclomatic (decision points + 1) from the TypeScript AST;
// coverage = covered statements within the function's line range, read from
// vitest's istanbul-format coverage/coverage-final.json. *Screen.tsx files
// (thin render-only composables) and tests are exempt, as in the Android repo.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, walkSourceFiles, parse, extractFunctions, ts } from './lib/ts-source.mjs';

const MAX_CRAP = 15;
const REPORT = join(ROOT, 'coverage', 'coverage-final.json');
if (!existsSync(REPORT)) {
  console.error(`FAIL crap-check: ${REPORT} not found. Run: npm run test:coverage`);
  process.exit(1);
}
const report = JSON.parse(readFileSync(REPORT, 'utf8'));
const byPath = new Map(Object.entries(report).map(([abs, data]) => [abs.replace(ROOT, ''), data]));

const DECISIONS = new Set([
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.ConditionalExpression,
  ts.SyntaxKind.CaseClause,
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.CatchClause,
]);
const LOGICAL = new Set([
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.QuestionQuestionToken,
]);

function complexity(body) {
  let c = 1;
  const visit = (n) => {
    if (DECISIONS.has(n.kind)) c += 1;
    if (ts.isBinaryExpression(n) && LOGICAL.has(n.operatorToken.kind)) c += 1;
    if (ts.isOptionalChain?.(n) && n.questionDotToken) c += 1;
    ts.forEachChild(n, visit);
  };
  visit(body);
  return c;
}

function coverageWithin(data, start, end) {
  if (!data) return 1;
  let total = 0;
  let covered = 0;
  for (const [id, loc] of Object.entries(data.statementMap)) {
    if (loc.start.line >= start && loc.end.line <= end) {
      total += 1;
      if ((data.s[id] ?? 0) > 0) covered += 1;
    }
  }
  return total === 0 ? 1 : covered / total;
}

const offenders = [];
let checked = 0;
for (const { path, text } of walkSourceFiles(join(ROOT, 'src'))) {
  if (/Screen\.tsx$/.test(path) || path === 'src/main.tsx') continue;
  const sf = parse(path, text);
  const data = byPath.get(path);
  for (const fn of extractFunctions(sf)) {
    const c = complexity(fn.body);
    const cov = coverageWithin(data, fn.start, fn.end);
    const crap = c ** 2 * (1 - cov) ** 3 + c;
    checked += 1;
    if (crap > MAX_CRAP) offenders.push({ path, name: fn.name, c, cov, crap });
  }
}
if (offenders.length > 0) {
  console.error(`FAIL crap-check: ${offenders.length} function(s) exceed CRAP ${MAX_CRAP}.`);
  console.error('Lower complexity or cover the branches — fix the code, never the gate.');
  for (const o of offenders)
    console.error(
      `  ${o.path} :: ${o.name}: CRAP=${o.crap.toFixed(1)} (complexity ${o.c}, coverage ${(o.cov * 100).toFixed(0)}%)`,
    );
  process.exit(1);
}
console.log(`PASS crap-check: ${checked} function(s) all at CRAP <= ${MAX_CRAP}.`);
