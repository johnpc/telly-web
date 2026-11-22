#!/usr/bin/env node
// Gate: Halstead difficulty D = (n1 / 2) * (N2 / n2) per function body <= 20.
// n1 = distinct operators (keywords + punctuation), n2 = distinct operands
// (identifiers + literals), N2 = total operands. Tests exempt.
import { join } from 'node:path';
import { ROOT, walkSourceFiles, parse, extractFunctions, ts } from './lib/ts-source.mjs';

const MAX_DIFFICULTY = 20;

function isOperand(kind) {
  return (
    kind === ts.SyntaxKind.Identifier ||
    kind === ts.SyntaxKind.PrivateIdentifier ||
    (kind >= ts.SyntaxKind.FirstLiteralToken && kind <= ts.SyntaxKind.LastLiteralToken) ||
    kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral ||
    kind === ts.SyntaxKind.TemplateHead ||
    kind === ts.SyntaxKind.TemplateMiddle ||
    kind === ts.SyntaxKind.TemplateTail ||
    kind === ts.SyntaxKind.JsxText ||
    kind === ts.SyntaxKind.TrueKeyword ||
    kind === ts.SyntaxKind.FalseKeyword ||
    kind === ts.SyntaxKind.NullKeyword ||
    kind === ts.SyntaxKind.ThisKeyword
  );
}

function difficulty(body, sf) {
  const operators = new Set();
  const operands = new Map();
  const scanner = ts.createScanner(
    ts.ScriptTarget.ES2022,
    true,
    ts.LanguageVariant.JSX,
    sf.text,
    undefined,
    body.getStart(sf),
    body.getEnd() - body.getStart(sf),
  );
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
    const token = scanner.getTokenText();
    if (isOperand(kind)) operands.set(token, (operands.get(token) ?? 0) + 1);
    else if (kind !== ts.SyntaxKind.WhitespaceTrivia && kind !== ts.SyntaxKind.NewLineTrivia)
      operators.add(token);
  }
  const n2 = operands.size;
  if (n2 === 0) return 0;
  const total = [...operands.values()].reduce((a, b) => a + b, 0);
  return (operators.size / 2) * (total / n2);
}

const offenders = [];
let checked = 0;
for (const { path, text } of walkSourceFiles(join(ROOT, 'src'))) {
  const sf = parse(path, text);
  for (const fn of extractFunctions(sf)) {
    checked += 1;
    const d = difficulty(fn.body, sf);
    if (d > MAX_DIFFICULTY) offenders.push({ path, name: fn.name, d });
  }
}
if (offenders.length > 0) {
  console.error(`FAIL check-halstead: ${offenders.length} function(s) exceed D=${MAX_DIFFICULTY}.`);
  console.error('Reduce vocabulary/repetition in these bodies — fix the code, never the gate.');
  for (const o of offenders) console.error(`  ${o.path} :: ${o.name}: D=${o.d.toFixed(1)}`);
  process.exit(1);
}
console.log(`PASS check-halstead: ${checked} function(s) all at D <= ${MAX_DIFFICULTY}.`);
