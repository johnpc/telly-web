import { describe, expect, it, vi } from 'vitest';
import { ChannelRepository } from '@/core/db/channelRepository';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { ParentalControls } from '@/core/settings/parentalControls';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { channelImport, freshDb } from '@/test/dbFixtures';
import { GuideSheetActions } from './guideSheetActions';

async function make() {
  const repository = new ChannelRepository(freshDb());
  await repository.replaceForPlaylist(1, [channelImport('News One')]);
  const [first] = await repository.forPlaylist(1);
  if (first === undefined) throw new Error('seed');
  const parental = new ParentalControls(new SettingsRepository(new MemoryKeyValueStore()));
  const zapAway = vi.fn();
  return {
    repository,
    first,
    parental,
    actions: new GuideSheetActions(repository, parental, zapAway),
    zapAway,
  };
}

describe('GuideSheetActions', () => {
  it('toggles favorites and hides after zapping away', async () => {
    const { repository, first, actions, zapAway } = await make();
    await actions.toggleFavorite(first);
    expect((await repository.byId(first.id))?.favorite).toBe(true);
    await actions.hide(first);
    expect(zapAway).toHaveBeenCalledWith(first);
    expect((await repository.byId(first.id))?.hidden).toBe(true);
  });
  it('sets a PIN first when none exists, then confirms it on later blocks', async () => {
    const { repository, first, actions, parental } = await make();
    expect(actions.blockMode()).toBe('Set a PIN');
    expect(await actions.submitBlockPin('1234', 'Set a PIN', first.id)).toBe(true);
    expect(parental.isEnabled).toBe(true);
    expect((await repository.byId(first.id))?.blocked).toBe(true);
    expect(actions.blockMode()).toBe('Enter PIN');
    expect(await actions.submitBlockPin('0000', 'Enter PIN', first.id)).toBe(false);
    expect(await actions.submitBlockPin('1234', 'Enter PIN', first.id)).toBe(true);
    expect((await repository.byId(first.id))?.blocked).toBe(false);
    expect(await actions.submitBlockPin('1234', 'Enter PIN', 999)).toBe(true);
  });
});
