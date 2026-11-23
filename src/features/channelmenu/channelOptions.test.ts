import { describe, expect, it } from 'vitest';
import { ChannelRepository } from '@/core/db/channelRepository';
import { channelImport, freshDb } from '@/test/dbFixtures';
import { type ChannelOptionsDialog, ChannelOptionsController } from './channelOptionsController';
import { type ChannelOptionsHost, dialogHostOf } from './channelOptionsHost';
import { OPTION, channelOptionRows } from './channelOptionsRows';
import {
  DECODER_OPTIONS,
  OFFSET_OPTIONS,
  decoderRawOf,
  externalDefaultOf,
  externalEffective,
  offsetLabel,
  pickerRows,
} from './channelOptionsValues';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { channel } from '@/features/guide/testFixtures';

async function seeded() {
  const db = freshDb();
  const repository = new ChannelRepository(db);
  await repository.replaceForPlaylist(1, [channelImport('News One'), channelImport('Sports')]);
  const [first] = await repository.forPlaylist(1);
  if (first === undefined) throw new Error('seed');
  return { repository, first };
}

describe('channelOptionsValues', () => {
  it('formats offsets, decoders and the external toggle', () => {
    expect(offsetLabel(0)).toBe('0:00');
    expect(offsetLabel(-90)).toBe('-1:30');
    expect(OFFSET_OPTIONS).toHaveLength(49);
    expect(OFFSET_OPTIONS[0]).toEqual({ label: '-12:00', raw: '-720' });
    expect(decoderRawOf('Default')).toBeNull();
    expect(decoderRawOf('Software')).toBe('Software');
    expect(externalEffective({ externalPlayer: null }, true)).toBe(true);
    expect(externalEffective({ externalPlayer: 'Off' }, true)).toBe(false);
    expect(DECODER_OPTIONS).toEqual(['Default', 'Hardware', 'Software']);
  });
  it('builds the picker rows with the current value checked', () => {
    const c = channel(1, { audioDecoder: 'Software', epgOffsetMinutes: 30 });
    expect(pickerRows('Audio decoder', c).find((r) => r.kind === 'value' && r.selected)?.id).toBe('Software');
    expect(pickerRows('Video decoder', c).find((r) => r.kind === 'value' && r.selected)?.id).toBe('Default');
    expect(pickerRows('EPG time offset, h:min', c).find((r) => r.kind === 'value' && r.selected)?.id).toBe(
      '30',
    );
  });
  it('lists the pane rows, Restore only while renamed, Block flipping on blocked', () => {
    const plain = channelOptionRows(channel(1), false).map((r) => r.id);
    expect(plain).toEqual([
      OPTION.NAME,
      OPTION.NAMES_EDITOR,
      OPTION.AUDIO_DECODER,
      OPTION.VIDEO_DECODER,
      OPTION.EXTERNAL_PLAYER,
      OPTION.EPG_OFFSET,
      OPTION.BLOCK,
      OPTION.HIDE,
    ]);
    const renamed = channelOptionRows(channel(1, { customName: 'Mine', blocked: true }), true);
    expect(renamed[1]).toMatchObject({ id: OPTION.RESTORE_NAME, summary: 'Ch 1' });
    expect(renamed.find((r) => r.id === OPTION.BLOCK)).toMatchObject({ title: 'Unblock channel' });
    expect(renamed.find((r) => r.id === OPTION.EXTERNAL_PLAYER)).toMatchObject({ checked: true });
  });
});

/** A host whose single layer is the pane: the dialog lives on it. */
function fakeHost(): { host: ChannelOptionsHost; layer: () => OptionsPane } {
  let current: OptionsPane = { kind: 'ChannelOptions', channelId: 1, dialog: null };
  const host = dialogHostOf(
    () => current,
    (layer) => {
      current = { ...current, dialog: layer.dialog };
    },
  );
  return { host, layer: () => current };
}

interface OptionsPane {
  kind: 'ChannelOptions';
  channelId: number;
  dialog: ChannelOptionsDialog | null;
}

describe('ChannelOptionsController', () => {
  it('a host whose layer is not the pane has no dialog and ignores dialog writes', () => {
    const host = dialogHostOf<{ kind: 'Grid' }>(
      () => ({ kind: 'Grid' }),
      () => {
        throw new Error('must not show');
      },
    );
    expect(host.dialog()).toBeNull();
    host.showDialog({ kind: 'Rename', channelId: 1, initial: 'x' });
  });
  it('opens and answers the rename and picker dialogs, writing partial overrides', async () => {
    const { repository, first } = await seeded();
    const { host, layer } = fakeHost();
    const options = new ChannelOptionsController(repository, () => false, host);
    expect(options.onRow(first, OPTION.NAME)).toBeNull();
    expect(layer().dialog).toMatchObject({ kind: 'Rename' });
    expect(options.dialog).toMatchObject({ kind: 'Rename', initial: 'News One' });
    options.submitRename('  Headlines ');
    expect(options.dialog).toBeNull();
    expect((await repository.byId(first.id))?.customName).toBe('Headlines');
    options.onRow(first, OPTION.EPG_OFFSET);
    options.choose('30');
    options.onRow(first, OPTION.AUDIO_DECODER);
    options.choose('Software');
    options.onRow(first, OPTION.VIDEO_DECODER);
    options.choose('Default');
    options.onRow(first, OPTION.EPG_OFFSET);
    options.choose('nope');
    const fresh = await repository.byId(first.id);
    expect(fresh).toMatchObject({
      epgOffsetMinutes: 30,
      audioDecoder: 'Software',
      videoDecoder: null,
      customName: 'Headlines',
    });
    options.submitRename('x');
    options.choose('x');
    expect(options.closeDialog()).toBe(false);
  });
  it('restores the name, toggles the external player off the fresh row, and hands effects to the host', async () => {
    const { repository, first } = await seeded();
    const options = new ChannelOptionsController(repository, () => true, fakeHost().host);
    options.onRow(first, OPTION.RESTORE_NAME);
    options.onRow(first, OPTION.EXTERNAL_PLAYER);
    await new Promise((r) => setTimeout(r, 20));
    expect((await repository.byId(first.id))?.externalPlayer).toBe('Off');
    options.onRow(first, OPTION.EXTERNAL_PLAYER);
    await new Promise((r) => setTimeout(r, 20));
    expect((await repository.byId(first.id))?.externalPlayer).toBe('On');
    expect(options.onRow(first, OPTION.BLOCK)).toBe('BLOCK');
    expect(options.onRow(first, OPTION.HIDE)).toBe('HIDE');
    expect(options.onRow(first, OPTION.NAMES_EDITOR)).toBe('NAMES_EDITOR');
    expect(options.onRow(first, 'unknown')).toBeNull();
    options.onRow(first, OPTION.NAME);
    expect(options.closeDialog()).toBe(true);
    options.submitRename('');
  });
  it('reads the global external-player default off the settings', () => {
    const settings = new SettingsRepository(new MemoryKeyValueStore());
    expect(externalDefaultOf(settings)).toBe(false);
    settings.set(TellySettings.USE_EXTERNAL_PLAYER, 'On');
    expect(externalDefaultOf(settings)).toBe(true);
  });
});
