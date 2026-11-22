import { describe, expect, it, vi } from 'vitest';
import { AddPlaylistViewModel, type WizardDeps } from './addPlaylistViewModel';

const playlistBody =
  '#EXTM3U url-tvg="http://epg.example/g.xml"\n' +
  '#EXTINF:-1 group-title="News",News One\nhttp://stream.example/1.ts\n' +
  '#EXTINF:-1 group-title="Kids",Kids Zone\nhttp://stream.example/2.ts\n' +
  '#EXTINF:-1 group-title="Movies",Big Film\nhttp://stream.example/film.mp4\n';

function viewModel(fetch: (url: string) => Promise<string> = () => Promise.resolve(playlistBody)): {
  vm: AddPlaylistViewModel;
  persist: ReturnType<typeof vi.fn>;
} {
  const persist = vi.fn(() => Promise.resolve());
  const deps: WizardDeps = { fetchPlaylist: fetch, persist };
  return { vm: new AddPlaylistViewModel(deps), persist };
}

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

async function processed(fetch?: (url: string) => Promise<string>): Promise<AddPlaylistViewModel> {
  const { vm } = viewModel(fetch);
  vm.chooseType('M3U');
  vm.setUrl('http://example.com/playlist.m3u');
  vm.submitUrl();
  await flush();
  return vm;
}

describe('AddPlaylistViewModel', () => {
  it('only choosing M3U advances to URL entry', () => {
    const { vm } = viewModel();
    vm.chooseType('XTREAM_CODES');
    vm.chooseType('STALKER_PORTAL');
    expect(vm.state.step).toBe('TYPE_CHOOSER');
    vm.chooseType('M3U');
    expect(vm.state.step).toBe('URL_ENTRY');
  });

  it('rejects a non-http URL and clears the error on edit', () => {
    const { vm } = viewModel();
    vm.chooseType('M3U');
    vm.setUrl('ftp://example.com/playlist.m3u');
    vm.submitUrl();
    expect(vm.state).toMatchObject({ step: 'URL_ENTRY', error: 'INVALID_URL' });
    vm.setUrl('http://example.com/playlist.m3u');
    expect(vm.state.error).toBeNull();
  });

  it('ignores submit outside the URL step', () => {
    const { vm } = viewModel();
    vm.setUrl('http://example.com/playlist.m3u');
    vm.submitUrl();
    expect(vm.state.step).toBe('TYPE_CHOOSER');
  });

  it('fetches, parses and lands on the processed step without persisting', async () => {
    const { vm, persist } = viewModel();
    vm.chooseType('M3U');
    vm.setUrl('http://example.com/playlist.m3u');
    vm.submitUrl();
    expect(vm.state.step).toBe('PROCESSING');
    await flush();
    expect(vm.state).toMatchObject({
      step: 'PROCESSED',
      name: 'example.com',
      liveCount: 2,
      movieCount: 1,
      groupCount: 3,
      kind: 'TV',
    });
    expect(persist).not.toHaveBeenCalled();
  });

  it('reports a load failure for an unreachable URL and for a playlist without channels', async () => {
    const failed = await processed(() => Promise.reject(new Error('HTTP 404')));
    expect(failed.state).toMatchObject({ step: 'URL_ENTRY', error: 'LOAD_FAILED' });
    const empty = await processed(() => Promise.resolve('<html>not an m3u</html>'));
    expect(empty.state).toMatchObject({ step: 'URL_ENTRY', error: 'LOAD_FAILED' });
  });

  it('drops a load that BACK cancelled while processing', async () => {
    let resolve: (body: string) => void = () => undefined;
    const { vm } = viewModel(() => new Promise<string>((r) => (resolve = r)));
    vm.chooseType('M3U');
    vm.setUrl('http://example.com/playlist.m3u');
    vm.submitUrl();
    expect(vm.back()).toBe(true);
    expect(vm.state.step).toBe('URL_ENTRY');
    resolve(playlistBody);
    await flush();
    expect(vm.state.step).toBe('URL_ENTRY');
    expect(vm.parsed).toBeNull();
  });

  it('confirming the processed step opens the EPG step with url-tvg pre-filled', async () => {
    const vm = await processed();
    vm.setName('My IPTV');
    vm.chooseKind('VOD');
    vm.confirm();
    expect(vm.state).toMatchObject({ step: 'EPG_URL', epgUrl: 'http://epg.example/g.xml', kind: 'VOD' });
    vm.confirm();
    expect(vm.state.step).toBe('EPG_URL');
  });

  it('BACK walks one step at a time and leaves from the first', async () => {
    const vm = await processed();
    vm.confirm();
    expect(vm.back()).toBe(true);
    expect(vm.state.step).toBe('PROCESSED');
    expect(vm.back()).toBe(true);
    expect(vm.state.step).toBe('URL_ENTRY');
    expect(vm.parsed).toBeNull();
    expect(vm.back()).toBe(true);
    expect(vm.state.step).toBe('TYPE_CHOOSER');
    expect(vm.back()).toBe(false);
  });

  it('swallows BACK while saving and from DONE', () => {
    const { vm } = viewModel();
    vm.patch({ step: 'SAVING' });
    expect(vm.back()).toBe(true);
    expect(vm.state.step).toBe('SAVING');
    vm.patch({ step: 'DONE' });
    expect(vm.back()).toBe(false);
  });
});
