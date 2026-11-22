import type { AudioTrack, StreamDetails, TextTrack, TrackSnapshot, VideoTrack } from '@/core/player';

/** Pure label derivation for the picker rows and the quick-bar slots (Android `TrackLabels`). */
const BITS_PER_MEGABIT = 1_000_000;

function channelsSuffix(count: number): string {
  if (count <= 0) return '';
  if (count === 1) return ' · Mono';
  return count === 2 ? ' · Stereo' : ' · Surround';
}

function languageName(code: string | null, fallback: string): string {
  if (code === null || code.trim() === '' || code === 'und') return fallback;
  const display =
    typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'language' }) : null;
  const name = display?.of(code) ?? code;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export const TrackLabels = {
  /** "1920×1080, 5.2 Mbps"; parts the container omits are dropped. */
  video(track: VideoTrack): string {
    if (track.width <= 0 || track.height <= 0) return 'Video';
    const size = `${track.width}×${track.height}`;
    return track.bitrate <= 0 ? size : `${size}, ${(track.bitrate / BITS_PER_MEGABIT).toFixed(1)} Mbps`;
  },

  /** "English · Stereo"; undeclared languages fall back to "Audio N". */
  audio(track: AudioTrack, index: number): string {
    return languageName(track.language, `Audio ${index + 1}`) + channelsSuffix(track.channels);
  },

  /** "English"; undeclared languages fall back to "Subtitles N". */
  text(track: TextTrack, index: number): string {
    return languageName(track.language, `Subtitles ${index + 1}`);
  },

  /** The audio-sync slot/stepper label: "0 ms", "+150 ms", "-150 ms". */
  sync(offsetMs: number): string {
    return offsetMs > 0 ? `+${offsetMs} ms` : `${offsetMs} ms`;
  },

  /** The CC quick-bar slot: "Off" until a text track is enabled. */
  subtitleSlot(snapshot: TrackSnapshot): string {
    const index = snapshot.texts.findIndex((t) => t.id === snapshot.selectedTextId);
    const track = snapshot.texts[index];
    return track === undefined ? 'Off' : TrackLabels.text(track, index);
  },

  /** The quick-bar resolution slot: "1280 × 720" or "—" while unknown. */
  resolutionSlot(details: StreamDetails | null): string {
    if (details === null || details.width <= 0 || details.height <= 0) return '—';
    return `${details.width} × ${details.height}`;
  },

  /** The quick-bar audio slot: "Mono" / "Stereo" / "Surround" or "—". */
  audioSlot(details: StreamDetails | null): string {
    const channels = details?.audioChannels ?? 0;
    return channels <= 0 ? '—' : channelsSuffix(channels).slice(3);
  },
};
