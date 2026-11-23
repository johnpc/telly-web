import { describe, expect, it, vi } from 'vitest';
import { channel, program } from '../fixtures.test';
import { togglePanelMyList } from './panelMyList';

describe('togglePanelMyList', () => {
  it('toggles the airing programme and skips channels with nothing on', async () => {
    const toggle = vi.fn(async () => true);
    const airing = program('c1', 0, 10, 'Now');
    expect(await togglePanelMyList(channel(1), 5, async () => airing, toggle)).toBe(true);
    expect(toggle).toHaveBeenCalledWith(channel(1), expect.objectContaining({ title: 'Now', startMs: 0 }));
    expect(await togglePanelMyList(channel(1), 5, async () => null, toggle)).toBeNull();
    expect(toggle).toHaveBeenCalledTimes(1);
  });
});
