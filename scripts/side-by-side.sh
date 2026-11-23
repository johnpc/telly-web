#!/usr/bin/env bash
# Side-by-side parity recording: the SAME Gherkin area runs on the web app
# (Playwright, video on) and on the Android telly app (cucumber-android on the
# Mac mini's Android TV emulator, screenrecord on), then ffmpeg stacks the two
# into artifacts/side-by-side-<area>.mp4 (web left, Android right).
#
# Usage: scripts/side-by-side.sh <area> [scenario-regex]
#   area            an e2e feature tag, e.g. tv-guide (must exist in BOTH repos)
#   scenario-regex  optional: limit the web side to matching scenario titles
# Env: MINI=john@johns-Mac-Mini.local  ANDROID_REPO=~/repo/telly (local tree
#      rsynced to the mini's ~/repo/telly, as the Android AGENTS.md prescribes)
set -euo pipefail
AREA="${1:?usage: side-by-side.sh <area> [scenario-regex]}"
GREP="${2:-}"
MINI="${MINI:-john@johns-Mac-Mini.local}"
ANDROID_REPO="${ANDROID_REPO:-$HOME/repo/telly}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
OUT="artifacts/side-by-side/$AREA"
rm -rf "$OUT" && mkdir -p "$OUT/web" "$OUT/android"

step() { printf '\n=== %s ===\n' "$1"; }

step "web: record @$AREA with Playwright (production build on its own port)"
export E2E_PORT="${E2E_PORT:-4174}" E2E_PREVIEW=1
[ -d dist ] || npx vite build >/dev/null
E2E_TAG="$AREA" E2E_VIDEO=1 npx bddgen >/dev/null
E2E_TAG="$AREA" E2E_VIDEO=1 npx playwright test --output "$OUT/web-results" ${GREP:+-g "$GREP"} || echo "(web scenarios failed — recording kept)"
# Every scenario records a `video.webm`; copy them in execution (mtime) order under unique names.
i=0
for f in $(find "$OUT/web-results" -name '*.webm' -print0 | xargs -0 ls -tr); do
  i=$((i+1)); cp "$f" "$OUT/web/$(printf '%03d' $i).webm"
done

step "android: sync tree + run @$AREA on the mini with screenrecord"
rsync -az --delete --exclude build --exclude .gradle --exclude '*/build' --exclude .git \
  --exclude docs/reference "$ANDROID_REPO/" "$MINI:~/repo/telly/"
# The remote script travels as a FILE: fed over stdin, Gradle/adb would swallow the rest of it.
cat > "$OUT/remote.sh" <<'REMOTE'
set -uo pipefail
AREA="$1"
A=/opt/homebrew/share/android-commandlinetools
export PATH=$A/platform-tools:$A/emulator:$HOME/actions-toolcache/node/22.23.4/arm64/bin:$PATH
export JAVA_HOME=$(/usr/libexec/java_home -v 17) ANDROID_HOME=$A
cd ~/repo/telly
# Another repo's CI job may own the mini: wait for it (up to 20 min) rather than fight over the emulator.
for _ in $(seq 1 80); do pgrep -fl Runner.Worker >/dev/null || break; sleep 15; done
if pgrep -fl Runner.Worker >/dev/null; then echo "CI job still running on the mini after 20 min — giving up" >&2; exit 2; fi
trap 'bash scripts/emulator.sh stop >/dev/null 2>&1 || true' EXIT
bash scripts/emulator.sh stop >/dev/null 2>&1 || true
bash scripts/emulator.sh start telly-tv36
rm -rf /tmp/sbs && mkdir -p /tmp/sbs
# screenrecord caps each file at 3 min: chain clips until the leg finishes.
( i=0; while [ ! -f /tmp/sbs/done ]; do adb shell screenrecord --size 1280x720 --time-limit 180 /sdcard/sbs-$i.mp4; i=$((i+1)); done ) &
REC=$!
bash scripts/ci-acceptance.sh "$AREA" </dev/null || echo "(android scenarios failed — recording kept)"
touch /tmp/sbs/done; sleep 1; adb shell pkill -INT screenrecord || true; wait $REC || true; sleep 2
for f in $(adb shell ls /sdcard/sbs-*.mp4 | tr -d '\r'); do adb pull "$f" /tmp/sbs/ >/dev/null; adb shell rm "$f"; done
ls /tmp/sbs
REMOTE
scp -q "$OUT/remote.sh" "$MINI:/tmp/sbs-remote.sh"
ssh "$MINI" "bash /tmp/sbs-remote.sh '$AREA'" </dev/null
scp -q "$MINI:/tmp/sbs/*.mp4" "$OUT/android/" || true

step "stack with ffmpeg"
ls "$OUT"/web/*.webm >/dev/null 2>&1 || { echo "no web recordings"; exit 1; }
ls "$OUT"/android/*.mp4 >/dev/null 2>&1 || { echo "no android recordings"; exit 1; }
for f in "$OUT"/web/*.webm; do echo "file '$(pwd)/$f'"; done > "$OUT/web.txt"
for f in $(ls "$OUT"/android/*.mp4 | sort -V); do echo "file '$(pwd)/$f'"; done > "$OUT/android.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$OUT/web.txt" -c copy "$OUT/web.webm" 2>/dev/null || \
  ffmpeg -y -loglevel error -f concat -safe 0 -i "$OUT/web.txt" "$OUT/web.webm"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$OUT/android.txt" -c copy "$OUT/android.mp4"
# Web on the LEFT, Android on the RIGHT (no text labels: this ffmpeg has no drawtext filter).
ffmpeg -y -loglevel error -i "$OUT/web.webm" -i "$OUT/android.mp4" -filter_complex \
  "[0:v]scale=960:540:force_original_aspect_ratio=decrease,pad=960:540:(ow-iw)/2:(oh-ih)/2,setsar=1[l];\
   [1:v]scale=960:540:force_original_aspect_ratio=decrease,pad=960:540:(ow-iw)/2:(oh-ih)/2,setsar=1[r];\
   [l][r]hstack=inputs=2[v]" -map "[v]" -r 30 -pix_fmt yuv420p "artifacts/side-by-side-$AREA.mp4"
echo "wrote artifacts/side-by-side-$AREA.mp4"
