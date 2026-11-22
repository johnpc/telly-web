import { describe, expect, it } from 'vitest';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { ParentalControls, RELOCK_UNTIL_RESTART } from '@/core/settings/parentalControls';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { channel } from '../fixtures.test';
import { BlockGate } from './blockGate';
import { BlockSession } from './blockSession';
import { watchRelock } from './parentalRelock';
import { createPlaybackGate } from './playbackGate';

const blocked = channel(2, { blocked: true });

async function setup(relock = 'Always require') {
  const settings = new SettingsRepository(new MemoryKeyValueStore({ parental_relock: relock }));
  const session = new BlockSession();
  const parental = new ParentalControls(settings, { relock: () => session.relock() });
  await parental.setPin('2468');
  const gate = new BlockGate(parental, session);
  return { settings, session, parental, gate };
}

describe('BlockGate', () => {
  it('lets open channels through and prompts for a blocked one until the PIN verifies', async () => {
    const { gate } = await setup();
    let ticks = 0;
    gate.subscribe(() => (ticks += 1));
    expect(gate.intercept(channel(1))).toBe(false);
    expect(gate.current).toEqual({ kind: 'Ungated' });
    expect(gate.intercept(blocked)).toBe(true);
    expect(gate.current).toEqual({ kind: 'Prompting', channel: blocked });
    expect(gate.prompt?.id).toBe(2);
    expect(await gate.unlock('1111')).toBeNull();
    expect(gate.prompt?.id).toBe(2);
    expect((await gate.unlock('2468'))?.id).toBe(2);
    expect(gate.current).toEqual({ kind: 'PassOnce', id: 2 });
    expect(gate.intercept(blocked)).toBe(false);
    expect(gate.intercept(blocked)).toBe(true);
    expect(ticks).toBeGreaterThan(3);
  });

  it('dismiss cancels the prompt and a dismissed/absent prompt never unlocks', async () => {
    const { gate } = await setup();
    gate.intercept(blocked);
    gate.dismiss();
    expect(gate.prompt).toBeNull();
    gate.dismiss();
    expect(await gate.unlock('2468')).toBeNull();
    const bare = new BlockGate();
    expect(bare.intercept(blocked)).toBe(false);
    expect(bare.keyboardPin).toBe(false);
    expect(await bare.unlock('2468')).toBeNull();
  });

  it('"Until app restart" unlocks the shared session; parental off or a new PIN relocks it', async () => {
    const { gate, session, parental, settings } = await setup(RELOCK_UNTIL_RESTART);
    gate.intercept(blocked);
    await gate.unlock('2468');
    expect(session.current).toBe('Unlocked');
    gate.intercept(blocked);
    expect(gate.intercept(blocked)).toBe(false);
    expect(gate.current).toEqual({ kind: 'SessionUnlocked' });
    parental.setEnabled(false);
    expect(session.unlocked).toBe(false);
    expect(gate.intercept(blocked)).toBe(true);
    gate.dismiss();
    session.unlock();
    const stop = watchRelock(settings, session);
    settings.set(TellySettings.PARENTAL_ENABLED, true);
    expect(session.unlocked).toBe(true);
    settings.set(TellySettings.PARENTAL_PIN_HASH, 'other');
    expect(session.unlocked).toBe(false);
    session.unlock();
    settings.set(TellySettings.PARENTAL_ENABLED, false);
    expect(session.unlocked).toBe(false);
    stop();
    session.unlock();
    settings.set(TellySettings.PARENTAL_ENABLED, false);
    expect(session.unlocked).toBe(true);
    settings.set(TellySettings.PARENTAL_PIN_INPUT_METHOD, 'Keyboard');
    expect(gate.keyboardPin).toBe(true);
  });

  it('createPlaybackGate bundles the session, parental policy and gate over one repository', async () => {
    const settings = new SettingsRepository(new MemoryKeyValueStore());
    const bundle = createPlaybackGate(settings);
    await bundle.parental.setPin('1234');
    expect(bundle.gate.intercept(blocked)).toBe(true);
    bundle.session.unlock();
    bundle.parental.setEnabled(false);
    expect(bundle.session.unlocked).toBe(false);
  });
});
