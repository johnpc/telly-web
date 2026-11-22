# AGENTS.md — how agents (and humans) work in telly-web

Read [CLAUDE.md](CLAUDE.md) first (charter, gates, decisions log). This is the
operating manual on top of it.

## 1. Parity is checked, not assumed

The Android app (`~/repo/telly`) is the reference. Before building a slice, read
its Kotlin slice (`app/src/main/java/com/johncorser/telly/features/<slice>`), its
`.feature` file and the relevant rows in its `docs/state-machines.md`; port the
behaviour, the state names and the copy. When the web platform forces a
difference, write it into the `.feature` as a scenario and into the decisions log.

## 2. Reliability: there is no such thing as a flaky test

1. Do not re-run to green. Read `test-results/` (trace, video, screenshot).
2. Fix the race, not the symptom: wait on a real condition (`expect(locator)`,
   a `data-state` attribute, a `video` event), never a fixed sleep.
3. Pin it in the shared harness (`e2e/steps/world.ts`), add a unit test when
   the race is in logic.
4. Never loosen: no raised timeouts, no `test.skip`, no `retries`.

## 3. Keyboard only

Acceptance steps press keys (`page.keyboard.press`) — never `locator.click()` in
a step that models the remote. A step may read the DOM to assert, but every
_action_ is a key. If something cannot be reached by arrows + Enter + Escape,
that is the bug.

## 4. Verification

- Unit + gates: `npm run quality` (fast on this Mac).
- Acceptance: `E2E_TAG=<area> npm run e2e`; `E2E_VIDEO=1` keeps a video for
  every scenario under `test-results/`.
- Side-by-side with Android: `scripts/side-by-side.sh <area>` records the web
  scenario(s) here and the Android app on the Mac mini's `telly-tv36` emulator
  (pointed at the public demo playlist), then stacks them with ffmpeg into
  `artifacts/side-by-side-<area>.mp4`. Look at it before calling a UI slice done.
- Mac mini rules (shared with the other repos): check `pgrep -fl Runner.Worker`
  before booting the emulator; one emulator at a time; never `sudo`.

## 5. The fake backend

`e2e/fixtures/gen-fixtures.mjs` is the SAME generator as the Android repo (31
channels / 6 groups / 7-day EPG / catch-up on News One / HLS live / 2 VOD).
`npm run fixtures` writes a self-contained site to `e2e/fixtures/site/`;
`e2e/fixtures/serve.mjs` serves it on `127.0.0.1:8090` with CORS and Range.
The public twin is `https://johnpc.github.io/telly/playlist.m3u`. Never put
anything private in `e2e/fixtures/`.

## 6. Conventions in brief

- Conventional commits; PR title `type(scope): what`; recording on UI PRs.
- Components `*Screen.tsx` render only; hooks `use*.ts`; logic `*.ts` + `*.test.ts`.
- Every slice starts as a `.feature` and is mapped in the CI matrix.
- Finish the whole job: gate green, acceptance leg green, recording looked at,
  state-machine catalog + decisions log updated.
