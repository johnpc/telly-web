import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

// vitest runs from the project root (vite `root`), so fixture paths are relative to it.
// Unit tests use their OWN generated site anchored to a FIXED instant so every
// timestamp they assert is deterministic (the e2e site is re-anchored to "now").
const SITE = 'e2e/fixtures/site-unit';
export const FIXTURE_ANCHOR_MS = Date.UTC(2026, 10, 22, 12, 0, 0);

/** Reads a generated fixture, generating the fixed-anchor site on first use. */
export function fixture(name: string): Uint8Array {
  const path = `${SITE}/${name}`;
  if (!existsSync(path)) {
    const args = [
      'e2e/fixtures/gen-fixtures.mjs',
      String(FIXTURE_ANCHOR_MS),
      '--base',
      'http://127.0.0.1:8090',
      '--out',
      SITE,
    ];
    execFileSync('node', args, { stdio: 'ignore' });
  }
  return readFileSync(path);
}

export function fixtureText(name: string): string {
  return new TextDecoder('utf-8').decode(fixture(name));
}
