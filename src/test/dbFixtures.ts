import { TellyDb } from '@/core/db/tellyDb';
import type { ChannelImport } from '@/core/db/channelReplace';
import type { ProgramImport } from '@/core/db/programRepository';

let counter = 0;

/** A fresh, isolated database per test (fake-indexeddb is global in setup.ts). */
export function freshDb(): TellyDb {
  counter += 1;
  return new TellyDb(`telly-test-${counter}-${Date.now()}`);
}

export function channelImport(name: string, overrides: Partial<ChannelImport> = {}): ChannelImport {
  return {
    name,
    groupTitle: 'News',
    logoUrl: null,
    streamUrl: `http://x/${name.toLowerCase().replace(/\s+/g, '-')}.ts`,
    tvgId: `${name.toLowerCase().replace(/\s+/g, '-')}.id`,
    catchupType: null,
    catchupSource: null,
    catchupDays: null,
    ...overrides,
  };
}

export function programImport(
  channelTvgId: string,
  startMs: number,
  endMs: number,
  title = 'Show',
): ProgramImport {
  return {
    channelTvgId,
    startMs,
    endMs,
    title,
    subTitle: null,
    description: null,
    category: null,
    episode: null,
  };
}
