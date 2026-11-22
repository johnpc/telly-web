/**
 * TiviMate's playlist classification (port of Android `VodClassifier`):
 * entries whose stream URL carries a video-file extension are VOD "Movies";
 * streams (.ts/.m3u8/no extension) are live channels. One source of truth —
 * the wizard summary and the importer both dispatch on `isVod`.
 */
const VOD_EXTENSIONS = new Set(['mp4', 'mkv', 'avi', 'mov']);

export function isVod(streamUrl: string): boolean {
  const path = streamUrl.split('?')[0] ?? '';
  const dot = path.lastIndexOf('.');
  return dot !== -1 && VOD_EXTENSIONS.has(path.slice(dot + 1).toLowerCase());
}

/** Refresh-stable identity for resume positions (cf. `channelIdentity`). */
export function vodItemKey(streamUrl: string, name: string): string {
  return `${streamUrl}|${name}`;
}
