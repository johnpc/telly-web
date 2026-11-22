/**
 * Parses XMLTV timestamps such as `20260913123000 +0000` into epoch millis
 * (port of Android `XmltvTimestamp`). The offset is optional and may be
 * separated from the digits by whitespace; a missing offset means UTC.
 */
const TIMESTAMP = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s*([+-])(\d{2})(\d{2}))?$/;
const MS_PER_MINUTE = 60_000;

/** Epoch millis for `raw`, or null when it is not a full XMLTV timestamp. */
export function parseXmltvMs(raw: string | null | undefined): number | null {
  const match = TIMESTAMP.exec(raw?.trim() ?? '');
  if (match === null) return null;
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
  const utc = Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1, hour ?? 0, minute ?? 0, second ?? 0);
  return utc - offsetMs(match[7], match[8], match[9]);
}

/** Millis east of UTC for `+HHMM`/`-HHMM`; 0 for a missing offset. */
function offsetMs(sign: string | undefined, hours: string | undefined, minutes: string | undefined): number {
  if (sign === undefined) return 0;
  const magnitude = (Number(hours) * 60 + Number(minutes)) * MS_PER_MINUTE;
  return sign === '-' ? -magnitude : magnitude;
}
