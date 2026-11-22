import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

// vitest runs from the project root (vite `root`), so fixture paths are relative to it.
const SITE = 'e2e/fixtures/site';

/** Reads a generated fixture (`npm run fixtures` output), generating the site on first use. */
export function fixture(name: string): Uint8Array {
  const path = `${SITE}/${name}`;
  if (!existsSync(path)) {
    const args = ['e2e/fixtures/gen-fixtures.mjs', '--base', 'http://127.0.0.1:8090', '--out', SITE];
    execFileSync('node', args, { stdio: 'ignore' });
  }
  return readFileSync(path);
}

export function fixtureText(name: string): string {
  return new TextDecoder('utf-8').decode(fixture(name));
}
