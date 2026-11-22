import { describe, expect, it, vi } from 'vitest';
import { AddPlaylistViewModel } from './addPlaylistViewModel';
import { finishEpg, pastePlaylistUrl, setEpgUrl } from './addPlaylistEpg';

const body =
  '#EXTM3U url-tvg="http://epg.example/g.xml"\n#EXTINF:-1 group-title="News",News One\nhttp://stream.example/1.ts\n';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

async function onEpgStep(
  persist = vi.fn(() => Promise.resolve()),
): Promise<{ vm: AddPlaylistViewModel; persist: typeof persist }> {
  const vm = new AddPlaylistViewModel({ fetchPlaylist: () => Promise.resolve(body), persist });
  vm.chooseType('M3U');
  vm.setUrl(' http://example.com/playlist.m3u ');
  vm.submitUrl();
  await flush();
  vm.confirm();
  return { vm, persist };
}

describe('addPlaylistEpg', () => {
  it('Done persists under the chosen name with the pre-filled EPG URL', async () => {
    const { vm, persist } = await onEpgStep();
    vm.setName(' My IPTV ');
    await finishEpg(vm);
    expect(vm.state.step).toBe('DONE');
    expect(persist).toHaveBeenCalledWith(
      'http://example.com/playlist.m3u',
      expect.objectContaining({ epgUrl: 'http://epg.example/g.xml' }),
      'My IPTV',
    );
  });

  it('an edited EPG URL overrides url-tvg; a blank one skips the EPG; a blank name derives', async () => {
    const { vm, persist } = await onEpgStep();
    setEpgUrl(vm, 'http://epg.example/other.xml');
    await finishEpg(vm);
    expect(persist).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ epgUrl: 'http://epg.example/other.xml' }),
      'example.com',
    );
    const blank = await onEpgStep();
    setEpgUrl(blank.vm, '   ');
    blank.vm.setName('  ');
    await finishEpg(blank.vm);
    expect(blank.persist).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ epgUrl: null }),
      null,
    );
  });

  it('rejects an invalid non-blank EPG URL and stays on the step', async () => {
    const { vm, persist } = await onEpgStep();
    setEpgUrl(vm, 'nope');
    await finishEpg(vm);
    expect(vm.state).toMatchObject({ step: 'EPG_URL', error: 'INVALID_URL' });
    expect(persist).not.toHaveBeenCalled();
    setEpgUrl(vm, '');
    expect(vm.state.error).toBeNull();
  });

  it('"Paste playlist URL" copies the playlist URL into the EPG draft', async () => {
    const { vm } = await onEpgStep();
    pastePlaylistUrl(vm);
    expect(vm.state.epgUrl).toBe('http://example.com/playlist.m3u');
  });

  it('is single-shot: SAVING ignores a second Done, and a failed write returns to the step', async () => {
    let release: () => void = () => undefined;
    const persist = vi.fn(() => new Promise<void>((resolve) => (release = resolve)));
    const { vm } = await onEpgStep(persist);
    const first = finishEpg(vm);
    expect(vm.state.step).toBe('SAVING');
    await finishEpg(vm);
    expect(persist).toHaveBeenCalledTimes(1);
    release();
    await first;
    expect(vm.state.step).toBe('DONE');
    const failing = await onEpgStep(vi.fn(() => Promise.reject(new Error('quota'))));
    await finishEpg(failing.vm);
    expect(failing.vm.state).toMatchObject({ step: 'EPG_URL', error: 'LOAD_FAILED' });
  });

  it('does nothing outside the EPG step', async () => {
    const persist = vi.fn(() => Promise.resolve());
    const vm = new AddPlaylistViewModel({ fetchPlaylist: () => Promise.resolve(body), persist });
    await finishEpg(vm);
    expect(persist).not.toHaveBeenCalled();
  });
});
