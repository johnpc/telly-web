// Shared helpers for the TypeScript-aware gates: walk source files and
// enumerate function-like nodes with the TypeScript compiler API.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

export const ROOT = new URL('../..', import.meta.url).pathname;

export function walkSourceFiles(dir, { includeTests = false } = {}, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || (!includeTests && name === 'test')) continue;
      walkSourceFiles(path, { includeTests }, out);
    } else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts')) {
      if (!includeTests && /\.test\.tsx?$/.test(name)) continue;
      out.push({ path: relative(ROOT, path), text: readFileSync(path, 'utf8') });
    }
  }
  return out;
}

export function parse(path, text) {
  const kind = path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(path, text, ts.ScriptTarget.ES2022, true, kind);
}

const FUNCTION_KINDS = new Set([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
]);

function nameOf(node, sf) {
  if (node.name && ts.isIdentifier(node.name)) return node.name.text;
  const parent = node.parent;
  if (parent && ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
  if (parent && ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
  if (parent && ts.isCallExpression(parent)) {
    const callee = parent.expression.getText(sf).split('.').pop();
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    return `${callee}@${line + 1}`;
  }
  const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  return `<anonymous>@${line + 1}`;
}

/** Every function-like node with its name, body text and source range. */
export function extractFunctions(sf) {
  const out = [];
  const visit = (node) => {
    if (FUNCTION_KINDS.has(node.kind) && node.body) {
      out.push({
        name: nameOf(node, sf),
        node,
        body: node.body,
        start: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
        end: sf.getLineAndCharacterOfPosition(node.getEnd()).line + 1,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

export { ts };
