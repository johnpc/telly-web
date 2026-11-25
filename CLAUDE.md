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
| Gamepad    | Xbox Edge `Gamepad*` names: A=OK, B=BACK, D-pad/left stick, LB/RB=CH, LT/RT=RW/FF  |

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
- **Player engine seam** (`src/core/player/engine/PlayerEngine.ts`): `mpegts.js` for raw
  MPEG-TS over HTTP, `hls.js` for HLS, native `<video>` for MP4/progressive. UI never
  touches a library directly.
- **Client state**: Context + hook + provider per feature, in separate files. Logic
  in plain `.ts` (unit-tested); components render JSX only.
- **Hosting**: static site on GitHub Pages — there is no server. Settings → General →
  **Stream & CORS proxy** is the one web-specific setting: playlist, EPG AND stream
  requests are routed through a proxy URL (`src/core/net/streamUrl.ts`); hosts that
  ship a proxy at `/proxy/` fill it in by themselves (`Proxy discovery`).

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
- The player seam is grouped by concern: `src/core/player/{engine,transport,probe,
gate,connection,telemetry,video}/`; feature code imports only from
  `src/core/player/index.ts`.
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
npm run e2e:throttled       # the buffer-gate leg: fixture streams paced at real-time rate + 2 s pre-roll (needs 8090 free: it starts its own paced server)
npm run fixtures && npm run fixtures:serve   # demo/fixture site on 127.0.0.1:8090
FIXTURE_THROTTLE=realtime FIXTURE_PREROLL_SEC=2 npm run fixtures:serve   # the same site as a ~1× provider pipe
node scripts/measure-playback.mjs <base> '<proxyBase>' 90   # live-playback health probe (see below)
```

**After any change under `src/core/player/`**, run `scripts/measure-playback.mjs`
against the real provider before and after, twice each (cold line after > 60 s
idle, then warm): the bar is 0 rebuffers, 0 stalled seconds, 0 dropped frames
over 90 s. CI's fixture server bursts from disk and cannot see a 1× pipe; the
`playback-throttled` acceptance leg serves the fixture at real-time rate as the
automated stand-in (`npm run e2e:throttled`: `serve.mjs` paces every `.ts` body at
its PCR bitrate after a 2 s pre-roll burst; the scenarios prove the first frame
waits for the runway, the burst does not start playback, and 30 s play without
a `waiting` event).

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
- **2026-11-22** Deployed. (1) GitHub Pages twin at `https://johnpc.github.io/telly-web/`
  (`deploy.yml`, `VITE_BASE=/telly-web/`, needs `actions: read`). (2) Docker image
  `mrorbitman/telly-web` on Docker Hub like the other johnpc repos (`docker.yml`:
  `:latest` + `:sha-…` after every green CI run on `main`, semver on `v*.*.*` tags;
  amd64 + arm64; nginx serving `dist/` with SPA fallback, `/healthz`, immutable
  asset caching, `X-Robots-Tag: noindex`). (3) Self-hosted at `https://telly.jpc.io`:
  umbrel stack `/home/umbrel/homelab/stacks/telly-web` on LAN `:8002`, exposed the
  Jellyfin way — DNS-only CNAME → `jellyfin.jpc.io` → router → umbrel-7 Nginx Proxy
  Manager host (own Let's Encrypt cert), never the Cloudflare proxy (media
  streaming ToS); Homepage lists it first under Favorites. The container has no auth
  and no data: everything the user enters lives in their browser.
- **2026-11-23** Real provider streams on the web. (1) **The "CORS proxy" setting
  also routes streams** (row renamed **Stream & CORS proxy**, summary says why):
  provider URLs like `https://host/<line>/<token>/<id>` 302 to a plain-http host, which
  an https page cannot follow (mixed content), and most providers send no CORS, so
  `resolveStreamUrl(url, base)` (`src/core/net/streamUrl.ts`, THE one resolver) wraps
  every media URL as `${base}${encodeURIComponent(url)}` at every place a URL reaches
  an engine — live tune and retune, catch-up archive (unlike Android's UDP proxy the
  archive goes through too), multiview panes, VOD, and every DVR capture fetch
  (`resolvingFetch` wraps the recorder's `fetch`, so HLS relative URIs still resolve
  against the provider's playlist URL). Blob / data / same-origin / already-proxied
  URLs and logos are never proxied; the setting is read live per call. Known gap:
  hls.js resolves a proxied playlist's RELATIVE segment URIs against the proxy URL, so
  HLS-through-proxy needs the proxy to rewrite playlist bodies (a proxy-side fix). (2)
  **Zero config on hosts with a proxy** — `Proxy discovery` (`src/app/proxyDiscovery.ts`,
  Unknown · Probing · Found(base) · Absent) probes `<origin><BASE_URL>proxy/healthz`
  once per install when the setting is unset and fills in `<origin><BASE_URL>proxy/?url=`
  on `200 ok`; `general_cors_proxy_probed` guarantees a value the user set or cleared is
  never touched again. GitHub Pages (404) and the fixture harness (SPA html) settle as
  Absent; the probe never delays the start route. (3) **Byte-sniffed container**: the
  provider labels raw MPEG-TS as `video/mp4`, so extensionless URLs are decided by a
  ranged GET of the first 8 TS packets (`containerSniff.ts`: `0x47` at a 188-byte stride
  from any alignment → mpegts.js; `#EXTM3U` → hls.js; `ftyp`/`moov`/`moof` → native),
  falling back to the Content-Type only for an undecided body. The reader is cancelled
  after 1504 bytes because a live pipe ignores Range and never ends.
- **2026-11-23** Live playback smoothness (director: "playback stutters quite a
  lot"). Measured on the real provider with a 60 s Playwright probe (buffered
  runway sampled per second, `waiting` events, dropped frames): through the
  stream proxy 11 rebuffers / 10 s frozen with 0.7 s average runway; direct 3
  rebuffers / 1.3 s. Root cause was mpegts.js `liveBufferLatencyChasing` with a
  3 s cap — the player seeked forward whenever more than 3 s accumulated, so a
  jittery IPTV pipe lived on ~1 s of buffer. Now, like Android/TiviMate: no
  chasing (the stream drifts at 1.0× over a deep buffer, source buffer trimmed
  30–60 s behind the playhead), and a `BufferGate` (`src/core/player/gate/bufferGate.ts`,
  catalog row) ports Android's `PlayerTuning` runways from Settings → Playback →
  Buffer size — Small 1.5 s to start / 5 s to resume after an underrun, Medium
  2.5/5, Large 2.5/10; the gate's own pauses never count as the user's. After:
  via proxy 1 rebuffer / 4 s frozen with a 4–6 s runway; direct 0 rebuffers.
  Also: webOS/Tizen numeric key codes (461/10009 Back, 427/428 channel keys,
  412/417 RW/FF, 10252 play/pause) decode when `key` is unnamed, and a web app
  manifest (`public/manifest.webmanifest`, 192/512 icons) makes the site
  installable — the input for PWABuilder (Xbox/Microsoft Store) and webOS/Tizen
  web-app packaging.
- **2026-11-23** Rock-solid live playback (director: "can we do even better?").
  Measured again on the real provider through the TLS relay with a 90 s probe.
  (1) **The relay is nginx itself.** The Python `telly-stream-proxy` is retired
  (stack stopped, kept as fallback); the Nginx Proxy Manager host for
  `telly.jpc.io` serves `/proxy/?url=` natively (OpenResty `set_by_lua_block`
  host allowlist, OPTIONS 204 preflight, upstream CORS headers hidden, 301/302/
  307/308 followed server-side via `error_page` → named locations, unbuffered,
  1 h timeouts). No Python hop, no second TLS termination. (2) **One runway, built before the first frame** (`bufferRunway.ts`): Small
  6 s, Medium 8 s, Large 12 s, the same runway before the first frame and after
  an underrun. Why not Android's short start runway: the provider is a strict
  ~1× pipe (a connection yields 1.0–1.5 MB in its first 2 s of a ~0.9 MB/s
  stream) — a 2 s start runway drained to 0.06 s within 5 s of playing and a
  6.7 s stall followed. An adaptive variant (measure the fill rate, start short
  only when the pipe bursts) was tried and reverted the same day: after an idle
  minute the provider sends a ~2 s pre-roll burst that reads as "bursting", the
  stream starts on 2 s and stalls for 8 s when the burst ends (seen live, never
  locally where the line was never idle). A 1× pipe cannot build runway while
  playing, and a pipe that truly bursts fills 6 s in under two seconds anyway,
  so the long runway costs nothing where a short one would have worked. mpegts.js
  stash is 1 MB, so appends arrive in ~1 s steps. (3) **Result** through the
  relay over 90 s: 0 rebuffers, 0 stalls, 0 dropped frames, runway 3.3–7.7 s,
  first frame ~6.9 s on this provider (one wait, then steady). (4) **Never
  HEAD a stream.** The provider treats HEAD as an open session: the GET that
  followed it got ~50 KB in 2 s until the phantom session timed out. The
  file-vs-live probe is now a ranged GET whose body is cancelled unread (a
  cancelled GET closes the upstream at once — measured), and both probes
  leave their headers in `probeMemo` (30 s TTL) so a tune makes one probe
  connection, not two.
- **2026-11-23** Store packaging — ONE web build, three wrappers, each a
  runtime no-op elsewhere (`src/platform/`, registered in `bootPlatform()`;
  release recipes in `docs/release-{xbox,webos,tizen}.md`, workflows
  `package-*.yml`). **Xbox / Microsoft Store:** PWA — `public/sw.js` app-shell
  service worker (precaches the start document's assets, never intercepts
  playlists/EPG/streams/`/proxy/`; offline relaunch verified), `tv-safe-area`
  padding (2.5 vw) when the UA says Xbox, `Gamepad*` key names decoded in
  `gamepadKeys.ts`, PWABuilder MSIX request in `platforms/xbox/`. **LG webOS:**
  `platforms/webos/` appinfo + `package.sh` → `ares-package` `.ipk` (webOS 22+,
  Chromium 87: `??=`/`#private`/`replaceAll` in the bundle); `webOSRelaunch`/
  visibility re-focus the window. **Samsung Tizen:** `platforms/tizen/`
  config.xml + `package.sh` → `.wgt` built at `chrome108` (Tizen 8.0+: Tailwind
  v4's `@layer` is dropped by older Chromium); TV keys registered via
  `tizen.tvinputdevice` (never `Exit`, which must stay native). **One exit
  seam:** `RootScreen` calls `exitToPlatform()` (`src/platform/exit.ts`) when
  BACK finds nothing to pop — Tizen `application.exit()`, webOS
  `platformBack()` — and shows the web `Exited` route only when no platform
  took it. Store accounts, certificates and device testing are the owner's
  manual steps, listed in each recipe.
- **2026-11-24** Provider concurrent-stream awareness (director item 5).
  Measured on the real provider through the relay: the line allows ONE
  stream — with two or three concurrent connections only one receives real
  data (19 MB in 8 s); every other connection gets HTTP 200 with an identical
  ~710 KB body that then ends (a "too many connections" slate), so a second
  multiview pane or a recording started while watching showed a short slate,
  Ended, and looped on the reconnector. Android has no comparable message
  (its multiview teaser says only "Your IPTV provider may limit the number of
  concurrent connections"), so this is a documented web honesty. (1) ONE
  owner for the fact: `Provider stream limit`
  (`src/core/player/connection/streamConcurrency.ts`, Unknown · Suspected ·
  Limited(host, since) · Cleared): every live stream the app opens registers
  — engine tunes through `StreamSlot`, DVR captures from their first response
  — where "live" is the engine's own `isLivePipe` rule (the tune says live AND
  the server sent no Content-Length), so finite files never count. A live
  stream reaching Ended or Error within 20 s of opening while another live
  stream from the same PROVIDER host is open (proxied URLs are unwrapped)
  ⇒ Limited; a concurrent pair that outlives 20 s, or 10 minutes, clears it.
  (2) Consumers: the engine surfaces the terminal Error whose message is
  "Your provider allows one stream at a time" instead of arming a retry, and
  refuses a tune that would be a second stream on a Limited host before it
  connects; the
  multiview pane shows that line on black (no modal, remote needs nothing);
  the recorder marks the row FAILED with "Provider allows one stream at a
  time" (`failReason`, stored beside the row, shown as "Failed · …") and
  deletes the slate file instead of keeping a tiny "successful" capture.
  Fullscreen single playback is unaffected. (3) Hermetic reproduction:
  `e2e/steps/streamLimit.steps.ts` routes the five channel clips to a tiny
  provider on 127.0.0.1:8091 that answers chunked without a length (a
  `route.fulfill` always adds a Content-Length, which reads as a finite file);
  the first clip holds the line, every other clip gets the first ~150 KB
  (≈5 s at the fixture's 29 KB/s — the real slate is ≈0.8 s of a 0.9 MB/s
  stream) and ends. The line is keyed by URL, not socket, so the
  fullscreen → multiview hand-over on the same URL is not modelled.
- **2026-11-24** The zap wait feels intentional (director items 1 and 9). (1) **Never
  black while the gate holds.** Every transport clears the element's source when it
  stops, so a channel change went black for the whole 6–12 s runway. `FrameHold`
  (`src/core/player/video/frameHold.ts`, catalog row `Zap frame hold`) draws the last
  frame onto a canvas stacked over the `<video>` (the surface host is a one-cell grid,
  both children `grid-area: 1 / 1`, so the canvas needs no positioned host and rides
  along to the guide preview) right before `StreamSession.tune` stops the old
  transport, and drops it the moment the connection state leaves Buffering /
  Reconnecting. A first tune has nothing to hold, so the playback chrome shows a dark
  card with the channel logo + name instead. (2) **Runway progress** is one observable
  (`RunwayStore`, row `Runway progress`) the `BufferGate` alone writes on every check
  (`{ ahead, need }`, `need` 0 = no gate attached); the engine hands it to each tune
  through `LoadOptions.runway`, `zapWait.ts` derives the thin bar + "Buffering · 3 s of
  6 s" label at the top centre (the one band no overlay uses; informational, never
  focusable). (3) **One gate for every transport**: hls.js and the native element
  attach the same `BufferGate` per tune, so Settings → Playback → Buffer size means
  the same thing for `.ts`, HLS and MP4; hls.js keeps its own `maxBufferLength`, the
  gate only decides when the element may play, and a finite file — or a live HLS
  playlist buffered to its edge — plays out below the runway. (4) **Seeing the hold in
  acceptance**: the fixture bursts from disk, so the web-only `watch-and-zap`
  scenarios slow Chromium's network (CDP `Network.emulateNetworkConditions`, 32 KB/s ≈
  1.1× the fixture bitrate) from the first stream request after the document's `load`,
  lifting it again at every navigation commit; a zap goes to channel 7 because channel
  2 shares channel 1's stream URL and a same-URL load is the engine's hand-over no-op.
  Live probe through the relay, 90 s: before 0 rebuffers / 0 stalled / 0 dropped (×2,
  runway 1.5–8.2 s), after 0 / 0 / 76 dropped — and the untouched before-build
  re-measured minutes later dropped 70 too, so the drops are the hour's machine /
  line state, not the change (0 rebuffers, 0 stalled, runway 3.9–8.0 s after).
- **2026-11-24** Director items 2, 3, 4 and 8. (1) **Buffer size speaks in
  seconds** (`src/features/settings/bufferSizeCopy.ts`, the ONE source, reading
  `thresholdsFor`): row summary "Small · 6 s before a channel starts, for good
  lines", options "Medium — 8 s to start, for jittery lines", "Large — 12 s to
  start, for lines that stall". (2) **Deep links**: `?channel=<number | name |
unique prefix>` tunes that channel on launch (`src/app/deepLink.ts`, folded into
  the Start route row), works under the Pages base path and beside `?e2e=1`, is
  stripped from the address bar with `history.replaceState` so a reload does not
  re-tune; an unknown channel takes the normal start route and shows a 5 s
  "No channel named X" notice (`StartNoticeScreen`, the guide-toast treatment —
  there was no app-wide toast before). (3) **"telly was updated" toast**
  (`src/platform/pwaUpdate.ts`, Current · UpdateReady · Reloading): the service
  worker is registered as `sw.js?v=<hash of the start document's asset refs>`, the
  running page re-reads the deployed document every 15 min and on becoming visible,
  a new hash installs a waiting worker and a focused toast offers OK = reload (the
  page posts `skipWaiting`, reloads on `controllerchange`) / BACK = later; it is
  deferred while Boot, Playback, VOD or Multiview is on screen so it never steals
  a key from video. `sw.js` no longer calls `skipWaiting` at install — one
  mechanism. (4) **`playback-throttled` acceptance leg**: `FIXTURE_THROTTLE=realtime`
  makes `e2e/fixtures/serve.mjs` pace every `*.ts` body at `size ÷ PCR span` in
  188-byte chunks against the wall clock, `FIXTURE_PREROLL_SEC=2` imitates the
  provider's pre-roll burst, and the leg's Background reads `X-Fixture-Throttle` so
  a reused unpaced server fails loudly; scenarios prove the first frame waits for
  the runway, a pre-roll burst does not start playback early, and 30 s play with
  zero `waiting` events. `npm run e2e:throttled` locally (needs 8090 free).
  The player seam is now grouped by concern (`engine/ transport/ probe/ gate/
connection/ telemetry/ video/`) and `scripts/measure-playback.mjs` is the
  documented live probe to run after any player change.
