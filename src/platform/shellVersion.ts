/**
 * A shell version is the start document's hashed assets. Vite renames
 * `assets/index-*.js` / `.css` whenever their content changes, so the set of
 * asset URLs the document references identifies a deploy exactly — with no
 * build flag to forget. `public/sw.js` never changes between deploys, so the
 * worker is registered as `sw.js?v=<version>`: a new deploy becomes a NEW
 * worker (byte-identical script, different URL) that the browser installs
 * beside the running one, which is what `pwaUpdate.ts` turns into the
 * "telly was updated" toast.
 */

/** The elements a version reads — the live `Document` or a `DOMParser` result. */
export type ShellDocument = Pick<ParentNode, 'querySelectorAll'>;

/** Query that keeps a document fetch out of the worker's shell cache (`./` is cache-first there). */
export const LIVE_SHELL_QUERY = '?shell=live';

/** The `assets/` URLs the document's scripts and stylesheets reference, as written, sorted. */
export function assetRefs(doc: ShellDocument, baseUrl: string): string[] {
  const prefix = `${baseUrl}assets/`;
  return [...doc.querySelectorAll('script[src], link[href]')]
    .map((element) => element.getAttribute('src') ?? element.getAttribute('href') ?? '')
    .filter((ref) => ref.startsWith(prefix))
    .sort();
}

/** FNV-1a over the sorted asset refs: eight hex characters, short enough for a query string. */
export function shellVersion(doc: ShellDocument, baseUrl: string): string {
  const text = assetRefs(doc, baseUrl).join('\n');
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** The worker script URL for a shell version. */
export function workerUrl(baseUrl: string, version: string): string {
  return `${baseUrl}sw.js?v=${version}`;
}

/** The version a worker was registered for, or null for a worker from before versioned URLs. */
export function workerVersion(scriptUrl: string): string | null {
  return new URL(scriptUrl, 'http://localhost').searchParams.get('v');
}

/**
 * The deployed start document's version: fetched past the worker's cache (the
 * query) and the HTTP cache (`no-store`). Null when it cannot be read — offline,
 * or a host answering something other than the shell.
 */
export async function liveShellVersion(
  baseUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const response = await fetchFn(`${baseUrl}${LIVE_SHELL_QUERY}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const document = new DOMParser().parseFromString(await response.text(), 'text/html');
    return shellVersion(document, baseUrl);
  } catch {
    return null;
  }
}
