import { strToU8 } from 'fflate';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgramRepository } from '@/core/db/programRepository';
import type { TellyDb } from '@/core/db/tellyDb';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { fixture } from '@/test/fixtureSite';
import { freshDb } from '@/test/dbFixtures';
import { EpgRefresher } from './epgRefresher';
import { defaultEpgSourceDeps, refreshEpgSource, toProgramImports } from './epgRepository';
import { createEpgRefresher } from './epgWiring';

describe('refreshEpgSource', () => {
  let db: TellyDb;
  beforeEach(() => {
    db = freshDb();
  });
  afterEach(() => db.delete());

  it('downloads, parses (gzip) and stores the fixture guide with replace semantics', async () => {
    const programs = new ProgramRepository(db);
    const trace: string[] = [];
    const deps = defaultEpgSourceDeps('', {
      fetchBytes: async () => fixture('epg.xml.gz'),
      programs,
      trace: (m) => trace.push(m),
    });
    expect(await refreshEpgSource('http://e/epg.xml.gz', deps)).toBe(930);
    expect(await programs.count()).toBe(930);
    expect(trace[1]).toContain('parsed 930 programmes');
    const newsOneRows = (await programs.window(['news-one-1.fixture'], 0, Number.MAX_SAFE_INTEGER)).length;
    // A second document for one channel replaces only that channel's rows.
    const xml = `<tv><programme start="20260101000000 +0000" stop="20260101010000 +0000" channel="news-one-1.fixture">
      <title>Alt</title><desc>Dropped</desc></programme></tv>`;
    const alt = { ...deps, fetchBytes: async () => strToU8(xml), storeDescriptions: () => false };
    expect(await refreshEpgSource('http://e/alt.xml', alt)).toBe(1);
    const rows = await programs.window(['news-one-1.fixture'], 0, Number.MAX_SAFE_INTEGER);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ title: 'Alt', description: null });
    expect(await programs.count()).toBe(930 - newsOneRows + 1);
  });

  it('maps documents to rows, honouring the descriptions toggle', () => {
    const doc = {
      channels: [],
      programs: [
        {
          channelId: 'c',
          startMs: 1,
          endMs: 2,
          details: { title: 'T', subTitle: null, description: 'D', category: null, episode: null },
        },
      ],
    };
    expect(toProgramImports(doc, true)[0]).toMatchObject({ channelTvgId: 'c', description: 'D' });
    expect(toProgramImports(doc, false)[0]).toMatchObject({ description: null });
  });

  it('defaultEpgSourceDeps fetches through the proxy with the global fetch', async () => {
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => new Response(String(input)));
    const bytes = await defaultEpgSourceDeps('https://cors/').fetchBytes('http://e/x.xml');
    expect(new TextDecoder().decode(bytes)).toBe('https://cors/http%3A%2F%2Fe%2Fx.xml');
    expect(defaultEpgSourceDeps('').storeDescriptions()).toBe(true);
    defaultEpgSourceDeps('').trace('noop');
    vi.unstubAllGlobals();
  });

  it('createEpgRefresher wires settings live and accepts overrides', async () => {
    const settings = new SettingsRepository(new MemoryKeyValueStore());
    settings.set(TellySettings.EPG_UPDATE_INTERVAL_HOURS, 2);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const refresher = createEpgRefresher(settings, {
      playlists: {
        all: async () => [],
        markEpgFailed: async () => 0,
        markEpgUpdated: async () => 0,
      } as never,
      trim: async () => 0,
    });
    expect(refresher).toBeInstanceOf(EpgRefresher);
    expect(await refresher.refreshDue()).toEqual([]);
    warn.mockRestore();
  });
});
