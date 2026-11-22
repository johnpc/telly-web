import { type ProgramImport, type ProgramRepository, programRepository } from '@/core/db/programRepository';
import { fetchBytes } from '../playlist/playlistFetcher';
import { parseXmltvBytes } from './xmltvParser';
import type { XmltvDocument } from './xmltvTypes';

export interface EpgSourceDeps {
  /** Downloads the raw (possibly gzip) document; the CORS proxy is applied here. */
  fetchBytes: (epgUrl: string) => Promise<Uint8Array>;
  programs: ProgramRepository;
  /** Settings -> EPG -> "Store descriptions"; off drops `<desc>` to save space. */
  storeDescriptions: () => boolean;
  /** Phase log (download / parse / store) so a slow or stuck step is visible. */
  trace: (message: string) => void;
}

export function defaultEpgSourceDeps(
  proxyBase: string,
  overrides: Partial<EpgSourceDeps> = {},
): EpgSourceDeps {
  return {
    fetchBytes: (url) => fetchBytes(url, 'EPG', { proxyBase }),
    programs: programRepository,
    storeDescriptions: (): boolean => true,
    trace: (): void => undefined,
    ...overrides,
  };
}

/** The rows one document stores (Android `EpgRepository.store` mapping). */
export function toProgramImports(document: XmltvDocument, keepDescriptions: boolean): ProgramImport[] {
  return document.programs.map((program) => ({
    channelTvgId: program.channelId,
    startMs: program.startMs,
    endMs: program.endMs,
    ...program.details,
    description: keepDescriptions ? program.details.description : null,
  }));
}

/**
 * Downloads + stores the EPG at `epgUrl` (port of Android `EpgRepository.refresh`);
 * returns the programme count. Replace semantics per refresh: old rows of
 * the refreshed channels go away in the same transaction.
 */
export async function refreshEpgSource(epgUrl: string, deps: EpgSourceDeps): Promise<number> {
  const bytes = await deps.fetchBytes(epgUrl);
  deps.trace(`EPG ${epgUrl}: ${bytes.byteLength} bytes, parsing`);
  const document = parseXmltvBytes(bytes);
  deps.trace(`EPG ${epgUrl}: parsed ${document.programs.length} programmes, storing`);
  const rows = toProgramImports(document, deps.storeDescriptions());
  return deps.programs.replaceFor([...new Set(rows.map((row) => row.channelTvgId))], rows);
}
