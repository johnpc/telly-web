// Helpers the player tests use to drive a jsdom `<video>` like a real one:
// jsdom leaves `play/pause/load` unimplemented and most media properties
// read-only, so tests stub the prototype and define the readings they need.

export function stubMediaPlayback(): void {
  const proto = HTMLMediaElement.prototype;
  proto.play = () => Promise.resolve();
  proto.pause = () => undefined;
  proto.load = () => undefined;
}

export function fire(target: EventTarget, type: string): void {
  target.dispatchEvent(new Event(type));
}

export function defineReadOnly<T>(target: object, key: string, value: T): void {
  Object.defineProperty(target, key, { configurable: true, get: () => value });
}

export function fakeTimeRanges(ranges: [number, number][]): TimeRanges {
  return {
    length: ranges.length,
    start: (i: number) => ranges[i]?.[0] ?? 0,
    end: (i: number) => ranges[i]?.[1] ?? 0,
  };
}
