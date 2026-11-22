import { describe, expect, it } from 'vitest';
import { INITIAL_WIZARD_STATE, WIZARD_ERROR_TEXT, channelCount } from './wizardState';

describe('wizardState', () => {
  it('starts on the type chooser with empty drafts', () => {
    expect(INITIAL_WIZARD_STATE.step).toBe('TYPE_CHOOSER');
    expect(INITIAL_WIZARD_STATE.url).toBe('');
    expect(INITIAL_WIZARD_STATE.kind).toBe('TV');
    expect(channelCount(INITIAL_WIZARD_STATE)).toBe(0);
  });
  it('counts live + movies and carries the Android error copy', () => {
    expect(channelCount({ liveCount: 31, movieCount: 2 })).toBe(33);
    expect(WIZARD_ERROR_TEXT.INVALID_URL).toBe('Enter a valid http(s) URL');
    expect(WIZARD_ERROR_TEXT.LOAD_FAILED).toBe('Could not load the playlist. Check the URL and try again.');
  });
});
