# Releasing telly to Xbox (Microsoft Store)

Xbox apps built from the web are **PWAs wrapped in an MSIX**: the Store entry
points Edge/WebView2 at `https://telly.jpc.io`, so a site deploy is the app
update — the Store package only needs re-submitting when the manifest, icons or
identity change. Everything below is the owner's checklist; the technical parts
(manifest, service worker, controller keys, safe area) are already in the tree —
see [`platforms/xbox/README.md`](../platforms/xbox/README.md).

## 0. One-time accounts

1. **Partner Center developer account** — <https://partner.microsoft.com/dashboard>
   (individual account, one-time fee). Enable the **Xbox** program under
   _Account settings → Programs_ ("Xbox Live Creators Program" is NOT needed for
   a PWA; the plain Windows/Xbox Store submission is enough).
2. **Xbox Developer Mode** on the test console (free once the account exists):
   install the _Xbox Dev Mode_ app from the console's Store, enter the code at
   <https://partner.microsoft.com/xboxconfig/devices>, let the console switch to
   Developer Mode. It shows the **Device Portal** address (`https://<console-ip>:11443`).

## 1. Reserve the name and read the identity

Partner Center → _Apps and games → New product → MSIX or PWA app_ → reserve
**telly** (if taken, the fallback is `telly IPTV`). Then open _Product
management → Product identity_ and copy three values:

| Partner Center field                    | Variable              | Looks like                 |
| --------------------------------------- | --------------------- | -------------------------- |
| Package/Identity/Name                   | `XBOX_PACKAGE_ID`     | `12345JohnCorser.telly`    |
| Package/Identity/Publisher              | `XBOX_PUBLISHER_ID`   | `CN=0a1b2c3d-…-…` (a GUID) |
| Package/Properties/PublisherDisplayName | `XBOX_PUBLISHER_NAME` | `John Corser`              |

Store them as **repository variables** (GitHub → Settings → Secrets and
variables → Actions → Variables). None is secret.

## 2. Build the MSIX

### Option A — pwabuilder.com (the GUI)

1. <https://www.pwabuilder.com> → enter `https://telly.jpc.io` → _Start_.
2. The report card should be all green (manifest, service worker, HTTPS). Fix
   anything red in the tree, never in PWABuilder's editor.
3. _Package for stores → Windows → Generate package_. In the form:
   - **Package ID** = `XBOX_PACKAGE_ID`, **Publisher ID** = `XBOX_PUBLISHER_ID`,
     **Publisher display name** = `XBOX_PUBLISHER_NAME`.
   - _All settings_ → **App version** `1.0.0.0` (later releases must be greater and
     end in `.0`), **Device families**: tick **Xbox** (and Desktop if you also
     want the Windows Store listing). Leave _Classic package_ off.
4. _Download package_ → a zip with `telly.msixbundle` (Store upload),
   `telly.msix` (sideload/test) and a `readme.html`.

### Option B — the workflow (same service, no browser)

`@pwabuilder/cli` is deprecated; the packaging service behind pwabuilder.com is
public and takes the JSON in `platforms/xbox/pwabuilder.json`:

```
POST https://pwabuilder-winserver.centralus.cloudapp.azure.com/msix/generatezip
Content-Type: application/json
{ "name": "telly", "packageId": "…", "url": "https://telly.jpc.io/", "version": "1.0.0.0",
  "publisher": { "displayName": "…", "commonName": "CN=…" }, "manifestUrl": "…", "manifest": {…}, … }
```

GitHub → _Actions → Package (Xbox / Microsoft Store MSIX) → Run workflow_
(inputs: site URL, version). With the three variables set it uploads
`telly-xbox-msix-<version>` as a run artifact; without them it stops green with
a notice saying which variable is missing. Locally the same call is

```sh
jq 'del(._comment,._display) | .packageId="…" | .publisher.commonName="CN=…" | .publisher.displayName="…"' \
  platforms/xbox/pwabuilder.json > /tmp/req.json
curl --fail -H 'Content-Type: application/json' -H 'platform-identifier: PWABuilder' \
  --data @/tmp/req.json -o /tmp/telly-xbox.zip \
  https://pwabuilder-winserver.centralus.cloudapp.azure.com/msix/generatezip
```

## 3. Test on the console (Developer Mode)

1. On the console open _Dev Home_; on a PC browse to the Device Portal
   (`https://<console-ip>:11443`, accept the self-signed cert, pair with the PIN shown).
2. _Add_ → pick `telly.msix` from the zip (the unsigned test package installs in
   Dev Mode; the `.msixbundle` is for the Store only) → _Start_.
3. The app appears in Dev Home → _Games & apps_. Launch it and check with a
   controller:
   - A opens / B goes back everywhere; D-pad and left stick move focus; LB/RB zap;
     LT/RT rewind / fast-forward in catch-up; X pauses; Menu/View open the menu.
   - Content sits inside the safe area (`<html class="tv-safe-area">` — nothing
     touches the TV edge; compare with the Welcome screen in a desktop browser).
   - Add the demo playlist `https://johnpc.github.io/telly/playlist.m3u`; live
     video, the guide and the panel behave as on telly.jpc.io.
   - Pull the network cable, relaunch: the Welcome/last screen still renders
     (cached shell); the stream itself needs the network, as expected.
4. Switch the console back to Retail Mode from Dev Home when done.

## 4. Submit

Partner Center → the **telly** product → _Start your submission_:

1. **Packages**: upload `telly.msixbundle`; under _Device family availability_
   tick **Xbox** (Series X|S + One) — and Windows 10/11 desktop if wanted.
2. **Properties**: category _Entertainment_; declare _This app can access
   content on the internet_; no in-app purchases.
3. **Age ratings**: IARC questionnaire (no user-generated content; the user
   brings their own playlist).
4. **Store listing** (English): description from the README, 1920×1080 Xbox
   screenshots (take them from the Dev Mode console via the Device Portal
   _Media capture_, or from a 1920×1080 browser window), the 1024×1024 icon.
5. **Submission options**: _Publish as soon as it passes certification_;
   notes for certification: "Bring-your-own-playlist IPTV player; test with the
   public demo playlist https://johnpc.github.io/telly/playlist.m3u — no account needed."
6. _Submit to the Store_. Certification normally takes 1–3 business days.

## 5. Updating

- **Site changes**: deploy as usual; the installed app picks them up on the next
  launch (network-first shell, new hashed assets, old ones pruned by `sw.js`).
- **Manifest / icon / identity changes**: regenerate the package with a higher
  version (`1.0.1.0`, …) and submit a new package in Partner Center.

## What could not be verified without a console

Everything above the Store boundary was verified in Chromium against the
production build (manifest fetched, worker registered and controlling, offline
reload renders the Welcome screen, `tv-safe-area` applied under an Xbox UA).
Not verified here: the exact `Gamepad*` key names on current Edge-on-Xbox builds
(taken from Microsoft's WebView2/Edge documentation), the Device Portal sideload
flow, and certification itself.
