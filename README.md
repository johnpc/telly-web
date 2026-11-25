<p align="center"><img src="assets/icon.png" alt="telly icon" width="128" /></p>
<h1 align="center">telly-web</h1>
<p align="center"><b>An open-source, TiviMate-style IPTV player for the web — remote-first, fully keyboard-navigable.</b></p>

telly-web is the web port of [telly](https://github.com/johnpc/telly) (Android TV) and the
sibling of [telly-apple](https://github.com/johnpc/telly-apple). Bring your own M3U playlist
and XMLTV EPG and you get the same fast TV guide, instant zapping, catch-up, DVR, VOD,
multiview, search and settings — in a browser. **Every screen is operable with arrow keys,
OK and BACK alone**, so it works on TV browsers, Xbox (Edge), Fire TV and a laptop plugged
into a TV; on a phone a soft D-pad is offered. There is no backend and there are no accounts.

> telly is an independent open-source project inspired by TiviMate's UX. It is **not
> affiliated with, endorsed by, or connected to TiviMate** or its developers in any way.

## Try it

- Hosted: `https://telly.jpc.io/` (self-hosted) or `https://johnpc.github.io/telly-web/` (GitHub Pages). Both are the
  same static build — there is no server; everything you enter stays in your browser.
- Demo playlist (no provider needed): `https://johnpc.github.io/telly/playlist.m3u` —
  31 synthetic test-card channels, a 7-day EPG, catch-up, an HLS live channel and two
  VOD titles, regenerated daily by the Android repo's demo-site workflow.

Browsers only load what the origin allows (CORS). The demo site sets the right headers;
if your provider does not, point **Settings → General → Stream & CORS proxy** at a proxy you
run — on the web it routes the streams themselves too (an https page cannot play a provider's
plain-http or CORS-less URL). The self-hosted image ships one at `/proxy/` and fills the setting
in by itself on first start.

## Remote / keyboard map

| Remote               | Keys                                   |
| -------------------- | -------------------------------------- |
| D-pad                | Arrow keys                             |
| OK / long-OK         | Enter (hold ≥ 0.5 s for long-OK)       |
| BACK                 | Escape, Backspace, hardware back       |
| CH+ / CH−            | ChannelUp/ChannelDown, PageUp/PageDown |
| MENU                 | ContextMenu, `m`                       |
| RW / FF / Play-Pause | media keys, `,` `.` `p`                |
| Digits               | 0–9 (number entry zaps)                |
| Xbox controller      | A=OK, B=BACK, D-pad/stick, LB/RB=CH±   |

## Self-host (Docker)

The image `mrorbitman/telly-web` on Docker Hub is nginx serving the static build (amd64 + arm64).
`:latest` tracks a green `main`; version tags follow releases.

```sh
docker run -d --name telly-web -p 127.0.0.1:8002:80 mrorbitman/telly-web:latest
```

See `docker/compose.example.yaml`. Put your own TLS reverse proxy in front for anything beyond
localhost; the container itself has no auth and stores nothing.

## TV app stores

The same build ships as a store app; each wrapper is a runtime no-op elsewhere:

| Platform                 | Package                                    | Recipe                                         |
| ------------------------ | ------------------------------------------ | ---------------------------------------------- |
| Xbox / Microsoft Store   | PWA → MSIX via PWABuilder (`package-xbox`) | [docs/release-xbox.md](docs/release-xbox.md)   |
| LG webOS (webOS 22+)     | `npm run package:webos` → `.ipk`           | [docs/release-webos.md](docs/release-webos.md) |
| Samsung Tizen (Tizen 8+) | `npm run package:tizen` → `.wgt`           | [docs/release-tizen.md](docs/release-tizen.md) |

## Development

Start with [CLAUDE.md](CLAUDE.md) (charter, gates, decisions log) and [AGENTS.md](AGENTS.md).

```sh
npm install
npm run dev          # http://127.0.0.1:5173
npm run quality      # every gate (what CI runs)
npm run e2e          # Gherkin acceptance over the hermetic fixture server
```

### Quality gates

Every commit passes `scripts/quality.sh` (pre-commit hook + CI): typecheck, eslint (no
`any`, explicit return types), prettier, ≤ 100 logic lines per file, ≥ 80 % line coverage,
per-function CRAP ≤ 15 and Halstead difficulty ≤ 20, zero duplication, every `.feature`
mapped in the CI matrix, a live state-machine catalog, a green build and every acceptance
scenario green. Thresholds are never loosened — the code gets fixed instead.

### There is no such thing as a flaky test

A test that passes only sometimes is a failing test with a race in it. CI must pass
reliably on every run: `retries: 0`, no `test.skip`, no raised timeouts, no re-run to
green. Find the race, wait on a real condition (an element, a `data-state` attribute, a
`video` event — never a sleep), pin the fix in the shared harness (`e2e/steps/world.ts`),
and add a unit test when the race is in logic. The full rule is in [AGENTS.md](AGENTS.md).

### The fake backend (CI never touches a real provider)

Acceptance runs against a hermetic fixture server, not the internet and never a private
provider: `e2e/fixtures/gen-fixtures.mjs` (the same generator as the Android repo) writes a
self-contained static site — playlist, EPG (+ `.gz`, + a second source), logos and short
H.264/AAC MPEG-TS, HLS and MP4 streams — re-anchored to "now" per run, and
`e2e/fixtures/serve.mjs` serves it on `127.0.0.1:8090` with CORS and Range exactly like
GitHub Pages does for the public demo. Everything in `e2e/fixtures/` is public, synthetic
content. One leg, `playback-throttled`, starts that server with `FIXTURE_THROTTLE=realtime
FIXTURE_PREROLL_SEC=2` (`npm run e2e:throttled`): every `.ts` body is paced at the
stream's own bitrate after a 2 s burst, like a real provider's ~1× pipe, so CI proves the
buffer gate waits for its runway and plays on without rebuffering instead of only ever
seeing a disk-speed burst.

### Parity with Android

The 13 Gherkin feature files under `e2e/features/` are copied from the Android repo and are
the parity contract (167 scenarios). Steps drive the web app with **keyboard presses only**.
`scripts/side-by-side.sh <area>` records the same area on the web app (Playwright) and on
telly running in the Android TV emulator, stacked into one video for review.

## License

MIT — see [LICENSE](LICENSE).
