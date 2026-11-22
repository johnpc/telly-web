import type { ProgramDetails } from '@/core/db/types';

/** A `<channel>` element from an XMLTV document. */
export interface XmltvChannel {
  id: string;
  displayName: string | null;
  iconUrl: string | null;
}

/** A `<programme>` element with its start/stop resolved to epoch millis. */
export interface XmltvProgram {
  channelId: string;
  startMs: number;
  endMs: number;
  details: ProgramDetails;
}

/** Everything parsed from one XMLTV document. */
export interface XmltvDocument {
  channels: XmltvChannel[];
  programs: XmltvProgram[];
}
