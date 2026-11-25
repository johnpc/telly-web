// Buffer-gate steps for the real-time-paced fixture leg (@playback-throttled).
// The user only presses keys (the tune steps live in playback.steps.ts); these
// steps MEASURE through a probe installed before the app loads: every
// `video-surface` data-state transition with the buffered runway at that
// instant, a 250 ms sample of (state, runway), and the element's `waiting`
// events. No sleeps — each step waits on the first frame (data-state Playing)
// or on the playhead having advanced, then reads the recorded facts.
import type { Page } from '@playwright/test';
import { Before, Given, Then, FIXTURE_HOST, expect } from './world';

interface Transition {
  t: number;
  state: string;
  /** Seconds buffered beyond the playhead at that instant. */
  ahead: number;
  position: number;
}

interface Sample {
  t: number;
  state: string;
  ahead: number;
}

interface RunwayProbe {
  transitions: Transition[];
  samples: Sample[];
  /** `performance.now()` of every `waiting` event on the element. */
  waits: number[];
}

declare global {
  interface Window {
    __runwayProbe?: RunwayProbe;
  }
}

const EMPTY_PROBE: RunwayProbe = { transitions: [], samples: [], waits: [] };
const VIDEO = 'video[data-testid="video-surface"]';
const FIRST_FRAME_TIMEOUT_MS = 30_000;

/** Runs in the page before any app script: records what the <video> does. */
function installRunwayProbe(): void {
  const probe: RunwayProbe = { transitions: [], samples: [], waits: [] };
  window.__runwayProbe = probe;
  const aheadOf = (video: HTMLVideoElement): number => {
    const { buffered, currentTime } = video;
    for (let i = buffered.length - 1; i >= 0; i -= 1) {
      if (buffered.start(i) <= currentTime + 0.25) return Math.max(0, buffered.end(i) - currentTime);
    }
    return 0;
  };
  let adopted: HTMLVideoElement | null = null;
  const adopt = (video: HTMLVideoElement): void => {
    if (adopted === video) return;
    adopted = video;
    video.addEventListener('waiting', () => probe.waits.push(performance.now()));
  };
  const isSurface = (node: Node): node is HTMLVideoElement =>
    node instanceof HTMLVideoElement && node.dataset.testid === 'video-surface';
  new MutationObserver((records) => {
    for (const record of records) {
      if (!isSurface(record.target)) continue;
      adopt(record.target);
      probe.transitions.push({
        t: performance.now(),
        state: record.target.dataset.state ?? '',
        ahead: aheadOf(record.target),
        position: record.target.currentTime,
      });
    }
    // `document` itself: an init script runs before `documentElement` exists.
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-state'] });
  setInterval(() => {
    const video = document.querySelector('video[data-testid="video-surface"]');
    if (!(video instanceof HTMLVideoElement)) return;
    adopt(video);
    probe.samples.push({ t: performance.now(), state: video.dataset.state ?? '', ahead: aheadOf(video) });
  }, 250);
}

/** The tune under measurement: its first non-Playing transition and the Playing one that ended it. */
interface Tune {
  start: Transition;
  playing: Transition;
  /** Indices of `start` and `playing` in the probe's transitions. */
  startIndex: number;
  index: number;
}

let tune: Tune | null = null;

Before({ tags: '@playback-throttled' }, async ({ page }) => {
  tune = null;
  await page.addInitScript(installRunwayProbe);
});

const readProbe = (page: Page): Promise<RunwayProbe> =>
  page.evaluate((empty) => window.__runwayProbe ?? empty, EMPTY_PROBE);

/** The run of non-Playing transitions that ends at `index`, as a Tune. */
function tuneEndingAt(transitions: Transition[], index: number): Tune | null {
  let first = index;
  while (first > 0 && transitions[first - 1]?.state !== 'Playing') first -= 1;
  const start = transitions[first];
  const playing = transitions[index];
  return start === undefined || playing === undefined || first === index
    ? null
    : { start, playing, startIndex: first, index };
}

/** Index of the first transition of the run the probe is in: the run's start, or `length` when the last one is Playing. */
function runStart(transitions: Transition[]): number {
  let first = transitions.length;
  while (first > 0 && transitions[first - 1]?.state !== 'Playing') first -= 1;
  return first;
}

/**
 * The tune in progress when this step begins (its first frame still to come) or, when the surface is
 * already Playing, the NEXT tune — the one a preceding zap step has just requested. Cached for the
 * scenario so later measurement steps read the same tune.
 */
async function resolveTune(page: Page): Promise<Tune> {
  if (tune !== null) return tune;
  const from = runStart((await readProbe(page)).transitions);
  let found: Tune | null = null;
  await expect
    .poll(
      async () => {
        const { transitions } = await readProbe(page);
        const index = transitions.findIndex((x, i) => i >= from && x.state === 'Playing');
        found = index < 0 ? null : tuneEndingAt(transitions, index);
        return found !== null;
      },
      {
        timeout: FIRST_FRAME_TIMEOUT_MS,
        message: 'a first frame (video-surface data-state Playing) after the tune',
      },
    )
    .toBe(true);
  if (found === null) throw new Error('unreachable: tune resolved without a record');
  tune = found;
  return found;
}

/** The Playing transition the surface is in right now (a preceding step already waited for the first frame). */
async function currentPlaying(page: Page): Promise<Tune> {
  if (tune !== null) return tune;
  const { transitions } = await readProbe(page);
  const index = transitions.length - 1;
  const last = transitions[index];
  expect(last?.state, 'the video surface must be Playing when the watch starts').toBe('Playing');
  const found = tuneEndingAt(transitions, index);
  if (found === null) throw new Error('the probe saw no tune before this Playing transition');
  tune = found;
  return found;
}

Given(
  'the fixture server paces streams at real-time rate with a {int} second pre-roll burst',
  async ({ world }, prerollSec: number) => {
    const response = await world.page.request.get(`${FIXTURE_HOST}/streams/news-one.ts`, {
      headers: { Range: 'bytes=0-1503' },
    });
    expect(response.status(), 'the sniff range must still be honoured').toBe(206);
    expect(
      response.headers()['x-fixture-throttle'],
      `this leg needs the fixture server started with FIXTURE_THROTTLE=realtime FIXTURE_PREROLL_SEC=${prerollSec} (npm run e2e:throttled)`,
    ).toBe(`realtime; preroll=${prerollSec}`);
  },
);

Then(
  'the video surface stays Buffering for at least {int} seconds before the first frame',
  async ({ world }, seconds: number) => {
    const { start, playing, startIndex, index } = await resolveTune(world.page);
    const { transitions } = await readProbe(world.page);
    const run = transitions.slice(startIndex, index).map((x) => x.state);
    expect(run, 'the wait is the gate holding, not a reconnect or an error').toContain('Buffering');
    expect(run.filter((s) => s !== 'Buffering' && s !== 'Idle')).toEqual([]);
    expect((playing.t - start.t) / 1000, 'seconds from the tune to the first frame').toBeGreaterThanOrEqual(
      seconds,
    );
  },
);

Then(
  'the first frame plays with at least {int} seconds of runway buffered',
  async ({ world }, seconds: number) => {
    const { playing } = await resolveTune(world.page);
    expect(playing.ahead, 'seconds buffered beyond the playhead at the first frame').toBeGreaterThanOrEqual(
      seconds,
    );
  },
);

Then(
  'the buffered runway passes {int} seconds while the video surface is still Buffering',
  async ({ world }, seconds: number) => {
    const { start, playing } = await resolveTune(world.page);
    const { samples } = await readProbe(world.page);
    const held = samples.filter((s) => s.t >= start.t && s.t < playing.t && s.state === 'Buffering');
    expect(
      Math.max(0, ...held.map((s) => s.ahead)),
      `the deepest runway sampled while the gate still held (${held.length} samples)`,
    ).toBeGreaterThanOrEqual(seconds);
  },
);

Then('playback runs for {int} seconds without rebuffering', async ({ world }, seconds: number) => {
  const { page } = world;
  const { playing, index } = await currentPlaying(page);
  // The real condition: the playhead has moved `seconds` of media past the first frame (1x pipe ⇒ ~that long in wall time).
  await expect
    .poll(() => page.locator(VIDEO).evaluate((v: HTMLVideoElement) => v.currentTime), {
      timeout: seconds * 1000 + 20_000,
      message: `${seconds} s of media played`,
    })
    .toBeGreaterThanOrEqual(playing.position + seconds);
  const { transitions, waits } = await readProbe(page);
  expect(
    waits.filter((t) => t > playing.t),
    '`waiting` events after the first frame',
  ).toEqual([]);
  expect(
    transitions.slice(index + 1).map((x) => x.state),
    'data-state changes after the first frame',
  ).toEqual([]);
  await expect(page.getByTestId('video-surface')).toHaveAttribute('data-state', 'Playing');
});
