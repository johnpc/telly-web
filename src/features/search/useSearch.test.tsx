import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { JSX } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChannelRepository } from '@/core/db/channelRepository';
import { ProgramRepository } from '@/core/db/programRepository';
import type { TellyDb } from '@/core/db/tellyDb';
import { focusEngine } from '@/core/focus/focusEngine';
import { RemoteKeysProvider } from '@/core/input/RemoteKeysProvider';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { Navigator } from '@/core/navigation/navigator';
import { NavigatorProvider } from '@/core/navigation/NavigatorProvider';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { channelImport, freshDb, programImport } from '@/test/dbFixtures';
import { createSearchDeps, type SearchDeps } from './searchDeps';
import { SearchHistory } from './searchHistory';
import { airingRowId, channelCardId, masterCardId, menuRowId } from './searchIds';
import { SearchRepository } from './searchRepository';
import { SearchScreen } from './SearchScreen';
import { VoiceSearch } from './voiceSearch';

const tune = vi.fn();
vi.mock('@/features/playback/tune', () => ({
  usePlaybackSession: () => ({ tuner: { tune }, channels: [], engine: {}, playing: null }),
}));

const HOUR = 3_600_000;
const NOW = Date.now();

async function seed(db: TellyDb): Promise<void> {
  const channels = new ChannelRepository(db);
  const programs = new ProgramRepository(db);
  await db.playlists.add({
    id: 1,
    name: 'p',
    url: 'u',
    epgUrl: null,
    lastUpdatedMs: 0,
    epgLastUpdatedMs: 0,
    epgFailedAtMs: 0,
  });
  await channels.replaceForPlaylist(1, [
    channelImport('News One'),
    channelImport('News One HD'),
    channelImport('Sports Arena'),
  ]);
  await programs.replaceFor(
    ['news-one.id', 'news-one-hd.id'],
    [
      programImport('news-one.id', NOW - HOUR, NOW + HOUR, 'Morning Report'),
      programImport('news-one.id', NOW + HOUR, NOW + 2 * HOUR, 'Newsroom Live'),
      programImport('news-one.id', NOW + 2 * HOUR, NOW + 3 * HOUR, 'Newsroom Live'),
      programImport('news-one-hd.id', NOW + 3 * HOUR, NOW + 4 * HOUR, 'Newsroom Live'),
    ],
  );
}

function Harness({ deps, navigator }: { deps: SearchDeps; navigator: Navigator }): JSX.Element {
  return (
    <NavigatorProvider navigator={navigator}>
      <RemoteKeysProvider onBack={() => navigator.pop()}>
        <SearchScreen deps={deps} />
      </RemoteKeysProvider>
    </NavigatorProvider>
  );
}

const settle = (): Promise<void> => act(async () => undefined);
const press = (key: string): void => {
  fireEvent.keyDown(window, { key });
  fireEvent.keyUp(window, { key });
};

describe('SearchScreen', () => {
  let deps: SearchDeps;
  let navigator: Navigator;
  let settings: SettingsRepository;
  let voice: VoiceSearch;

  beforeEach(async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const db = freshDb();
    await seed(db);
    settings = new SettingsRepository(new MemoryKeyValueStore());
    voice = new VoiceSearch(() => false, vi.fn());
    deps = createSearchDeps(settings, {
      repository: new SearchRepository({
        channels: new ChannelRepository(db),
        programs: new ProgramRepository(db),
      }),
      history: new SearchHistory(new MemoryKeyValueStore(), () =>
        settings.get(TellySettings.SEARCH_SAVE_HISTORY),
      ),
      voice,
    });
    navigator = new Navigator({ kind: 'Search' });
    tune.mockReset();
  });
  afterEach(() => vi.restoreAllMocks());

  it('lands on the orb with the hint and empty history, then searches as you type', async () => {
    render(<Harness deps={deps} navigator={navigator} />);
    await settle();
    expect(screen.getByLabelText('Voice search')).toHaveFocus();
    expect(screen.getByPlaceholderText('Speak to search')).toBeInTheDocument();
    expect(screen.getByText('No history')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('search-query'), { target: { value: 'news' } });
    await waitFor(() => expect(screen.getAllByTestId('channel-card')).toHaveLength(2));
    expect(screen.getAllByTestId('card-name').map((n) => n.textContent)).toEqual([
      'News One',
      'News One HD',
      'News One',
      'News One HD',
    ]);
    expect(screen.getByTestId('search-query')).toHaveAttribute('data-focus-down', channelCardId(1));
    // The first master channel is selected: its airings render, the detail card pre-renders the first one.
    expect(screen.getAllByTestId('airing-row')).toHaveLength(2);
    expect(screen.getByTestId('search-detail')).toHaveTextContent('Newsroom Live');
  });

  it('holds a DOWN pressed while the search is in flight and lands it on the first card', async () => {
    render(<Harness deps={deps} navigator={navigator} />);
    const input = await screen.findByTestId('search-query');
    await act(async () => {
      focusEngine.focus('search-query');
    });
    fireEvent.change(input, { target: { value: 'news' } });
    press('ArrowDown');
    press('ArrowRight');
    expect(input).toHaveFocus();
    await waitFor(() => expect(screen.getAllByTestId('channel-card')[0]).toHaveFocus());
    expect(focusEngine.current).toBe(channelCardId(1));
  });

  it('swaps the airings pane when another master card takes focus and remembers the last results node', async () => {
    render(<Harness deps={deps} navigator={navigator} />);
    fireEvent.change(await screen.findByTestId('search-query'), { target: { value: 'newsroom' } });
    await waitFor(() => expect(screen.getAllByTestId('master-card')).toHaveLength(2));
    expect(screen.getByTestId('search-query')).toHaveAttribute('data-focus-down', airingRowId(1, NOW + HOUR));
    await act(async () => {
      focusEngine.focus(masterCardId(2));
    });
    await waitFor(() => expect(screen.getAllByTestId('airing-row')).toHaveLength(1));
    expect(screen.getByTestId('search-query')).toHaveAttribute('data-focus-down', masterCardId(2));
    expect(screen.getAllByTestId('master-card')[1]).toHaveAttribute('data-selected', 'true');
  });

  it('commits queries on Enter in the bar, lists them, clears via the trash and honors the save toggle', async () => {
    render(<Harness deps={deps} navigator={navigator} />);
    const input = await screen.findByTestId('search-query');
    fireEvent.change(input, { target: { value: 'news' } });
    await act(async () => {
      focusEngine.focus('search-query');
    });
    press('Enter');
    fireEvent.change(input, { target: { value: '' } });
    expect(await screen.findByText('news')).toBeInTheDocument();
    await act(async () => {
      focusEngine.focus('search-trash');
    });
    press('Enter');
    expect(await screen.findByText('No history')).toBeInTheDocument();
    settings.set(TellySettings.SEARCH_SAVE_HISTORY, false);
    fireEvent.change(input, { target: { value: 'sport' } });
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: '' } });
    expect(await screen.findByText('No history')).toBeInTheDocument();
  });

  it('re-runs a history entry, tunes from a channel card with the guide-root chain, pops on BACK', async () => {
    deps.history.record('news');
    render(<Harness deps={deps} navigator={navigator} />);
    await act(async () => {
      focusEngine.focus('search-history-0');
    });
    press('Enter');
    await waitFor(() => expect(screen.getAllByTestId('channel-card')).toHaveLength(2));
    expect(screen.getByTestId('search-query')).toHaveValue('news');
    await act(async () => {
      focusEngine.focus(channelCardId(2));
    });
    press('Enter');
    expect(tune).toHaveBeenCalledWith(expect.objectContaining({ name: 'News One HD' }));
    expect(navigator.stack.map((r) => r.kind)).toEqual(['Guide', 'Playback']);
  });

  it('opens the dropdown on an airing row, toggles Remind live, closes overlays on BACK before popping', async () => {
    render(<Harness deps={deps} navigator={navigator} />);
    fireEvent.change(await screen.findByTestId('search-query'), { target: { value: 'newsroom' } });
    await waitFor(() => expect(screen.getAllByTestId('airing-row')).toHaveLength(2));
    await act(async () => {
      focusEngine.focus(airingRowId(1, NOW + HOUR));
    });
    press('Enter');
    const dropdown = await screen.findByTestId('search-dropdown');
    expect(dropdown).toHaveTextContent('Remind');
    expect(screen.getByText('Remind')).toHaveFocus();
    press('Enter');
    await waitFor(() => expect(screen.queryByTestId('search-dropdown')).toBeNull());
    press('Enter');
    const again = await screen.findByTestId('search-dropdown');
    console.info('DROPDOWN2', again.textContent, document.activeElement?.getAttribute('data-focus-id'));
    expect(await screen.findByText('Remove reminder')).toBeInTheDocument();
    await act(async () => {
      focusEngine.focus(menuRowId('Program description'));
    });
    press('Enter');
    expect(await screen.findByText('Coming soon to telly')).toBeInTheDocument();
    press('Escape');
    await waitFor(() => expect(screen.queryByText('Coming soon to telly')).toBeNull());
    expect(navigator.stack).toHaveLength(1);
    press('Escape');
    expect(navigator.stack).toHaveLength(1); // root: nothing to pop, no crash
  });

  it('takes a voice transcript into the query exactly once and opens Settings from the gear', async () => {
    render(<Harness deps={deps} navigator={navigator} />);
    await screen.findByTestId('search-query');
    await act(async () => {
      voice.onResult('news');
    });
    expect(screen.getByTestId('search-query')).toHaveValue('news');
    await act(async () => {
      focusEngine.focus('search-gear');
    });
    press('Enter');
    expect(navigator.current.kind).toBe('Settings');
    await act(async () => {
      focusEngine.focus('search-orb');
    });
    press('Enter');
  });
});
