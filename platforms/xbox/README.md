# telly on Xbox (Microsoft Store PWA)

Xbox runs web apps as **PWAs packaged into an MSIX** that wraps Edge/WebView2
around `https://telly.jpc.io`. Nothing in this folder is built into the site; the
site itself is the app. What makes it installable and console-friendly lives in
the main tree:

| Concern                 | Where                                                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web app manifest        | `public/manifest.webmanifest` (id, fullscreen + landscape, 192/512/1024 icons, categories)                                                                        |
| Offline app shell       | `public/sw.js` — network-first start document, cache-first `assets/*`; playlists, EPG, streams and `/proxy/` are never intercepted                                |
| Registration            | `src/platform/pwa.ts` (`bootPwa()` from `bootPlatform()`), production builds only — never under `vite dev` or the `?e2e` harness                                  |
| Controller → remote key | `src/core/input/gamepadKeys.ts` — `GamepadA` OK, `GamepadB` BACK, D-pad/left stick arrows, bumpers CH−/CH+, triggers RW/FF, `GamepadX` play/pause, Menu/View MENU |
| TV-safe area            | `src/platform/pwa.css` — `html.tv-safe-area #root { padding: var(--tv-safe-inset) }` (2.5 vw ≈ 48 px at 1080p), class set only when the UA contains `Xbox`        |
| Store package options   | `platforms/xbox/pwabuilder.json` — the PWABuilder Windows request body with every non-secret field filled                                                         |
| Packaging automation    | `.github/workflows/package-xbox.yml` — `workflow_dispatch`, calls the PWABuilder Windows service, uploads the zip                                                 |

The step-by-step release procedure (Partner Center, PWABuilder, Developer Mode
sideload, submission) is in [`docs/release-xbox.md`](../../docs/release-xbox.md).

## Verifying locally (no Xbox needed)

```sh
npx vite build --outDir /tmp/telly-dist
npx vite preview --outDir /tmp/telly-dist --port 4176
```

Open `http://127.0.0.1:4176/` in Chromium/Edge: DevTools → Application shows the
manifest and an **activated, controlling** service worker; reload, then tick
"Offline" and reload again — the Welcome screen still renders from the cached
shell. To preview the Xbox safe area, set the DevTools device user agent to one
containing `Xbox` (e.g. `Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox
Series X) …`): `<html class="tv-safe-area">` appears and `#root` gains the inset.

## Controller map (Edge on Xbox, key names from `KeyboardEvent.key`)

| Controller         | `key`                                          | telly        |
| ------------------ | ---------------------------------------------- | ------------ |
| A                  | `GamepadA`                                     | OK           |
| B                  | `GamepadB`                                     | BACK         |
| X                  | `GamepadX`                                     | Play / pause |
| Y                  | `GamepadY`                                     | (unassigned) |
| D-pad / left stick | `GamepadDPad*`, `GamepadLeftThumbstick*`       | Arrows       |
| LB / RB            | `GamepadLeftShoulder` / `GamepadRightShoulder` | CH− / CH+    |
| LT / RT            | `GamepadLeftTrigger` / `GamepadRightTrigger`   | Rewind / FF  |
| Menu / View        | `GamepadMenu` / `GamepadView`                  | MENU         |

In Edge's default "mouse" mode the stick drives a pointer and A clicks; the
D-pad also emits plain `ArrowUp`/`ArrowDown`/… which telly already decodes.
