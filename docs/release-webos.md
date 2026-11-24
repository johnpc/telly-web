# Releasing telly for LG webOS TVs

The same build that serves `https://telly.jpc.io` is packaged as a webOS web app
(`.ipk`). Nothing is TV-specific in the bundle: `src/platform/webos.ts` detects
a webOS TV at boot and is a no-op everywhere else.

## What is where

| Piece                                         | Path                                                                                                                                                       |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App manifest                                  | `platforms/webos/appinfo.json` (id `io.jpc.telly`, `disableBackHistoryAPI`, 1920×1080, `requiredACG: []`)                                                  |
| Icons (80×80, 130×130 from `public/icon.png`) | `platforms/webos/icon.png`, `platforms/webos/largeIcon.png` (regenerate with `sips -z 80 80 public/icon.png --out platforms/webos/icon.png`, same for 130) |
| Packager                                      | `platforms/webos/package.sh` → `platforms/webos/out/io.jpc.telly_<version>_all.ipk` (`npm run package:webos`)                                              |
| Runtime glue                                  | `src/platform/webos.ts` (+ `webos.test.ts`), registered in `src/platform/index.ts`                                                                         |
| CI                                            | `.github/workflows/package-webos.yml` — on `v*.*.*` tags and `workflow_dispatch`                                                                           |

`package.sh` runs `tsc -b`, then `vite build` with `VITE_BASE=./` (the TV loads
the app from a `file://` root, so `index.html`, the manifest and icon links must be
relative — the script fails if they are not), stages `dist/` + `appinfo.json` (the
`version` is copied from `package.json`) + the icons, and calls `ares-package
--no-minify` from `@webos-tools/cli` through `npx -y` (pinned with
`WEBOS_CLI_VERSION`, default 3.2.6). It is not a devDependency: it pulls eslint 8 and
a few hundred packages into `npm ci` for one packaging step. Set
`ARES_PACKAGE=ares-package` to use a globally installed CLI instead.

The `.ipk` is a Debian `ar` archive: `ar t out/io.jpc.telly_0.1.0_all.ipk` lists
`debian-binary`, `control.tar.gz`, `data.tar.gz`; the app lives under
`usr/palm/applications/io.jpc.telly/` inside `data.tar.gz`.

## What `src/platform/webos.ts` does on a TV

- **Detection**: `navigator.userAgent` contains `Web0S` (LG spells it with a zero:
  `(Web0S; Linux/SmartTV) … Chrome/87 … WebAppManager`) or `webOS`, or `window.webOS`
  (webOSTV.js) exists.
- **Lifecycle**: `webOSRelaunch` (the app was picked from the launcher while already
  running) and a `visibilitychange` back to `visible` re-focus the window so the
  remote's keys reach the key bridge again. The stream itself is already stopped on
  hidden and re-tuned on visible by `features/playback/lifecycle/useVisibilitySuspend`
  (Android STOP/START), so Home → relaunch resumes live TV.
- **Remote keys**: webOS delivers Back as key code **461**, CH+/CH− as **427/428**,
  RW/FF as 412/417 — on webOS 4–6 with `key: 'Unidentified'` or `''`. `decodeRemoteKey`
  (`src/core/input/remoteKeys.ts`) falls back to `keyCode` for exactly these;
  `webos.test.ts` drives real `KeyboardEvent`s with those codes through the key bridge
  and asserts BACK / CHANNEL_UP / CHANNEL_DOWN come out. `disableBackHistoryAPI: true`
  in `appinfo.json` stops the platform from interpreting Back as history navigation
  so the key reaches the app.
- **Exit**: `platformBack()arbiter)` is the seam for the shell. When a BACK arrives
  and the registered arbiter answers `true` (= the app's own navigator is at its root,
  nothing left to pop) the module calls `webOS.platformBack()` (back to the launcher,
  app kept alive) and stops the event before the key bridge sees it, so the live
  screen stays mounted for the relaunch. Without an arbiter — **today** — the module
  never exits and Back at the root shows the web `Exited` frame (OK starts over), as on
  every other platform.

### Known gaps (owner's follow-ups)

1. ~~Wire the exit~~ Done: `src/app/RootScreen.tsx` calls `exitToPlatform()`
   (`src/platform/exit.ts`) when BACK finds nothing to pop; on webOS that is
   `webOS.platformBack()` and the `Exited` frame is never shown.
2. **`webOSRelaunch` parameters** (`event.detail`) are ignored; a deep link such as
   `{ channel }` from a voice/launcher intent could tune directly.
3. `public/sw.js` (the Xbox PWA app-shell worker) is shipped in the `.ipk`; service
   workers do not register on `file://`, so it is dead weight (≈ a few KB), not a bug.

## Compatibility: which webOS versions the default bundle runs on

The production bundle is built with Vite's default `build.target`
(`baseline-widely-available` ≈ Chrome 107) and **no `@vitejs/plugin-legacy`**. The
bundle (and its dependencies — React 19, Dexie 4, hls.js, mpegts.js) contains
ES2021 **logical assignment** (`??=` / `||=` / `&&=`, ~180 sites), class **private
fields** (`this.#x`), optional chaining and `String.prototype.replaceAll`. Measured on
`dist/assets/*.js`; `top-level await`, `static {}` blocks, `structuredClone`,
`Object.hasOwn`, `Array.prototype.at/findLast` and `AbortSignal.timeout` are absent.

| webOS TV | Year  | Chromium | Default bundle                                                      | IndexedDB (Dexie) | MediaSource (hls.js / mpegts.js) | OPFS `navigator.storage.getDirectory` (DVR recordings, config auto-backup) |
| -------- | ----- | -------- | ------------------------------------------------------------------- | ----------------- | -------------------------------- | -------------------------------------------------------------------------- |
| 3.x      | 2016+ | 38       | no (no `async/await`, no modules)                                   | yes               | yes                              | no                                                                         |
| 4.x      | 2018+ | 53       | **no** (`??=` is a syntax error; no `??`/`?.`; no ES modules in 53) | yes               | yes                              | no                                                                         |
| 5.x      | 2020  | 68       | **no** (`??=`/`?.`/`??` syntax errors, no private fields)           | yes               | yes                              | no                                                                         |
| 6.x      | 2021  | 79       | **no** (`??=` needs 85; `replaceAll` needs 85 at runtime)           | yes               | yes                              | no (needs 86)                                                              |
| 22       | 2022  | 87       | **yes**                                                             | yes               | yes                              | yes                                                                        |
| 23       | 2023  | 94       | yes                                                                 | yes               | yes                              | yes                                                                        |
| 24       | 2024  | 108      | yes                                                                 | yes               | yes                              | yes                                                                        |
| 25       | 2025  | 120      | yes                                                                 | yes               | yes                              | yes                                                                        |

So the `.ipk` targets **webOS 22 and newer (2022+ TVs)**. Declare that minimum in the
Seller Lounge listing. `requestVideoFrameCallback` (Chrome 83, used for the frame-rate
readout) is feature-detected, not required.

**Supporting webOS 4.x–6.x** would need `@vitejs/plugin-legacy` behind a
`VITE_LEGACY=1` switch in `vite.config.ts` — only for the webOS package build, never
the web build: it adds a SystemJS `nomodule` bundle plus core-js polyfills (for
`replaceAll`, `globalThis`, `queueMicrotask`, `WeakRef`, …), roughly doubles the
package, and needs its own TV pass (hls.js on Chromium 53 MSE is unverified). It was
deliberately not added in this slice: it is a new dependency with its own gate and
device-test cost, and the current product bar is a 2022+ TV. OPFS never exists below
webOS 22, so recordings would still be unavailable there.

Behaviour differences inside a packaged app (verify on the TV, items below):

- The page origin is `file://`, so there is **no mixed-content rule** — plain-`http`
  provider streams can play directly, unlike `https://telly.jpc.io`. LG documents that
  packaged web apps are exempt from the same-origin policy for XHR/fetch, which would
  also make the **Stream & CORS proxy** setting unnecessary; the `Proxy discovery`
  probe (`<origin><BASE_URL>proxy/healthz`) fails fast on `file://` and settles as
  Absent, so nothing is filled in automatically.
- IndexedDB / OPFS live in the app's own profile on the TV; uninstalling the app
  deletes playlists, EPG cache and recordings (same as clearing a browser profile).
- `<script type="module" crossorigin>` from `file://` is blocked by stock desktop
  Chromium without `--allow-file-access-from-files`; LG's Web App Manager runs apps
  with local access enabled. If the first launch shows only the `#0e1116` background,
  open `ares-inspect` and look for "blocked by CORS policy" on the module script — the
  fix would be a classic (non-module) output for the webOS build.

## Accounts and tooling (owner)

1. **LG Seller Lounge** account: <https://seller.lgappstv.com> (company or individual;
   individual accounts can publish free apps). The vendor name in `appinfo.json` must
   match the seller name.
2. **Developer Mode on the TV**: install _Developer Mode_ from the LG Content Store,
   sign in with the **webOS TV developer account** (<https://webostv.developer.lge.com>,
   separate from the Seller Lounge), turn _Dev Mode Status_ ON (reboots), then _Key
   Server_ ON. The session lasts 50 h and must be extended in the app; the TV and the
   Mac must be on the same LAN.
3. **CLI** (`@webos-tools/cli`; the script fetches it with `npx`, or
   `npm i -g @webos-tools/cli` for day-to-day use):

   ```sh
   npm run package:webos                                    # → platforms/webos/out/io.jpc.telly_<v>_all.ipk
   ares-setup-device                                        # add the TV: name, IP, port 9922, user prisoner; passphrase from the Dev Mode app
   ares-novacom --device <tv> --getkey                      # fetch the SSH key once (prompts for the passphrase)
   ares-install --device <tv> platforms/webos/out/io.jpc.telly_0.1.0_all.ipk
   ares-launch  --device <tv> io.jpc.telly
   ares-inspect --device <tv> --app io.jpc.telly --open     # Chrome DevTools against the TV's webview
   ares-launch  --device <tv> --close io.jpc.telly
   ares-install --device <tv> --remove io.jpc.telly
   ```

   The simulator (`ares-launch -s <webOS version>`, webOS 22+) runs the `.ipk` on the
   Mac but with desktop Chromium; it validates layout and key codes, not codec support.

## LG QA checklist — the items that matter for this app

LG's self-checklist is at <https://webostv.developer.lge.com/distribute/app-self-checklist>.
What applies to telly:

- **Back key** (every screen): Back pops exactly one layer (sheet → overlay → screen);
  Back on the guide/player root must leave the app to the launcher (gap 1 above —
  until wired, QA sees the `Exited` frame; press OK to recover). No screen may trap the
  user.
- **Exit behaviour**: the app must not call `window.close()`; `webOS.platformBack()` is
  the sanctioned way. Relaunch from the launcher must restore the last channel
  (`useVisibilitySuspend` + stored tune).
- **1080p layout**: `resolution: 1920x1080` in `appinfo.json`; webOS renders a
  1920×1080 CSS viewport on every panel size (4K TVs scale). Check the guide, info
  overlay, settings sheet and wizard at exactly 1920×1080 — same as the Playwright
  default viewport; no scrollbars, no clipped focus pills.
- **No mouse-only controls**: the Magic Remote pointer is a courtesy layer; every
  action must be reachable with D-pad + OK + Back (the charter's rule, and LG's). The
  pointer must not get stuck over hidden elements; focus must be visible at all times.
- **Media keys**: Play/Pause (10252), RW/FF (412/417), CH+/CH− (427/428) must do what
  the TV's remote labels say.
- **Loading**: a splash of `bgColor` `#0e1116` then the Boot skeleton within a few
  seconds; no white flash (`index.html` body class sets the dark background).
- **Network loss**: pulling the cable during playback must show the player's error
  state and recover when the network returns, never a dead black screen.
- **Privacy policy URL**: required in the Seller Lounge listing. The app has no
  backend and no accounts — state that everything the user enters stays on the TV
  (the same text the GitHub Pages twin uses).
- **Age rating / content**: telly ships no content; the listing must say the user
  supplies their own playlist and the rating is "All" with a note that stream content
  is the user's own. LG may still ask for a test playlist: give the public demo
  `https://johnpc.github.io/telly/playlist.m3u`.
- **Icons**: 80×80 `icon` and 130×130 `largeIcon` are in the package; the Seller
  Lounge additionally wants a 400×400 icon and 1920×1080 screenshots (take them with
  `ares-inspect` → DevTools → "Capture screenshot", or Playwright at 1920×1080).
- **Not applicable**: in-app purchase, login, Luna service APIs (`requiredACG: []`),
  3D, touch.

## Self-check before uploading

1. `bash scripts/quality.sh --fast` green on the tag.
2. `npm run package:webos` succeeds; `ar t` shows the three members; `tar tzf` of
   `data.tar.gz` lists `appinfo.json`, `index.html`, `assets/`, both icons, and
   `appinfo.json`'s `version` equals `package.json`'s.
3. `ares-install` + `ares-launch` on a webOS 22+ TV in Developer Mode: the Boot frame →
   Welcome or Guide appears (not a blank `#0e1116` page — if blank, see the module
   script note above).
4. Add the demo playlist through the wizard with the remote only; the guide shows
   programmes; OK tunes; the stream plays (hls.js over MSE).
5. Remote keys: Back pops; CH+/CH− zap on the player; Play/Pause pauses; digits zap.
   Verify in `ares-inspect` that `keydown` for Back reports `keyCode 461`.
6. Home → relaunch telly: live TV resumes on the same channel.
7. Settings → Recording: record 1 minute, play it back (OPFS present on webOS 22+).
8. A plain-`http` provider URL plays **without** the Stream & CORS proxy (packaged app
   has no mixed-content rule); if a CORS error shows in `ares-inspect`, the proxy
   setting is still the fallback.
9. Tag `vX.Y.Z` → `package-webos.yml` attaches `io.jpc.telly_X.Y.Z_all.ipk` to the GitHub
   Release; download that exact file for the Seller Lounge upload (App Management →
   Register New App → _webOS TV_ → _Web app_, upload the `.ipk`, fill metadata, submit).
10. After LG QA approval the listing goes live per country; note the result in the
    decisions log.
