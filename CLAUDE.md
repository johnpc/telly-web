# telly-web — project charter

telly-web is the web port of [`telly`](https://github.com/johnpc/telly) (Android TV,
Kotlin/Compose) and sibling of [`telly-apple`](https://github.com/johnpc/telly-apple):
a TiviMate-style IPTV player that runs in a browser. **Feature parity with the
Android app is the product bar**, verified side-by-side against telly running on the
Android TV emulator. No backend, no accounts, no premium tier.

## The one product rule: remote-first

The main form factor is a TV driven by a remote (TV browsers, Xbox Edge, Fire TV,
a laptop plugged into a TV). **Every screen, overlay, picker and dialog is fully
operable with arrow keys + OK + BACK alone.** The pointer and touch are a courtesy
layer for mobile web "in a pinch" — nothing may exist that only a mouse can reach.

| Remote key | Web keys (`KeyboardEvent.key`)                                                     |
| ---------- | ---------------------------------------------------------------------------------- |
| D-pad      | `ArrowUp` `ArrowDown` `ArrowLeft` `ArrowRight`                                     |
| OK         | `Enter` (and `' '` space); **long-OK** = Enter held ≥ 500 ms (`HoldKeyDetector`)   |
| BACK       | `Escape`, `Backspace` (outside text fields), `GoBack`, `BrowserBack`, gamepad B    |
| CH+ / CH−  | `ChannelUp`/`ChannelDown` (TV browsers), `PageUp`/`PageDown`                       |
| MENU       | `ContextMenu`, `m`                                                                 |
| RW / FF    | `MediaRewind`/`MediaFastForward`, `MediaTrackPrevious`/`MediaTrackNext`, `,` / `.` |
| Play/Pause | `MediaPlayPause`, `p`                                                              |
| Digits     | `0`–`9` (number entry zaps, like the Android app)                                  |

Keys are decoded ONCE in `src/core/input/remoteKeys.ts` into a `RemoteKey` union;
everything else consumes `RemoteKey`s. Focus moves through `src/core/focus/` — a
spatial-navigation engine over real, focusable DOM nodes (`tabIndex=-1` +
`element.focus()`), so screen readers, taps and clicks ride along for free. On a
touch device a soft D-pad (`SoftRemote`) is offered so parity holds on a phone.

## How we work

- **The director owns WHAT, Claude owns HOW.** Product behaviour comes from the
  Android app (its `e2e/features/*.feature` files are the parity contract, copied
  here under `e2e/features/` and adapted only where the web platform differs).
- **Specs first, vertical slices always.** Every slice starts as a Gherkin
  `.feature`, then ships end-to-end: UI + logic + tests + gates green.
- **Side-by-side verification.** UI slices are checked against telly on the
  Android TV emulator on the Mac mini; recordings are produced by
  `scripts/side-by-side.sh` (web via Playwright video, Android via screenrecord,
  stacked with ffmpeg) and attached to the PR.

## Stack

- **Vite + React 19 + TypeScript (strict, `noUncheckedIndexedAccess`)**, Tailwind v4.
  No `any`, ever. Explicit return types.
- **Dexie (IndexedDB)** mirrors the Android Room schema table-for-table
  (`src/core/db/`). `useLiveQuery` is the Room-`Flow` equivalent for UI reads.
- **TanStack Query** for every network fetch (playlist / EPG / logos) — fetching,
  caching, mutations. No ad-hoc `useEffect` fetching.
- **Player engine seam** (`src/core/player/PlayerEngine.ts`): `mpegts.js` for raw
  MPEG-TS over HTTP, `hls.js` for HLS, native `<video>` for MP4/progressive. UI never
  touches a library directly.
- **Client state**: Context + hook + provider per feature, in separate files. Logic
  in plain `.ts` (unit-tested); components render JSX only.
- **Hosting**: static site on GitHub Pages — there is no server. Settings → General →
  **CORS proxy** is the one web-specific setting: providers that do not send CORS
  headers can be routed through a proxy URL the user supplies.

## Quality gates (all must pass; "fix the code, never the gate")

Run everything with `./scripts/quality.sh`. CI and the pre-commit hook run the same
script (`--fast` skips the Playwright suite locally; CI runs every acceptance leg).

| Gate           | Threshold                                                              | Tool                                 |
| -------------- | ---------------------------------------------------------------------- | ------------------------------------ |
| Typecheck      | zero errors                                                            | `tsc -b`                             |
| Lint           | zero findings; `no-explicit-any`, explicit return types                | eslint (typescript-eslint strict)    |
| Format         | clean                                                                  | prettier                             |
| File length    | every logic file under `src/` ≤ 100 logic lines (tests exempt)         | `scripts/check-file-lines.mjs`       |
| Coverage       | ≥ 80% lines of `src/` (`*Screen.tsx`, `main.tsx`, tests excluded)      | vitest + v8                          |
| CRAP           | per-function complexity²·(1−cov)³ + complexity ≤ 15                    | `scripts/crap-check.mjs`             |
| Halstead       | per-function difficulty ≤ 20                                           | `scripts/check-halstead.mjs`         |
| Duplication    | threshold 0 (minLines 8, minTokens 70)                                 | jscpd                                |
| e2e mapping    | every `.feature` tag appears in the ci.yml matrix                      | `scripts/check-feature-coverage.mjs` |
| State machines | `docs/state-machines.md` owners/tests exist, markers match             | `scripts/check-state-machines.mjs`   |
| Build          | green                                                                  | `vite build`                         |
| Acceptance     | every scenario passes, keyboard only, over the hermetic fixture server | playwright-bdd                       |

Never raise a threshold, add an exclusion, or skip a gate to get green. Restructure
the code. **There is no such thing as a flaky test**: a scenario that passes
sometimes has a race — wait on a real condition, never a sleep; `retries: 0`.

## Conventions

- **Conventional commits**; PR titles `type(scope): what`.
- Vertical slices: `src/features/<slice>/` (playlist, epg, guide, playback, player,
  panel, search, settings, catchup, vod, multiview, recording, reminders, mylist,
  history, groups, pip, onboarding) + `src/core/` for design tokens, focus, input,
  navigation, db, kv, settings, player seam, shared UI.
- Components named `*Screen.tsx` are thin (render only). Hooks `use*.ts`. Logic
  `*.ts` with a sibling `*.test.ts`.
- State is a discriminated union with ONE owner; every mode is a row in
  `docs/state-machines.md` with the same name as the Android catalog.
- Design tokens live in `src/index.css` `@theme` and match Android's `Tokens.kt`.
- One-off scripts go in `/tmp`, never in the repo.

## Commands

```sh
npm run dev                 # vite dev server on 127.0.0.1:5173
npm run quality             # full gate (what CI runs)
npm test                    # unit tests
npm run e2e                 # Gherkin acceptance (builds fixtures, serves them, runs Playwright)
E2E_TAG=tv-guide npm run e2e  # one feature area
npm run fixtures && npm run fixtures:serve   # demo/fixture site on 127.0.0.1:8090
```

## Definition of done (per slice)

1. `.feature` written (ported from Android) and mapped in the CI matrix.
2. Implementation in a vertical slice; components thin, logic unit-tested.
3. `./scripts/quality.sh` exits 0 locally, including the slice's acceptance leg.
4. Side-by-side recording against the Android emulator for UI slices.
5. `docs/state-machines.md` and the decisions log below updated.

## Decisions log

- **2026-11-22** Repo created as the web port. Stack and gates mirror `telly`
  (Android) and `telly-apple`; the Android `.feature` files are the parity
  contract. Web-specific honesties: (1) browsers cannot read arbitrary
  provider URLs without CORS — the demo site works out of the box, real
  providers may need the CORS-proxy setting; (2) DVR recordings are written to
  the Origin Private File System, so they live inside the browser profile;
  (3) "autostart on boot" has no web meaning and is shown disabled with that
  explanation; (4) CH+/CH− arrive as `ChannelUp/Down` on TV browsers and
  `PageUp/PageDown` elsewhere.
- **2026-11-22** Cross-platform polish pass (screens verified by Playwright
  screenshots at 1920×1080, 1280×720 and 390×844 portrait with the soft
  remote). **(1) One length unit.** `--dp` now lives on `:root`
  (`min(100vw/960, 100vh/540)`, 2 px at 1080p) and the root font-size is
  `8 × --dp` (1 rem = 8 dp), so the rem-based screens (info overlay, panel,
  search, settings, VOD, history, …) scale uniformly with the dp-based guide
  and wizard instead of staying 1080p-sized at 720p. **Phone-portrait
  rules:** the canvas is 390 dp wide (`--dp = 100vw/390`, 1 px per dp on a
  390 px phone — text never drops under 12 px); the `portrait:` variant
  reflows screens for that width rather than shrinking them; the soft remote
  is sized in device pixels (finger targets do not scale) and reserves its
  height at the bottom of the shell (`--soft-remote-inset`) so it never covers
  the focused row; fullscreen video letterboxes into what is left; the guide
  degrades to fewer columns (`GuideDims`: 170 dp channel column without
  numbers, a 160×90 dp preview in a 108 dp strip, the remaining width as the
  time viewport — ~1.4 half-hour columns on a 390 px phone — and as many rows
  as fit); the panel hides the programme column and the detail logo; the
  wizard hides its guidance pane. The same `GuideDims` also widens the grid on
  ultra-wide landscape screens. `src/core/design/canvas.ts` is the JS mirror
  of the CSS rule (keep both in step). **(2) Focus text on focus pills.**
  Tailwind emits `text-telly-text` after `text-telly-focus-text`, so a node
  carrying both kept light text on the light pill (settings rows, history,
  menu sheets, …). The `focused:` custom variant (`[data-focused="true"]`,
  the engine's own marker) outranks the resting colour; use
  `focused:text-telly-focus-text`, never a bare `text-telly-focus-text` next
  to a resting text colour. **(3) Focus engine restores the opener.** Every
  pushed scope records the node focused at push time; a pop — or a modal whose
  nodes all unregister while it unmounts (ref cleanup runs before the scope's
  effect cleanup) — restores that opener first, then the layer's memory, and
  geometric recovery only applies to a node vanishing inside a scope that is
  still alive. The `useFocusAnchor` workarounds in search / My list /
  reminders are gone. **(4) Settings is a sheet over the live screen.** The
  shell (`ScreenStackScreen`) keeps the route beneath `Settings` mounted —
  `inert`, `aria-hidden`, its key handlers on a muted router — so the 60 %
  scrim dims the live guide (preview still playing) or player exactly as on
  Android. **(5) Now/next first paint.** `useNowNext` seeds from the shared
  in-memory `NowNextCache` (per EPG id, validity = nothing it knows has
  started or ended) and only trusts a live result for the exact (ids,
  instant) it answers — Dexie keeps returning the previous query's value while
  a new one runs, which painted dashes after a group/visibility change. While
  a genuinely unknown set resolves the panel shows no programme text, no
  progress track and no "No information" (`PanelModel.epgPending`). **(6)
  Guide header labels** hang into the channel column like Android's unclipped
  `Box` (no more "0 PM" at the grid's left edge). **(7) Hint toast copy:** the
  third line names the web's real day-jump key — `Rewind (,)` — because a held
  arrow auto-repeats in browsers (Android: "Long Left"); layout and style are
  unchanged. **(8)** Every `RouteKind` has a screen, so the route placeholder
  `ComingSoonScreen` was unreachable and is deleted; the remaining
  "Coming soon to telly" surfaces (transport row's timeshift / previous
  programme during live playback, the cell dropdown's and search dropdown's
  "Program description", Remind / My list on an EPG-less cell, the voice orb)
  are exactly the ones Android shows. `Exited` stays web-only (no launcher).
  **(9) Performance** (production build, Chromium, 1080p, `.scratch`-style
  probe with a MutationObserver from the keydown): BACK → first guide cells
  30–39 ms, OK → fullscreen route + surface 3–17 ms, ArrowDown → focused row
  moved ≤ 2 ms, zero long tasks — nothing near the 300 ms bar, so no
  memoization pass was warranted; the grid already renders only the visible
  band + one overscan row.
