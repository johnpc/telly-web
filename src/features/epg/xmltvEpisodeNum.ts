/**
 * Converts an XMLTV `<episode-num>` element into TiviMate's display form
 * (port of Android `XmltvEpisodeNum`). xmltv_ns numbers are zero-based
 * "season.episode.part" (each field optional, possibly "index/total"):
 * `0.9.` renders as "S1 E10". Other systems already carry display text.
 */
const XMLTV_NS = 'xmltv_ns';

/** "9/20" or " 9 " -> 10 (xmltv_ns is zero-based); junk -> null. */
function oneBased(field: string | undefined): number | null {
  const head = field?.split('/')[0]?.trim() ?? '';
  if (!/^[+-]?\d+$/.test(head)) return null;
  const value = Number(head);
  return value >= 0 ? value + 1 : null;
}

function fromXmltvNs(value: string): string | null {
  const fields = value.split('.');
  const season = oneBased(fields[0]);
  const episode = oneBased(fields[1]);
  const parts = [season === null ? null : `S${season}`, episode === null ? null : `E${episode}`];
  const text = parts.filter((part): part is string => part !== null).join(' ');
  return text === '' ? null : text;
}

/** The renderable episode string, or null when nothing displayable exists. */
export function episodeDisplay(
  system: string | null | undefined,
  text: string | null | undefined,
): string | null {
  const value = text?.trim() ?? '';
  if (value === '') return null;
  return system?.trim() === XMLTV_NS ? fromXmltvNs(value) : value;
}
