import { describe, expect, it } from 'vitest';
import { activate, catchupPlayable } from './guideActivation';
import { DAY_MS } from './guideGeometry';
import { HOUR, ORIGIN, cell, channel, row } from './testFixtures';

const catchup = channel(1, { catchupType: 'default', catchupSource: 'http://a/{utc}', catchupDays: 2 });
const past = cell(ORIGIN - 2 * HOUR, ORIGIN - HOUR);

describe('guideActivation', () => {
  it('plays the archive only for a fully aired real programme inside the horizon', () => {
    expect(catchupPlayable(catchup, past, ORIGIN)).toBe(true);
    expect(catchupPlayable(catchup, { ...past, program: null }, ORIGIN)).toBe(false);
    expect(catchupPlayable(catchup, cell(ORIGIN - HOUR, ORIGIN + HOUR), ORIGIN)).toBe(false);
    expect(catchupPlayable(catchup, cell(ORIGIN - 3 * DAY_MS, ORIGIN - 3 * DAY_MS + HOUR), ORIGIN)).toBe(
      false,
    );
    expect(catchupPlayable(channel(2), past, ORIGIN)).toBe(false);
  });
  it('resolves OK to PlayCatchup with the built URL, else PlayChannel', () => {
    const r = row(catchup, ORIGIN, 1);
    expect(activate(r, past, ORIGIN)).toEqual({
      kind: 'PlayCatchup',
      channel: catchup,
      url: `http://a/${(ORIGIN - 2 * HOUR) / 1000}`,
    });
    expect(activate(r, cell(ORIGIN, ORIGIN + HOUR), ORIGIN)).toEqual({
      kind: 'PlayChannel',
      channel: catchup,
    });
    const broken = row(
      channel(3, { catchupType: 'xc', catchupDays: 2, streamUrl: 'http://h/odd' }),
      ORIGIN,
      1,
    );
    expect(activate(broken, past, ORIGIN).kind).toBe('PlayChannel');
  });
});
