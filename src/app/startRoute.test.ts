import { describe, expect, it } from 'vitest';
import { StartRoute } from './startRoute';

describe('StartRoute', () => {
  it('sends a fresh install to the welcome flow', () => {
    expect(new StartRoute().forChannelCount(0)).toEqual({ kind: 'Welcome' });
  });
  it('goes straight to playback when last-channel-on-start is on', () => {
    expect(new StartRoute(() => true).forChannelCount(3)).toEqual({ kind: 'Playback' });
  });
  it('lands on the untuned guide when last-channel-on-start is off', () => {
    const route = new StartRoute(() => false);
    expect(route.forChannelCount(3)).toEqual({ kind: 'Guide' });
    expect(route.guideTunesPreview()).toBe(false);
    expect(route.guideTunesPreview()).toBe(true);
  });
  it('hands the decision to exactly one guide', () => {
    const route = new StartRoute();
    route.decide(5);
    expect(route.claimForGuide()?.kind).toBe('Playback');
    expect(route.claimForGuide()).toBeNull();
  });
});
