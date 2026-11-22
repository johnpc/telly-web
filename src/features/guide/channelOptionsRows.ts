import { type ChannelRow, displayName } from '@/core/db/types';
import { type ToolRow, action, toggle, value } from '@/features/groups/toolRows';
import { decoderLabel, externalEffective, offsetLabel } from './channelOptionsValues';

/** Row ids of the "Channel options" sub-pane (Android `GuideChannelOptions`). */
export const OPTION = {
  NAME: 'channel_options.name',
  RESTORE_NAME: 'channel_options.restore_name',
  NAMES_EDITOR: 'channel_options.names_editor',
  AUDIO_DECODER: 'channel_options.audio_decoder',
  VIDEO_DECODER: 'channel_options.video_decoder',
  EXTERNAL_PLAYER: 'channel_options.external_player',
  EPG_OFFSET: 'channel_options.epg_offset',
  BLOCK: 'channel_options.block',
  HIDE: 'channel_options.hide',
} as const;

/** Rows of the pane (captures 41-42), summaries rendering the CURRENT per-channel state. */
export function channelOptionRows(channel: ChannelRow, externalDefault: boolean): ToolRow[] {
  const rows: ToolRow[] = [value(OPTION.NAME, 'Channel name', displayName(channel))];
  if (channel.customName !== null && channel.customName.trim() !== '') {
    rows.push(value(OPTION.RESTORE_NAME, 'Restore channel name', channel.name));
  }
  rows.push(
    value(OPTION.NAMES_EDITOR, 'Channel names editor'),
    value(OPTION.AUDIO_DECODER, 'Audio decoder', decoderLabel(channel.audioDecoder)),
    value(OPTION.VIDEO_DECODER, 'Video decoder', decoderLabel(channel.videoDecoder)),
    toggle(OPTION.EXTERNAL_PLAYER, 'Use external player', externalEffective(channel, externalDefault)),
    value(OPTION.EPG_OFFSET, 'EPG time offset, h:min', offsetLabel(channel.epgOffsetMinutes)),
    action(OPTION.BLOCK, channel.blocked ? 'Unblock channel' : 'Block channel'),
    action(OPTION.HIDE, 'Hide channel'),
  );
  return rows;
}
