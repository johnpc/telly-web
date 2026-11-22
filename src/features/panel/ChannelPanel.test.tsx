import { act, render, screen, waitFor } from '@testing-library/react';
import { useEffect, type JSX } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChannelRepository } from '@/core/db/channelRepository';
import { CustomGroupRepository } from '@/core/db/customGroupRepository';
import { ProgramRepository } from '@/core/db/programRepository';
import type { TellyDb } from '@/core/db/tellyDb';
import type { ChannelRow } from '@/core/db/types';
import { focusEngine } from '@/core/focus/focusEngine';
import { rectOf } from '@/core/focus/testLayout';
import { RemoteKeysProvider } from '@/core/input/RemoteKeysProvider';
import type { KeyRouter } from '@/core/input/keyRouter';
import { useKeyRouter } from '@/core/input/keyRouterContext';
import type { RemoteKey } from '@/core/input/remoteKeys';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import type { PlayerEngine } from '@/core/player';
import { ParentalControls } from '@/core/settings/parentalControls';
import { SettingsContext } from '@/core/settings/settingsContext';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import type { PlaybackSession, TuneController } from '@/features/playback/tune';
import { freshDb, programImport } from '@/test/dbFixtures';
import { ChannelPanel } from './ChannelPanel';
import type { PanelDeps } from './panelDeps';
import { ProgramTimes } from '@/features/playback/info/programTimes';
import { testChannel } from './testChannels';

const NOW = Date.UTC(2026, 8, 13, 14, 45);
const channels: ChannelRow[] = [
  testChannel(1, 'News One', 'News'),
  testChannel(2, 'News Two', 'News', { blocked: true }),
  testChannel(3, 'Sports Arena', 'Sports', { favorite: true, favoriteOrder: 1 }),
  testChannel(4, 'Sports Extra', 'Sports', { logoUrl: 'http://x/sa.png' }),
  testChannel(5, 'Music Box', 'Music'),
];

let db: TellyDb;
let settings: SettingsRepository;
let deps: PanelDeps;
let router: KeyRouter;
const tune = vi.fn();
const onClose = vi.fn();
const onTuned = vi.fn();
const onContextMenu = vi.fn();

function Probe(): null {
  const current = useKeyRouter();
  useEffect(() => {
    router = current;
  }, [current]);
  return null;
}

function session(playingIndex = 0): PlaybackSession {
  const channel = channels[playingIndex];
  return {
    engine: {} as PlayerEngine,
    tuner: { tune } as unknown as TuneController,
    channels,
    playing: channel === undefined ? null : { kind: 'Live', channel },
  };
}

function Harness({ playing = 0 }: { playing?: number }): JSX.Element {
  return (
    <SettingsContext value={settings}>
      <RemoteKeysProvider onBack={() => undefined}>
        <Probe />
        <ChannelPanel
          session={session(playing)}
          onClose={onClose}
          onTuned={onTuned}
          onContextMenu={onContextMenu}
          deps={deps}
        />
      </RemoteKeysProvider>
    </SettingsContext>
  );
}

/** jsdom has no layout: groups stack in a left column, rows in a right one, both in DOM order. */
function layout(this: Element): DOMRect {
  const id = this.getAttribute('data-focus-id') ?? '';
  const column = id.startsWith('panel-row-')
    ? 'panel-row-'
    : id.startsWith('panel-group-')
      ? 'panel-group-'
      : null;
  if (column === null) return rectOf({ x: 0, y: 0, w: 0, h: 0 });
  const siblings = [...document.querySelectorAll(`[data-focus-id^="${column}"]`)];
  return rectOf({ x: column === 'panel-row-' ? 500 : 0, y: siblings.indexOf(this) * 80, w: 400, h: 78 });
}

const settle = (): Promise<void> => act(async () => undefined);
const press = async (key: RemoteKey): Promise<void> => {
  await act(async () => {
    router.dispatch(key);
  });
};
const focused = (): string | null => focusEngine.current;
const row = (id: number): HTMLElement => screen.getByTestId(`panel-row-${id}`);

describe('ChannelPanel', () => {
  beforeEach(async () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(layout);
    Element.prototype.scrollIntoView = vi.fn();
    db = freshDb();
    settings = new SettingsRepository(new MemoryKeyValueStore());
    const programs = new ProgramRepository(db);
    const minute = 60_000;
    await programs.replaceFor(
      ['tvg-1', 'tvg-3'],
      [
        {
          ...programImport('tvg-1', NOW - 15 * minute, NOW + 60 * minute, 'Business Hour'),
          description: 'All-new episode.',
        },
        programImport('tvg-1', NOW + 60 * minute, NOW + 90 * minute, 'Newsroom Live'),
        programImport('tvg-3', NOW - 30 * minute, NOW + 30 * minute, 'Match of the Day'),
      ],
    );
    deps = {
      guide: { programs, channels: new ChannelRepository(db) },
      customGroups: new CustomGroupRepository(db),
      parental: (s) => new ParentalControls(s),
      now: () => NOW,
    };
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    await db.delete();
  });

  it('opens on the playing channel with groups, rows, now-playing data and the detail card', async () => {
    render(<Harness playing={2} />);
    await settle();
    expect(screen.getByTestId('channel-panel')).toHaveStyle({ backgroundColor: 'rgba(19, 22, 25, 0.68)' });
    expect(screen.getByTestId('panel-clock')).toHaveTextContent(/Sep 13/);
    expect([...screen.getByTestId('panel-groups').children].map((g) => g.textContent)).toEqual([
      'Favorites',
      'All channels',
      'News',
      'Sports',
      'Music',
    ]);
    expect(screen.getByTestId('panel-group-All channels')).toHaveAttribute('data-selected', 'true');
    expect(focused()).toBe('panel-row-3');
    expect(row(3)).toHaveAttribute('data-focused', 'true');
    expect(row(3)).toHaveAttribute('data-playing', 'true');
    await waitFor(() => expect(row(1)).toHaveTextContent('Business Hour'));
    expect(row(1).querySelector('[data-testid="row-number"]')).toHaveTextContent('1');
    expect(row(1).querySelector('[data-testid="progress-bar"] > span')).toHaveStyle({ width: '20%' });
    expect(row(2).querySelector('[data-testid="blocked-lock"]')).not.toBeNull();
    expect(screen.getByAltText('Sports Extra logo')).toHaveAttribute('src', 'http://x/sa.png');
    const detail = screen.getByTestId('panel-detail');
    expect(detail).toHaveTextContent('Match of the Day');
    expect(detail).toHaveTextContent(
      ProgramTimes.range(NOW - 30 * 60_000, NOW + 30 * 60_000, { is24h: false }),
    );
    expect(detail).toHaveTextContent('30 min');
    expect(detail).toHaveTextContent('Sports');
    expect(row(3).parentElement).toContainElement(detail);
  });

  it('moves the detail card with focus, wraps at both ends and hands LEFT to the selected group', async () => {
    render(<Harness />);
    await settle();
    expect(focused()).toBe('panel-row-1');
    await waitFor(() => expect(screen.getByTestId('panel-detail')).toHaveTextContent('All-new episode.'));
    await press('DOWN');
    expect(focused()).toBe('panel-row-2');
    expect(row(2).parentElement).toContainElement(screen.getByTestId('panel-detail'));
    await press('UP');
    await press('UP');
    expect(focused()).toBe('panel-row-5');
    await press('DOWN');
    expect(focused()).toBe('panel-row-1');
    await press('LEFT');
    expect(focused()).toBe('panel-group-All channels');
    await press('RIGHT');
    expect(focused()).toBe('panel-row-1');
  });

  it('OK on a group renumbers from one, remembers focus per group, and favorites follow their order', async () => {
    render(<Harness />);
    await settle();
    await press('DOWN');
    await press('DOWN');
    await press('DOWN');
    expect(focused()).toBe('panel-row-4');
    await act(async () => focusEngine.focus('panel-group-Sports'));
    await press('OK');
    expect(screen.getByTestId('channel-panel')).toHaveAttribute('data-group', 'Sports');
    expect(screen.getByTestId('panel-group-Sports')).toHaveAttribute('data-selected', 'true');
    expect(focused()).toBe('panel-row-3');
    expect(row(3).querySelector('[data-testid="row-number"]')).toHaveTextContent('1');
    expect(row(4).querySelector('[data-testid="row-number"]')).toHaveTextContent('2');
    await press('DOWN');
    await act(async () => focusEngine.focus('panel-group-Favorites'));
    await press('OK');
    expect(screen.getAllByTestId(/^panel-row-/).map((r) => r.dataset.testid)).toEqual(['panel-row-3']);
    await act(async () => focusEngine.focus('panel-group-All channels'));
    await press('OK');
    expect(focused()).toBe('panel-row-4');
    await act(async () => focusEngine.focus('panel-group-Sports'));
    await press('OK');
    expect(focused()).toBe('panel-row-4');
    await press('OK');
    expect(focused()).toBe('panel-row-4');
  });

  it('OK tunes and reports, long-OK opens the context menu, BACK closes', async () => {
    render(<Harness />);
    await settle();
    await press('DOWN');
    await press('OK');
    expect(tune).toHaveBeenCalledWith(channels[1]);
    expect(onTuned).toHaveBeenCalledWith(channels[1]);
    await press('LONG_OK');
    expect(onContextMenu).toHaveBeenCalledWith(channels[1]);
    await act(async () => focusEngine.focus('panel-group-News'));
    await press('LONG_OK');
    expect(onContextMenu).toHaveBeenCalledTimes(1);
    await press('BACK');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('honours Appearance -> Groups and custom groups', async () => {
    settings.set(TellySettings.SHOW_FAVORITES_GROUP, false);
    const custom = new CustomGroupRepository(db);
    const id = await custom.insertGroup('My Picks');
    await custom.insertMembers([{ groupId: id, channelKey: 'tvg-5' }]);
    render(<Harness />);
    await settle();
    await waitFor(() => expect(screen.getByTestId('panel-group-My Picks')).toBeInTheDocument());
    expect(screen.queryByTestId('panel-group-Favorites')).toBeNull();
    expect(screen.getByTestId('panel-group-My Picks')).toHaveAttribute('data-focus-right', 'panel-row-1');
    await act(async () => focusEngine.focus('panel-group-My Picks'));
    await press('OK');
    expect(screen.getAllByTestId(/^panel-row-/).map((r) => r.dataset.testid)).toEqual(['panel-row-5']);
  });

  it('a locked group prompts for the PIN; wheels dial it, a wrong PIN stays, BACK dismisses', async () => {
    const parental = new ParentalControls(settings);
    parental.setEnabled(true);
    await parental.setPin('2468');
    parental.setGroupLocked('Music', true);
    render(<Harness />);
    await settle();
    expect(
      screen.getByTestId('panel-group-Music').querySelector('[data-testid="group-lock"]'),
    ).not.toBeNull();
    await act(async () => focusEngine.focus('panel-group-Music'));
    await press('OK');
    expect(screen.getByTestId('panel-pin-prompt')).toHaveTextContent('Enter PIN');
    expect(screen.getByTestId('channel-panel')).toHaveAttribute('data-group', 'All channels');
    expect(focused()).toBe('pin-wheels');
    await press('UP');
    await press('OK');
    await settle();
    expect(screen.getByTestId('panel-pin-prompt')).toBeInTheDocument();
    expect(screen.getAllByTestId('pin-wheel').map((w) => w.textContent)).toEqual(['0', '0', '0', '0']);
    for (const digit of [2, 4, 6, 8]) await press({ kind: 'DIGIT', digit });
    await press('LEFT');
    await press('DOWN');
    await press('UP');
    expect(screen.getAllByTestId('pin-wheel').map((w) => w.textContent)).toEqual(['2', '4', '6', '8']);
    await press('OK');
    await waitFor(() => expect(screen.queryByTestId('panel-pin-prompt')).toBeNull());
    expect(screen.getByTestId('channel-panel')).toHaveAttribute('data-group', 'Music');
    expect(focused()).toBe('panel-row-5');
    await act(async () => focusEngine.focus('panel-group-Music'));
    parental.setGroupLocked('News', true);
    await act(async () => focusEngine.focus('panel-group-News'));
    await press('OK');
    expect(screen.getByTestId('panel-pin-prompt')).toBeInTheDocument();
    await press('BACK');
    expect(screen.queryByTestId('panel-pin-prompt')).toBeNull();
    expect(screen.getByTestId('channel-panel')).toHaveAttribute('data-group', 'Music');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('the keyboard PIN method types a masked PIN and submits on the fourth digit', async () => {
    const parental = new ParentalControls(settings);
    parental.setEnabled(true);
    await parental.setPin('2468');
    parental.setGroupLocked('Music', true);
    settings.set(TellySettings.PARENTAL_PIN_INPUT_METHOD, 'Keyboard');
    render(<Harness />);
    await settle();
    await act(async () => focusEngine.focus('panel-group-Music'));
    await press('OK');
    const input = screen.getByTestId<HTMLInputElement>('pin-input');
    expect(input).toHaveFocus();
    await press('UP');
    expect(input.value).toBe('');
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(input, { target: { value: '24x' } });
    expect(input.value).toBe('24');
    fireEvent.change(input, { target: { value: '2468' } });
    await waitFor(() => expect(screen.queryByTestId('panel-pin-prompt')).toBeNull());
    expect(screen.getByTestId('channel-panel')).toHaveAttribute('data-group', 'Music');
  });

  it('a session with nothing playing opens on the first row', async () => {
    render(<Harness playing={9} />);
    await settle();
    expect(focused()).toBe('panel-row-1');
    expect(screen.queryByText('▶')).toBeNull();
  });
});
