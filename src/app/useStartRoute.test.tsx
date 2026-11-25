import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { channelRepository } from '@/core/db/channelRepository';
import { tellyDb } from '@/core/db/tellyDb';
import { Navigator } from '@/core/navigation/navigator';
import { NavigatorContext } from '@/core/navigation/navigatorContext';
import { channelImport } from '@/test/dbFixtures';
import { AppDepsContext } from './appContext';
import { StartRoute } from './startRoute';
import { useStartRoute } from './useStartRoute';

/** Mounts the hook on a `Boot` navigator and returns that navigator to watch where it lands. */
function mount(startRoute: StartRoute): Navigator {
  const navigator = new Navigator({ kind: 'Boot' });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NavigatorContext value={navigator}>
      <AppDepsContext value={{ startRoute }}>{children}</AppDepsContext>
    </NavigatorContext>
  );
  renderHook(() => useStartRoute(), { wrapper });
  return navigator;
}

describe('useStartRoute', () => {
  afterEach(() => tellyDb.channels.clear());

  it('leaves Boot for the welcome flow once the empty channel count resolves', async () => {
    const navigator = mount(new StartRoute());
    expect(navigator.current).toEqual({ kind: 'Boot' });
    await waitFor(() => expect(navigator.current).toEqual({ kind: 'Welcome' }));
  });

  it('lands a ?channel= link on fullscreen playback of that channel, remembered as the last channel', async () => {
    await channelRepository.replaceForPlaylist(1, [channelImport('News One'), channelImport('Movie House')]);
    const remembered: number[] = [];
    const startRoute = new StartRoute(
      () => false,
      { kind: 'Channel', query: 'movie house' },
      (id) => remembered.push(id),
    );
    const navigator = mount(startRoute);
    await waitFor(() => expect(navigator.current).toEqual({ kind: 'Playback' }));
    const movieHouse = (await channelRepository.all()).find((channel) => channel.name === 'Movie House');
    expect(remembered).toEqual([movieHouse?.id]);
    expect(startRoute.notice).toEqual({ kind: 'None' });
  });

  it('follows the plain policy and leaves the notice when the link names nobody', async () => {
    await channelRepository.replaceForPlaylist(1, [channelImport('News One')]);
    const startRoute = new StartRoute(() => false, { kind: 'Channel', query: 'Nope' });
    const navigator = mount(startRoute);
    await waitFor(() => expect(navigator.current).toEqual({ kind: 'Guide' }));
    expect(startRoute.notice).toEqual({ kind: 'NoSuchChannel', query: 'Nope' });
  });
});
