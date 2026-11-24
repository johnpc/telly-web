#!/usr/bin/env bash
# Builds the Samsung Tizen (Smart TV) widget: platforms/tizen/out/telly.wgt
#
#   bash platforms/tizen/package.sh            # unsigned development .wgt (plain zip)
#   TIZEN_PROFILE=telly bash platforms/tizen/package.sh   # signed, when the `tizen` CLI is installed
#
# Steps: `vite build` with VITE_BASE=./ (the widget is served from file://, so
# every asset URL must be relative) into a temporary staging folder, add
# config.xml (version synced from package.json) and the 512x512 icon, then zip
# the staged folder. Only telly.wgt is left under out/ (a staged html/js tree
# inside the repo would trip `prettier --check .`); inspect it with `unzip -l`
# or `unzip -p telly.wgt config.xml`.
# A plain zip IS a valid *unsigned* .wgt: fine for inspection and for the
# Tizen emulator, but a real TV and the Seller Portal require the package to be
# signed with the owner's Samsung author + distributor certificates —
# `tizen package -t wgt -s <profile>` (see docs/release-tizen.md).
#
# Env:
#   TIZEN_TARGET   esbuild target for this build only (default chrome108 = Tizen
#                  8.0, the oldest firmware whose Chromium renders Tailwind v4's
#                  `@layer` CSS; the default web build is NOT changed).
#   TIZEN_PROFILE  Tizen certificate profile name; signs the .wgt when `tizen` exists.
#   VITE_APP_VERSION  shown in Settings → About (defaults to the git short sha).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HERE="$ROOT/platforms/tizen"
OUT="$HERE/out"
WGT="$OUT/telly.wgt"
TARGET="${TIZEN_TARGET:-chrome108}"
VERSION="$(node -p "require('$ROOT/package.json').version")"
APP_VERSION="${VITE_APP_VERSION:-$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo dev)}"
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/telly-tizen-stage.XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT

echo "==> telly $VERSION ($APP_VERSION) → Tizen widget, esbuild target $TARGET"
rm -rf "$OUT"
mkdir -p "$OUT"

echo "==> vite build (VITE_BASE=./) → $STAGE"
(cd "$ROOT" && VITE_BASE=./ VITE_APP_VERSION="$APP_VERSION" \
  npx vite build --target "$TARGET" --outDir "$STAGE" --emptyOutDir --logLevel warn)

echo "==> stage config.xml (version $VERSION) + icon"
sed -E "s/(<widget[^>]*version=\")[^\"]*(\")/\1${VERSION}\2/" "$HERE/config.xml" > "$STAGE/config.xml"
grep -q "version=\"$VERSION\"" "$STAGE/config.xml"
cp "$ROOT/public/icon-512.png" "$STAGE/icon-512.png"
# Tizen's WRT serves the widget from file://; the service worker (Xbox PWA) cannot
# register there and must not be shipped as a dead file.
rm -f "$STAGE/sw.js"

if [ -n "${TIZEN_PROFILE:-}" ] && command -v tizen >/dev/null 2>&1; then
  echo "==> tizen package -t wgt -s $TIZEN_PROFILE (signed)"
  tizen package -t wgt -s "$TIZEN_PROFILE" -- "$STAGE" >/dev/null
  mv "$STAGE"/*.wgt "$WGT"
else
  echo "==> zip (unsigned development package; sign with the tizen CLI before installing on a TV)"
  (cd "$STAGE" && zip -qr -X "$WGT" . -x '*.DS_Store')
fi

echo "==> $WGT"
unzip -l "$WGT"
