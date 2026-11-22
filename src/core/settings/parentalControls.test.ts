import { describe, expect, it, vi } from 'vitest';
import { MemoryKeyValueStore } from '../kv/memoryKeyValueStore';
import { ParentalControls, RELOCK_UNTIL_RESTART } from './parentalControls';
import { SettingsRepository } from './settingsRepository';
import { TellySettings } from './tellySettings';

function setup(initial: Record<string, string> = {}) {
  const settings = new SettingsRepository(new MemoryKeyValueStore(initial));
  const relock = vi.fn();
  const controls = new ParentalControls(settings, { relock, random: (n) => new Uint8Array(n).fill(1) });
  return { settings, relock, controls };
}

describe('ParentalControls', () => {
  it('stores a salted hash, never the PIN, and verifies it', async () => {
    const { settings, controls, relock } = setup();
    expect(controls.hasPin).toBe(false);
    await controls.setPin('1234');
    expect(controls.hasPin).toBe(true);
    expect(settings.get(TellySettings.PARENTAL_PIN_SALT)).toBe('01'.repeat(16));
    expect(settings.snapshot()).not.toMatchObject({ parental_pin_hash: '1234' });
    expect(await controls.verifyPin('1234')).toBe(true);
    expect(await controls.verifyPin('0000')).toBe(false);
    expect(relock).toHaveBeenCalledTimes(1);
  });

  it('disabling relocks; enabling does not', () => {
    const { controls, relock } = setup();
    controls.setEnabled(true);
    expect(controls.isEnabled).toBe(true);
    expect(relock).not.toHaveBeenCalled();
    controls.setEnabled(false);
    expect(relock).toHaveBeenCalledTimes(1);
  });

  it('locks groups only when enabled and not in channels-only mode', () => {
    const { settings, controls } = setup();
    controls.setGroupLocked('Adult', true);
    expect(controls.isGroupLocked('Adult')).toBe(false);
    controls.setEnabled(true);
    expect(controls.isGroupLocked('Adult')).toBe(true);
    expect(controls.isGroupLocked('News')).toBe(false);
    settings.set(TellySettings.PARENTAL_CHANNELS_ONLY, true);
    expect(controls.isGroupLocked('Adult')).toBe(false);
    controls.setGroupLocked('Adult', false);
    expect(settings.get(TellySettings.PARENTAL_LOCKED_GROUPS).size).toBe(0);
  });

  it('gates settings and playlists per their toggles', () => {
    const { settings, controls } = setup({ parental_enabled: 'true' });
    expect(controls.isSettingsLocked()).toBe(false);
    expect(controls.isPlaylistsLocked()).toBe(false);
    settings.set(TellySettings.PARENTAL_REQUIRE_FOR_SETTINGS, true);
    settings.set(TellySettings.PARENTAL_REQUIRE_FOR_PLAYLISTS, true);
    expect(controls.isSettingsLocked()).toBe(true);
    expect(controls.isPlaylistsLocked()).toBe(true);
  });

  it('reads the input method and relock policy', () => {
    const { settings, controls } = setup();
    expect(controls.usesKeyboardPin).toBe(false);
    settings.set(TellySettings.PARENTAL_PIN_INPUT_METHOD, 'KEYBOARD');
    expect(controls.usesKeyboardPin).toBe(true);
    expect(controls.relocksAfterUnlock()).toBe(true);
    settings.set(TellySettings.PARENTAL_RELOCK, RELOCK_UNTIL_RESTART);
    expect(controls.relocksAfterUnlock()).toBe(false);
  });

  it('works without injected deps', async () => {
    const controls = new ParentalControls(new SettingsRepository(new MemoryKeyValueStore()));
    await controls.setPin('1');
    controls.setEnabled(false);
    expect(await controls.verifyPin('1')).toBe(true);
  });
});
