import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ChannelRow } from '@/core/db/types';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { SharedPlayerEngine, type PlayerEngine } from '@/core/player';
import { createPlaybackDeps } from './playbackDeps';
import { usePlaybackSession } from './usePlaybackSession';

const channel = { id: 1, name: 'A', streamUrl: 'http://x/a.ts', tvgId: 'a' } as ChannelRow;

function Probe({ deps }: { deps: ReturnType<typeof createPlaybackDeps> }) {
  const session = usePlaybackSession(deps);
  if (session === null) return <div>loading</div>;
  return (
    <button onClick={() => session.tuner.start()}>
      {session.channels.length} channels · {session.playing?.kind ?? 'none'}
    </button>
  );
}

describe('usePlaybackSession', () => {
  it('leases the engine, feeds the channel list and reflects the tuned stream', async () => {
    const engine = { load: vi.fn(), stop: vi.fn(), release: vi.fn() } as unknown as PlayerEngine & {
      release(): void;
    };
    const shared = new SharedPlayerEngine(() => engine);
    const deps = createPlaybackDeps({
      shared: shared as never,
      store: new MemoryKeyValueStore(),
      recordWatch: async () => undefined,
    });
    deps.channels = async () => [channel];
    render(<Probe deps={deps} />);
    expect(await screen.findByText('1 channels · none')).toBeInTheDocument();
    expect(shared.leaseCount).toBe(1);
    await act(async () => screen.getByRole('button').click());
    expect(await screen.findByText('1 channels · Live')).toBeInTheDocument();
    expect(engine.load).toHaveBeenCalledWith('http://x/a.ts', { live: true });
  });
});
