import { describe, expect, it, vi } from 'vitest';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { ParentalControls } from '@/core/settings/parentalControls';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { channel, fakeEngine, tunerOver } from '../fixtures.test';
import { BlockGate } from './blockGate';
import { BLOCK_PIN_TITLES, ChannelBlocker } from './channelBlocker';
import { TuneBlockPrompt } from './tuneBlockPrompt';

const blocked = channel(2, { blocked: true });

async function parentalWithPin(pin: string | null) {
  const parental = new ParentalControls(new SettingsRepository(new MemoryKeyValueStore()));
  if (pin !== null) await parental.setPin(pin);
  return parental;
}

describe('TuneBlockPrompt', () => {
  it('a verified PIN tunes the pending channel and fires onUnlocked; wrong PINs and dismiss never tune', async () => {
    const parental = await parentalWithPin('2468');
    const gate = new BlockGate(parental);
    const engine = fakeEngine();
    const tuner = tunerOver(engine, [channel(1), blocked], { gate });
    tuner.start();
    const unlocked = vi.fn();
    const dismissed = vi.fn();
    const prompt = new TuneBlockPrompt(gate, (c) => tuner.tune(c), unlocked, dismissed);
    expect(tuner.zap(+1)).toBe(false);
    expect(prompt.channel?.id).toBe(2);
    expect(await prompt.submit('0000')).toBe(false);
    expect(tuner.current?.id).toBe(1);
    expect(await prompt.submit('2468')).toBe(true);
    expect(tuner.current?.id).toBe(2);
    expect(unlocked).toHaveBeenCalledTimes(1);
    tuner.tune(channel(1));
    tuner.zap(+1);
    prompt.dismiss();
    expect(prompt.channel).toBeNull();
    expect(dismissed).toHaveBeenCalledTimes(1);
    expect(tuner.current?.id).toBe(1);
    const silent = new TuneBlockPrompt(gate, () => undefined);
    silent.dismiss();
    expect(await silent.submit('2468')).toBe(false);
  });
});

describe('ChannelBlocker', () => {
  it('sets a PIN first when none exists, then confirms it, flipping the flag on success', async () => {
    const parental = await parentalWithPin(null);
    const toggleBlocked = vi.fn(async () => undefined);
    const blocker = new ChannelBlocker({ toggleBlocked }, parental);
    expect(blocker.mode()).toBe('Setup');
    expect(BLOCK_PIN_TITLES[blocker.mode()]).toBe('Set a PIN');
    expect(await blocker.submit('2468', 'Setup', blocked)).toBe(true);
    expect(toggleBlocked).toHaveBeenCalledWith(blocked);
    expect(blocker.mode()).toBe('Confirm');
    expect(BLOCK_PIN_TITLES.Confirm).toBe('Enter PIN');
    expect(await blocker.submit('1111', 'Confirm', blocked)).toBe(false);
    expect(await blocker.submit('2468', 'Confirm', blocked)).toBe(true);
    expect(toggleBlocked).toHaveBeenCalledTimes(2);
    expect(await new ChannelBlocker({ toggleBlocked }).submit('2468', 'Setup', blocked)).toBe(false);
  });
});
