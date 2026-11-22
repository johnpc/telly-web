# State machines in telly-web

Every "mode" the app can be in is a state machine. This catalog mirrors the
Android repo's `docs/state-machines.md` (same names, same states) so parity
can be checked row by row. `scripts/check-state-machines.mjs` verifies that
every cited `owner`/`tests` path exists and that every `explicit` row's
owner carries a `// @stateMachine('<row name>')` marker, both ways.

**One mode, one owner.** A mode is ONE discriminated union, written in ONE
place; readers derive from it. No boolean + nullable + counter trios, no
consume-once flags, no sentinel encodings. Timers are part of the state.

Status: `explicit` = union + single owner + marker + tests · `guarded` =
state still split but every invalid transition is rejected at its owner +
tested · `implicit` = known gap, listed so nobody re-discovers it.

## Core

| Machine              | States                                                            | Owner                               | Status   | Tests                                    |
| -------------------- | ----------------------------------------------------------------- | ----------------------------------- | -------- | ---------------------------------------- |
| Navigator            | typed back stack (push / pop / replaceAll)                        | `src/core/navigation/navigator.ts`  | explicit | `src/core/navigation/navigator.test.ts`  |
| Long-press detection | Idle · Held · HoldFired                                           | `src/core/input/holdKeyDetector.ts` | explicit | `src/core/input/holdKeyDetector.test.ts` |
| Focus engine         | one focused node per scope stack; a modal scope traps every arrow | `src/core/focus/focusEngine.ts`     | explicit | `src/core/focus/focusEngine.test.ts`     |

## Player and playback

| Machine                 | States                                                                                                                                       | Owner                                                                                                                     | Status   | Tests                                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Engine connection       | Idle · Buffering · Playing · Reconnecting(attempt, epoch — retry armed, epoch-cancelled by load/stop/release/READY) · Ended · Error(message) | `src/core/player/engineState.ts` (written only via `EngineStateStore`; retries in `src/core/player/engineReconnector.ts`) | explicit | `src/core/player/engineState.test.ts`, `src/core/player/engineReconnector.test.ts`, `src/core/player/webPlayerEngine.test.ts` |
| Reconnect budget        | attempt 0..6 with backoff 1→30 s                                                                                                             | `src/core/player/reconnectPolicy.ts`                                                                                      | explicit | `src/core/player/reconnectPolicy.test.ts`                                                                                     |
| Stall detector          | Healthy · FrozenRun(n) · BufferingRun(n)                                                                                                     | `src/core/player/stallDetector.ts` (sampled by `src/core/player/stallWatchdog.ts`)                                        | explicit | `src/core/player/stallDetector.test.ts`, `src/core/player/stallWatchdog.test.ts`                                              |
| Playback health monitor | Rendering · VideoFrozen(since) per engine, plus logged state transitions — observation only, never drives playback                           | `src/core/player/playbackTelemetry.ts`, fed by `src/core/player/telemetryAnalytics.ts`                                    | explicit | `src/core/player/playbackTelemetry.test.ts`, `src/core/player/telemetryAnalytics.test.ts`                                     |

## Data foundation (playlist / EPG)

| Machine                 | States                                                                                                                                                                                                                                                                                                                                                 | Owner                                                                             | Status   | Tests                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| Background refresh gate | Idle · Running(name) · TimedOut(abandoned) — EPG refreshes and playlist imports run one at a time, each bounded by a wall-clock timeout                                                                                                                                                                                                                | `src/core/refresh/refreshGate.ts` (one shared instance `sharedRefreshGate`)       | explicit | `src/core/refresh/refreshGate.test.ts`                                                                                   |
| EPG freshness           | `EpgFreshness` NeverFetched · Fresh(at) · Failed(failedAt, lastSuccess) — read off two PERSISTED stamps (`playlists.epgLastUpdatedMs` / `epgFailedAtMs`), backoff 5 min survives reloads; "Update EPG on playlists change" reacts only to EPG-relevant playlist changes (`src/features/epg/epgTriggers.ts`), never to the refresher's own stamp writes | `src/features/epg/epgFreshness.ts`, applied by `src/features/epg/epgRefresher.ts` | explicit | `src/features/epg/epgFreshness.test.ts`, `src/features/epg/epgRefresher.test.ts`, `src/features/epg/epgTriggers.test.ts` |

<!-- Feature slices append their rows below as they land (same names as the Android catalog). -->

## Slice fragments

Each feature slice keeps its rows in `docs/state-machines/<slice>.md` (same
table columns, same machine names as the Android catalog). The gate reads
this file plus every fragment.
