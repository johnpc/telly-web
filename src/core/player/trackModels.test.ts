import { describe, expect, it } from 'vitest';
import { languageOrNull, NO_TRACKS } from './trackModels';

describe('track models', () => {
  it('normalises undeclared languages to null', () => {
    expect(languageOrNull('en')).toBe('en');
    expect(languageOrNull('und')).toBeNull();
    expect(languageOrNull(' ')).toBeNull();
    expect(languageOrNull(undefined)).toBeNull();
  });

  it('the empty snapshot has Auto video, no audio pick and captions off', () => {
    expect(NO_TRACKS.videoOverrideId).toBeNull();
    expect(NO_TRACKS.selectedAudioId).toBeNull();
    expect(NO_TRACKS.selectedTextId).toBeNull();
  });
});
