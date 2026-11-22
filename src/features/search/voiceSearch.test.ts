import { describe, expect, it, vi } from 'vitest';
import { VOICE_UNAVAILABLE_MESSAGE, VoiceSearch, webSpeechLauncher } from './voiceSearch';

describe('VoiceSearch', () => {
  it('notifies when the platform has no recognizer', () => {
    const notify = vi.fn();
    const voice = new VoiceSearch(() => false, notify);
    voice.start();
    expect(notify).toHaveBeenCalledWith(VOICE_UNAVAILABLE_MESSAGE);
    expect(voice.current).toEqual({ kind: 'Idle' });
  });

  it('hands a transcript to the query exactly once and drops blank results', () => {
    const voice = new VoiceSearch((onResult) => {
      onResult('newsroom');
      return true;
    });
    const listener = vi.fn();
    voice.subscribe(listener);
    voice.start();
    expect(voice.snapshot()).toEqual({ kind: 'Transcript', text: 'newsroom' });
    expect(voice.consume()).toBe('newsroom');
    expect(voice.consume()).toBeNull();
    voice.onResult('   ');
    voice.onResult(null);
    expect(voice.current.kind).toBe('Idle');
    expect(listener).toHaveBeenCalled();
  });

  it('drives the Web Speech API when the browser exposes it', () => {
    const started = vi.fn();
    class FakeRecognition {
      lang = '';
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null = null;
      start(): void {
        started();
        this.onresult?.({ results: [[{ transcript: 'hello' }]] });
      }
    }
    const onResult = vi.fn();
    expect(webSpeechLauncher({ webkitSpeechRecognition: FakeRecognition })(onResult)).toBe(true);
    expect(started).toHaveBeenCalled();
    expect(onResult).toHaveBeenCalledWith('hello');
    expect(webSpeechLauncher({})(onResult)).toBe(false);
    const empty = new FakeRecognition();
    empty.onresult = (event) => onResult(event.results[0]?.[0]?.transcript ?? null);
    empty.onresult({ results: [] });
    expect(onResult).toHaveBeenLastCalledWith(null);
  });
});
