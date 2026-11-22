import type { ChannelOverrides } from '@/core/db/types';
import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { type ToolRow, value } from '@/features/groups/toolRows';

/** "Default" = no per-channel override; the global setting applies. */
export const FOLLOW_GLOBAL = 'Default';

export const DECODER_OPTIONS: readonly string[] = [FOLLOW_GLOBAL, 'Hardware', 'Software'];

export function decoderLabel(raw: string | null): string {
  return raw ?? FOLLOW_GLOBAL;
}

/** The stored override behind a picked label (null = follow global). */
export function decoderRawOf(picked: string): string | null {
  return picked === FOLLOW_GLOBAL ? null : picked;
}

/** "h:min" with a leading minus for negative offsets ("0:00", "-1:30"). */
export function offsetLabel(minutes: number): string {
  const magnitude = Math.abs(minutes);
  return `${minutes < 0 ? '-' : ''}${Math.floor(magnitude / 60)}:${String(magnitude % 60).padStart(2, '0')}`;
}

/** -12:00 .. +12:00 in 30-minute steps (raw = the minutes). */
export const OFFSET_OPTIONS: readonly { label: string; raw: string }[] = Array.from(
  { length: 49 },
  (_, i) => {
    const minutes = (i - 24) * 30;
    return { label: offsetLabel(minutes), raw: String(minutes) };
  },
);

/** The global Playback → "Use external player" setting as a boolean default. */
export function externalDefaultOf(settings: SettingsRepository): boolean {
  return settings.get(TellySettings.USE_EXTERNAL_PLAYER) !== 'Off';
}

/** The toggle's checked state: per-channel override > global setting ("On"/"Off" raw). */
export function externalEffective(
  overrides: Pick<ChannelOverrides, 'externalPlayer'>,
  globalOn: boolean,
): boolean {
  const raw = overrides.externalPlayer;
  return raw === null ? globalOn : raw === 'On';
}

/** The raw the open picker should check for the channel's current state. */
export function pickerRows(kind: ChannelOptionsPicker, overrides: ChannelOverrides): ToolRow[] {
  if (kind === 'EPG time offset, h:min') {
    return OFFSET_OPTIONS.map((o) =>
      value(o.raw, o.label, null, Number(o.raw) === overrides.epgOffsetMinutes),
    );
  }
  const current = decoderLabel(kind === 'Audio decoder' ? overrides.audioDecoder : overrides.videoDecoder);
  return DECODER_OPTIONS.map((o) => value(o, o, null, o === current));
}

/** The three picker rows and their sheets' titles. */
export type ChannelOptionsPicker = 'Audio decoder' | 'Video decoder' | 'EPG time offset, h:min';
