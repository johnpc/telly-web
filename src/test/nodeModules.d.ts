// Minimal typings for the Node built-ins the test fixture reader needs.
// The app tsconfig deliberately types the browser only (no @types/node
// globals, which would clash with DOM timer types), so these are declared
// here, for test infrastructure only.
declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string): Uint8Array;
}
declare module 'node:child_process' {
  export function execFileSync(
    file: string,
    args: string[],
    options?: { stdio?: 'ignore' | 'inherit' },
  ): unknown;
}
