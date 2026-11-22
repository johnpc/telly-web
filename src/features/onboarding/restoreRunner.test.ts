import { describe, expect, it, vi } from 'vitest';
import { RestoreRunner, type RestoreRunnerDeps } from './restoreRunner';

const urls = ['http://host/one.m3u', 'http://host/two.m3u'];

function runner(overrides: Partial<RestoreRunnerDeps> = {}): { run: RestoreRunner; updated: string[][] } {
  const updated: string[][] = [];
  const run = new RestoreRunner({
    importJson: () => Promise.resolve(true),
    playlistUrls: () => Promise.resolve(urls),
    updatePlaylists: (list) => {
      updated.push(list);
      return Promise.resolve();
    },
    channelCount: () => Promise.resolve(31),
    ...overrides,
  });
  return { run, updated };
}

describe('RestoreRunner', () => {
  it('restores, re-fetches every playlist and reports channels landed', async () => {
    const { run, updated } = runner();
    expect(await run.restore('{}')).toBe(true);
    expect(updated).toEqual([urls]);
  });
  it('a rejected backup restores nothing', async () => {
    const { run, updated } = runner({ importJson: () => Promise.resolve(false) });
    expect(await run.restore('nope')).toBe(false);
    expect(updated).toEqual([]);
  });
  it('an import crash is contained', async () => {
    const { run, updated } = runner({ importJson: () => Promise.reject(new Error('boom')) });
    expect(await run.restore('{}')).toBe(false);
    expect(updated).toEqual([]);
  });
  it('no channels after the re-fetch is an honest failure, and re-fetch/count crashes are contained', async () => {
    const { run, updated } = runner({ channelCount: () => Promise.resolve(0) });
    expect(await run.restore('{}')).toBe(false);
    expect(updated).toEqual([urls]);
    const crashing = runner({
      updatePlaylists: vi.fn(() => Promise.reject(new Error('offline'))),
      channelCount: () => Promise.reject(new Error('db')),
    });
    expect(await crashing.run.restore('{}')).toBe(false);
  });
});
