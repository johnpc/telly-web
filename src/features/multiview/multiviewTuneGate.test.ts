import { describe, expect, it, vi } from 'vitest';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { ParentalControls } from '@/core/settings/parentalControls';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { channel } from '@/features/playback/fixtures.test';
import { BlockGate } from '@/features/playback/gate/blockGate';
import { MultiviewTuneGate } from './multiviewTuneGate';

const blocked = channel(2, { blocked: true });

async function gateWithPin(pin: string): Promise<MultiviewTuneGate> {
  const parental = new ParentalControls(new SettingsRepository(new MemoryKeyValueStore()));
  await parental.setPin(pin);
  return new MultiviewTuneGate(new BlockGate(parental));
}

describe('MultiviewTuneGate', () => {
  it('runs open tunes at once and stashes a gated one until the PIN verifies, replaying it exactly once', async () => {
    const gate = await gateWithPin('2468');
    const action = vi.fn();
    gate.tune(channel(1), action);
    expect(action).toHaveBeenCalledWith(channel(1));
    expect(gate.promptOpen).toBe(false);
    gate.tune(blocked, action);
    expect(gate.prompt?.id).toBe(2);
    expect(gate.promptOpen).toBe(true);
    expect(gate.keyboardPin).toBe(false);
    expect(await gate.submit('1111')).toBe(false);
    expect(action).toHaveBeenCalledTimes(1);
    expect(await gate.submit('2468')).toBe(true);
    expect(action).toHaveBeenCalledTimes(2);
    expect(action).toHaveBeenLastCalledWith(blocked);
    expect(gate.promptOpen).toBe(false);
    gate.tune(blocked, action);
    expect(gate.promptOpen).toBe(true);
  });

  it('dismiss drops the stashed action; a verified PIN with nothing pending tunes nothing', async () => {
    const gate = await gateWithPin('2468');
    const action = vi.fn();
    const ticks = vi.fn();
    gate.subscribe(ticks);
    gate.tune(blocked, action);
    gate.dismiss();
    expect(gate.prompt).toBeNull();
    expect(ticks).toHaveBeenCalled();
    gate.tune(blocked, action);
    expect(await gate.submit('2468')).toBe(true);
    expect(action).toHaveBeenCalledTimes(1);
    gate.tune(blocked, action);
    const bare = new MultiviewTuneGate(new BlockGate());
    expect(await bare.submit('2468')).toBe(false);
  });
});
