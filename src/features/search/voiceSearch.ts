// The mic orb's voice-input seam (port of Android `VoiceSearch`): `start`
// launches the platform recognizer — on the web the Web Speech API
// (`webkitSpeechRecognition`) where the browser ships one — and a browser
// without one degrades to `notify`. A recognized transcript lands in the
// mailbox for the search screen to consume into the query exactly once.
// @stateMachine('Voice search mailbox')
export type VoiceMailbox = { kind: 'Idle' } | { kind: 'Transcript'; text: string };

export const VOICE_UNAVAILABLE_MESSAGE = 'Voice search is not available on this device';

/** Starts a recognition; false when the platform has none. */
export type VoiceLauncher = (onResult: (text: string | null) => void) => boolean;

interface SpeechRecognitionLike {
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  start(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

/** The Web Speech API, when the browser exposes it. */
export function webSpeechLauncher(
  global: object = typeof window === 'undefined' ? {} : window,
): VoiceLauncher {
  return (onResult) => {
    const ctor = (global as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
    if (ctor === undefined) return false;
    const recognition = new ctor();
    recognition.lang = typeof navigator === 'undefined' ? 'en-US' : navigator.language;
    recognition.onresult = (event) => onResult(event.results[0]?.[0]?.transcript ?? null);
    recognition.start();
    return true;
  };
}

export class VoiceSearch {
  private state: VoiceMailbox = { kind: 'Idle' };
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly launch: VoiceLauncher = webSpeechLauncher(),
    private readonly notify: (message: string) => void = (message) => console.info(message),
  ) {}

  get current(): VoiceMailbox {
    return this.state;
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly snapshot = (): VoiceMailbox => this.state;

  /** Orb OK: launch the recognizer, or say why nothing happened. */
  start(): void {
    if (!this.launch((text) => this.onResult(text))) this.notify(VOICE_UNAVAILABLE_MESSAGE);
  }

  /** The recognizer's result; blank/cancelled results are dropped. */
  onResult(text: string | null): void {
    if (text === null || text.trim() === '') return;
    this.set({ kind: 'Transcript', text });
  }

  /** Hands the transcript to the query exactly once. */
  consume(): string | null {
    if (this.state.kind !== 'Transcript') return null;
    const { text } = this.state;
    this.set({ kind: 'Idle' });
    return text;
  }

  private set(state: VoiceMailbox): void {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
}
