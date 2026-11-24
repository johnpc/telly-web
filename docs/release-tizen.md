# Releasing telly on Samsung Tizen (Smart TV)

telly-web runs on Samsung TVs as a **Tizen web application**: the same static
Vite build, zipped with a `config.xml` into a `.wgt` widget and installed on
the TV (developer mode) or published through the Samsung Seller Portal. No
native code, no backend — everything the viewer enters stays in the TV's
browser storage.

| What              | Where                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| Widget manifest   | `platforms/tizen/config.xml`                                           |
| Packaging script  | `platforms/tizen/package.sh` (`npm run package:tizen`)                 |
| Output            | `platforms/tizen/out/telly.wgt` (the only file left under `out/`)      |
| Runtime bootstrap | `src/platform/tizen.ts` (registered in `src/platform/index.ts`)        |
| CI                | `.github/workflows/package-tizen.yml` (tags `v*.*.*`, manual dispatch) |
| Key decoding      | `src/core/input/remoteKeys.ts` (`KEY_CODE_TABLE`) — not Tizen-specific |
| Install on a TV   | `sdb connect <tv-ip>` + `tizen install -n telly.wgt -t <device>`       |
| Store             | <https://seller.samsungapps.com> (Samsung Apps TV Seller Office)       |

## 1. What the package contains

`package.sh` builds the app with `VITE_BASE=./` — the widget is served from
`file://`, so every asset URL has to be relative — into a temporary staging
folder, copies `config.xml` (its `version` is rewritten from `package.json`)
and the 512×512 icon next to `index.html`, removes the Xbox service worker
(`sw.js` cannot register on `file://`), zips the folder and deletes the
staging copy (a built html/js tree inside the repo would trip
`prettier --check .`). Expected layout (`unzip -l platforms/tizen/out/telly.wgt`):

```
config.xml
index.html
icon-512.png  icon-192.png  icon.png  favicon.svg  icons.svg
manifest.webmanifest
assets/index-*.js  assets/index-*.css  assets/hls-*.js  assets/mpegts-*.js
```

`config.xml` declares: `<tizen:application id="tellyjpcio.telly" package="tellyjpcio" required_version="2.4"/>`,
`<content src="index.html"/>`, `<tizen:profile name="tv"/>`, the privileges
`http://developer.samsung.com/privilege/network.public` (fetch playlists,
EPG, logos and streams) and `http://tizen.org/privilege/tv.inputdevice`
(`registerKey`), `<access origin="*" subdomains="true"/>` so the app may fetch
any provider the viewer enters, and
`<tizen:setting screen-orientation="landscape" context-menu="disable" background-support="disable" encryption="disable" hwkey-event="enable"/>`.

The **package id** (`tellyjpcio`, 10 alphanumerics) and the **application
id** (`<package>.telly`) are what the Seller Portal and the installed app are
keyed on; once an app is registered on the portal, never change them.

### Unsigned vs signed

A `.wgt` is a zip. `zip -r` (what `package.sh` and CI do) produces a valid
**unsigned development package** — good for inspecting the layout and for the
Tizen Studio TV emulator. A **real TV refuses an unsigned widget** and the
Seller Portal only accepts widgets signed with your author certificate plus a
Samsung distributor certificate (see §3). When the `tizen` CLI is installed
and `TIZEN_PROFILE=<profile>` is set, `package.sh` signs instead of zipping:

```sh
TIZEN_PROFILE=telly npm run package:tizen
# runs: tizen package -t wgt -s telly -- <staging folder>
```

To sign an unsigned `.wgt` by hand: unzip it into an empty folder
(`mkdir /tmp/telly-wgt && unzip platforms/tizen/out/telly.wgt -d /tmp/telly-wgt`)
and run `tizen package -t wgt -s <profile> -- /tmp/telly-wgt`.

## 2. Compatibility — read this before promising a TV year

Samsung TVs run a fixed Chromium per Tizen release. Measured against the
production bundle (Vite 8, Tailwind v4):

| Tizen (TV year) | Chromium | ES modules (61)              | `?.` / `??` (80) | Tailwind v4 `@layer` CSS (99) | `color-mix()` opacity utilities (111) | IndexedDB (Dexie) | MediaSource (mpegts.js / hls.js) | OPFS recordings (`navigator.storage.getDirectory`, 86) |
| --------------- | -------- | ---------------------------- | ---------------- | ----------------------------- | ------------------------------------- | ----------------- | -------------------------------- | ------------------------------------------------------ |
| 4.0 (2018)      | 56       | no                           | no               | no — page renders unstyled    | no                                    | yes               | yes                              | no                                                     |
| 5.0 (2019)      | 63       | yes (`import.meta` needs 64) | no               | no                            | no                                    | yes               | yes                              | no                                                     |
| 5.5 (2020)      | 69       | yes                          | no               | no                            | no                                    | yes               | yes                              | no                                                     |
| 6.0 (2021)      | 76       | yes                          | no               | no                            | no                                    | yes               | yes                              | no                                                     |
| 6.5 (2022)      | 85       | yes                          | yes              | no                            | no                                    | yes               | yes                              | no (86)                                                |
| 7.0 (2023)      | 94       | yes                          | yes              | no                            | no                                    | yes               | yes                              | yes                                                    |
| **8.0 (2024)**  | 108      | yes                          | yes              | **yes**                       | no — hex/var fallbacks are emitted    | yes               | yes                              | yes                                                    |
| 9.0 (2025)      | 120      | yes                          | yes              | yes                           | yes                                   | yes               | yes                              | yes                                                    |

Honest conclusions:

- **The realistic floor is Tizen 8.0 (2024 models).** Tailwind v4 wraps every
  rule in `@layer theme/base/components/utilities`; a Chromium older than 99
  drops unknown at-rules wholesale, so on Tizen 4.0–7.0 the JavaScript may run
  but the page is **unstyled** (no focus pills, no grid). No build flag fixes
  CSS cascade layers.
- `color-mix()` (Chromium 111) is used for the `/opacity` utilities, but
  Tailwind emits them inside `@supports` with a hex/var fallback first, so
  Tizen 8.0 (108) renders scrims and accents correctly.
- **The default web build targets `chrome111`** (Vite 8 "baseline widely
  available") and ships 681 `?.` and 450 `??` — a `SyntaxError` before React
  mounts on Chromium < 80. `package.sh` therefore passes
  `vite build --target chrome108` **for the Tizen package only**; the web build
  (`npm run build`, Pages, Docker) is untouched. `TIZEN_TARGET=chrome64` is
  accepted for a Tizen 5.0 bring-up experiment (esbuild downlevels the syntax;
  the probe build succeeds), but the result is still unstyled below 8.0 and
  runtime APIs such as `String.replaceAll` (85), `Promise.allSettled` (76),
  `globalThis` (71) and `crypto.randomUUID` (92) are **not polyfilled**.
- **`@vitejs/plugin-legacy` (`VITE_LEGACY=1`) — checked, not added.** It would
  only matter for Tizen 4.0 (no ES modules at all) and for polyfilling the
  runtime APIs above on 5.0–7.0, and none of those TVs can render the Tailwind
  v4 CSS anyway, so the dependency buys nothing today. Revisit only if the
  styling layer ever drops `@layer` (Tailwind v3 output or a PostCSS
  flattening step); then: add the plugin, enable it in `vite.config.ts` only
  when `VITE_LEGACY=1`, and have `package.sh` set it.
- IndexedDB works from `file://` in Tizen's runtime; recordings need OPFS
  (Tizen 7.0+) and live inside the app's storage — uninstalling the app
  deletes them, as on the web (CLAUDE.md decisions log).
- MediaSource is present on every Chromium-based Tizen; whether a given
  H.264/AAC profile — or AC-3/E-AC-3 audio from a provider — is accepted by
  `MediaSource.isTypeSupported` is model-dependent. Test with the owner's real
  playlist on the target TV, not only the fixture site.
- **CORS and mixed content:** the widget's origin is `file://`, so an https →
  http redirect from a provider is not mixed content, and Samsung's runtime
  grants cross-origin network access to the `<access origin="*">` list. If a
  provider still fails, set **Settings → General → Stream & CORS proxy**
  exactly as on the web.

## 3. One-time setup for the owner

### 3.1 Samsung Seller Portal account

1. Sign in at <https://seller.samsungapps.com> with a Samsung account and
   request **TV Seller Office** access (free; individual or company). Fill in
   the seller profile and accept the TV distribution agreement.
2. Keep the login: the distributor certificate (3.3) is issued against it.

### 3.2 Tizen Studio / `tizen` CLI

1. Download Tizen Studio (with IDE, or the CLI-only installer) from
   <https://developer.tizen.org/development/tizen-studio/download> and
   install; add `~/tizen-studio/tools/ide/bin` and `~/tizen-studio/tools` to
   `PATH` (`tizen`, `sdb`).
2. Open **Package Manager** → Extension SDK → install **TV Extensions** (Samsung
   Certificate Extension, TV emulator, Samsung TV SDK tools).
3. `tizen version` and `sdb version` must print.

### 3.3 Author + distributor certificates

1. Tizen Studio → **Tools → Certificate Manager → + → Samsung** (not Tizen)
   → _Create a new certificate profile_ named `telly`.
2. **Author certificate:** create a new one (name, password — store the
   password in the owner's password manager; losing the author certificate
   means never being able to update the app). Sign in with the Samsung account
   when asked. Back up `~/SamsungCertificate/telly/author.p12`.
3. **Distributor certificate:** choose **Public** privilege level (telly uses
   no partner privileges) and add the TV's **DUID**: with the TV connected
   through `sdb` (3.4) the manager lists it; otherwise read it on the TV in
   Apps → _1·2·3·4·5_ → Developer mode panel → **Device ID**. Up to 50 DUIDs
   per certificate. Back up `distributor.p12`.
4. Make `telly` the **active** profile (it is written to
   `~/tizen-studio-data/profile/profiles.xml`).

### 3.4 Developer Mode on the TV and `sdb connect`

1. TV: **Apps** → press **1 2 3 4 5** on the remote (some models: **12345**
   via the number pad) → Developer mode **On** → **Host PC IP** = the Mac's
   LAN IP → OK → power the TV off and on again (full restart, not standby).
2. The TV and the Mac must be on the same LAN. Then:

   ```sh
   sdb connect <tv-ip>          # "connected to <tv-ip>:26101"
   sdb devices                  # note the device serial / name
   ```

## 4. Build, install, run

```sh
npm run package:tizen                              # unsigned → platforms/tizen/out/telly.wgt
TIZEN_PROFILE=telly npm run package:tizen          # signed with the active-profile certificates
tizen install -n telly.wgt -t <device> -- platforms/tizen/out
tizen run -p tellyjpcio.telly -t <device>
sdb -s <device> dlog -v time | grep -i -E 'tizen\]|console' # runtime logs ("[tizen] keys registered: …")
```

Uninstall/replace: `tizen uninstall -p tellyjpcio.telly -t <device>`. Chrome
DevTools remote debugging: `tizen run -p tellyjpcio.telly -t <device>` with
_Debug as_ in Tizen Studio, or `sdb -s <device> shell 0 debug tellyjpcio.telly`
and open the printed `localhost:<port>` after `sdb forward`.

## 5. Remote keys on Tizen

Tizen hands a web app only the D-pad, Enter and Return by default. On boot,
`src/platform/tizen.ts` detects the runtime (`window.tizen`, or `Tizen` in
the UA) and calls `tizen.tvinputdevice.registerKey()` for `ChannelUp`,
`ChannelDown`, `MediaPlayPause`, `MediaRewind`, `MediaFastForward`,
`MediaPlay`, `MediaPause`, `MediaStop` — each in its own try/catch (`Exit` is deliberately NOT registered, so the TV's native exit keeps working)
and logged (`[tizen] keys registered: …; failed: …`). The TV then delivers
them as `KeyboardEvent.keyCode`s with an empty `key`, decoded once in
`src/core/input/remoteKeys.ts`:

| Tizen key        | keyCode | Decoded today  | Note                                                                        |
| ---------------- | ------- | -------------- | --------------------------------------------------------------------------- |
| Return (Back)    | 10009   | `BACK`         | mapped                                                                      |
| ChannelUp        | 427     | `CHANNEL_UP`   | mapped                                                                      |
| ChannelDown      | 428     | `CHANNEL_DOWN` | mapped                                                                      |
| MediaRewind      | 412     | `REWIND`       | mapped                                                                      |
| MediaFastForward | 417     | `FAST_FORWARD` | mapped                                                                      |
| MediaPlayPause   | 10252   | `PLAY_PAUSE`   | mapped                                                                      |
| Exit             | 10182   | native         | not registered — the TV handles Exit itself                                 |
| MediaPlay        | 415     | `PLAY_PAUSE`   | decoded by `KEY_CODE_TABLE`                                                 |
| MediaPause       | 19      | `PLAY_PAUSE`   | decoded by `KEY_CODE_TABLE`                                                 |
| MediaStop        | 413     | — (dropped)    | **gap** — not in `KEY_CODE_TABLE`; also no `MediaStop` entry in `KEY_TABLE` |
| Digits           | 48–57   | `DIGIT n`      | `key` is `'0'`–`'9'`, decoded by the character rule                         |

Those table additions belong to the input slice (`remoteKeys.ts`), not to
this platform module.

## 6. Known gaps (be explicit with QA)

1. ~~Exit is not wired~~ Done: `src/app/RootScreen.tsx` calls `exitToPlatform()`
   (`src/platform/exit.ts`) when Return finds nothing to pop, which on Tizen is
   `tizen.application.getCurrentApplication().exit()`. The **Exit** key is not
   registered, so the TV's native exit handles it from anywhere.
2. ~~MediaPlay / MediaPause codes dropped~~ Done: 415 / 19 (and the names
   `MediaPlay` / `MediaPause`) decode as Play/Pause. `MediaStop` (413) has no
   remote-key meaning in telly (Android has none either) and is ignored.
3. Nothing below Tizen 8.0 is styled (§2). Choose the supported model years
   on the Seller Portal accordingly (2024+).
4. CI builds an **unsigned** `.wgt` (§7) — download it for inspection, not for
   installing on a TV.

## 7. CI: `.github/workflows/package-tizen.yml`

- Triggers: `v*.*.*` tags and `workflow_dispatch`.
- Runs `platforms/tizen/package.sh` (unsigned zip), uploads the artifact
  `telly-tizen-wgt` (`telly-tizen-<tag|sha>-unsigned.wgt`), and on tags
  attaches it to the GitHub release (creating the release if the Xbox/webOS
  packaging workflows have not already).

### Signing in CI (later, owner's action)

Samsung certificates are personal; keep them out of the repo. When ready:

1. Base64-encode the two `.p12` files and add repository secrets
   `TIZEN_AUTHOR_P12` (base64), `TIZEN_AUTHOR_PASSWORD`,
   `TIZEN_DISTRIBUTOR_P12` (base64), `TIZEN_DISTRIBUTOR_PASSWORD`.
2. Add a step before "Build the widget" that installs the Tizen CLI
   (`web-cli_Tizen_Studio_*_ubuntu-64.bin --accept-license ~/tizen-studio`,
   add `tools/ide/bin` to `PATH`), decodes the secrets to
   `~/SamsungCertificate/telly/`, and registers the profile:

   ```sh
   tizen security-profiles add -n telly \
     -a ~/SamsungCertificate/telly/author.p12 -p "$TIZEN_AUTHOR_PASSWORD" \
     -d ~/SamsungCertificate/telly/distributor.p12 -dp "$TIZEN_DISTRIBUTOR_PASSWORD"
   ```

3. Run the build step with `TIZEN_PROFILE: telly`; `package.sh` then signs
   with `tizen package -t wgt -s telly` instead of zipping, and the asset is
   installable / submittable.

## 8. Seller Portal submission checklist (TV app QA)

Samsung's TV review is manual and strict about remote-only use. Before
uploading the signed `.wgt` at Seller Office → _Add New Application_ → TV:

- [ ] **Remote-only navigation:** every screen, sheet and dialog reachable
      with D-pad + Enter + Return (the product rule in CLAUDE.md); no element
      needs a pointer. Check the onboarding wizard's URL entry with the TV's
      on-screen keyboard.
- [ ] **Return / Exit behaviour:** Return on the first page exits (or prompts);
      Exit key exits from anywhere (native; Return at the first page exits via `exitToPlatform()`) — the shell
      calls `onExitRequested()`.
- [ ] **1080p layout** at 1920×1080 with no clipping or scrolling of the
      shell; text legible from 3 m (the 1 rem = 8 dp scale rule).
- [ ] **Launch time** under the portal's limit and no blank frame: the app
      shows the Boot/Welcome frame immediately (`Exited`/`Boot` routes).
- [ ] **Network loss** handled without a crash (unplug Ethernet during live
      playback; the player's error overlay appears; Return still works).
- [ ] **Privacy policy URL** (required field) — a public page stating that
      telly stores playlist/EPG URLs and settings only in the TV's local
      storage and sends nothing to the developer.
- [ ] **Age rating** questionnaire — telly ships no content of its own; the
      viewer supplies the playlist. Answer as a media player and say so in the
      description.
- [ ] **Store assets:** app icon and Smart Hub banner images at the sizes the
      form requests (they are separate from the widget's `icon-512.png`),
      1920×1080 screenshots of Guide, Player and Settings.
- [ ] **Supported models:** 2024 (Tizen 8.0) and newer only (§2).
- [ ] **Version:** `package.json` version → `config.xml` `version` (set by
      `package.sh`); every re-upload needs a higher version.
- [ ] Description mentions the **Stream & CORS proxy** setting for providers
      the TV cannot reach directly.

## 9. Self-check before handing over a build

1. `npm run package:tizen` exits 0; `unzip -l platforms/tizen/out/telly.wgt`
   shows `config.xml`, `index.html`, `icon-512.png` and `assets/` at the root
   (no `sw.js`).
2. `unzip -p platforms/tizen/out/telly.wgt config.xml | grep '<widget'` shows
   the `package.json` version.
3. `unzip -p platforms/tizen/out/telly.wgt index.html | grep -o 'src="[^"]*"'`
   shows only `./assets/…` URLs (relative, `file://`-safe). When experimenting
   with `TIZEN_TARGET=chrome64`,
   `unzip -p platforms/tizen/out/telly.wgt 'assets/index-*.js' | grep -o '?\.' | wc -l`
   drops from ~300 to single digits (numeric literals / regex only) — proof
   the lowered target applied; at the default `chrome108` optional chaining is
   kept on purpose.
4. Unit tests: `npx vitest run src/platform` green; gates:
   `bash scripts/quality.sh --fast`.
5. On the TV: `[tizen] keys registered: …` appears in `dlog`; CH+/CH− zap;
   Play/Pause pauses; Return pops; the Welcome → Guide → Player flow works
   with the owner's real playlist.
