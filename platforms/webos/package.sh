#!/usr/bin/env bash
# Builds the LG webOS package: platforms/webos/out/io.jpc.telly_<version>_all.ipk
#
#   npm run package:webos                 # same as: bash platforms/webos/package.sh
#   ARES_PACKAGE="ares-package" bash platforms/webos/package.sh   # use a globally installed CLI
#
# Steps: typecheck + `vite build` with VITE_BASE=./ (the TV loads the app from a
# file:// root, so every asset URL must be relative), stage dist/ + appinfo.json
# (version copied from package.json) + the 80/130 px icons, then `ares-package`
# (npm @webos-tools/cli, fetched with npx — it is not a devDependency because it
# drags eslint 8 and friends into `npm ci` for one packaging step).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

APP_ID="io.jpc.telly"
VERSION="$(node -p "require('./package.json').version")"
OUT="platforms/webos/out"
STAGE="$OUT/stage"
IPK="$OUT/${APP_ID}_${VERSION}_all.ipk"
WEBOS_CLI_VERSION="${WEBOS_CLI_VERSION:-3.2.6}"
ARES_PACKAGE="${ARES_PACKAGE:-npx -y -p @webos-tools/cli@${WEBOS_CLI_VERSION} ares-package}"

step() { printf '\n=== %s ===\n' "$1"; }

step "build (VITE_BASE=./, relative asset URLs for the file:// app root)"
npx tsc -b
rm -rf "$STAGE"
VITE_BASE=./ VITE_APP_VERSION="${VITE_APP_VERSION:-$VERSION}" npx vite build --outDir "$STAGE" --emptyOutDir

step "stage appinfo.json (version $VERSION) + icons"
node -e '
  const fs = require("node:fs");
  const [src, dst, version] = process.argv.slice(1);
  const info = JSON.parse(fs.readFileSync(src, "utf8"));
  info.version = version;
  fs.writeFileSync(dst, JSON.stringify(info, null, 2) + "\n");
' platforms/webos/appinfo.json "$STAGE/appinfo.json" "$VERSION"
cp platforms/webos/icon.png platforms/webos/largeIcon.png "$STAGE/"
grep -q 'href="\./' "$STAGE/index.html" || { echo "index.html is not using relative URLs" >&2; exit 1; }

step "ares-package"
rm -f "$OUT"/*.ipk
# --no-minify: the Vite output is already minified; ares' own minifier is not needed and can break it.
$ARES_PACKAGE --no-minify --outdir "$OUT" "$STAGE"

step "result"
test -f "$IPK" || { echo "expected $IPK" >&2; ls -la "$OUT" >&2; exit 1; }
# The staging tree is scratch (and would trip `prettier --check .`); the .ipk is the artifact.
rm -rf "$STAGE"
ls -la "$IPK"
printf 'IPK=%s\n' "$IPK"
