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

| Machine           | States                                                                    | Owner                                | Status   | Tests                                     |
| ----------------- | ------------------------------------------------------------------------- | ------------------------------------ | -------- | ----------------------------------------- |
| Engine connection | Idle · Buffering · Playing · Reconnecting(attempt, epoch) · Ended · Error | `src/core/player/engineState.ts`     | explicit | `src/core/player/engineState.test.ts`     |
| Reconnect budget  | attempt 0..6 with backoff 1→30 s                                          | `src/core/player/reconnectPolicy.ts` | explicit | `src/core/player/reconnectPolicy.test.ts` |

<!-- Feature slices append their rows below as they land (same names as the Android catalog). -->
