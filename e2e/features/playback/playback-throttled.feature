@playback-throttled
Feature: Live playback over a real-time pipe
  A real provider is a strict ~1x pipe that opens with a ~2 s pre-roll burst
  (decisions log 2026-11-23); the fixture server's disk-speed burst can never
  show that. This leg serves the same fixture paced at the stream's own bitrate
  (FIXTURE_THROTTLE=realtime, FIXTURE_PREROLL_SEC=2, `npm run e2e:throttled`)
  and proves the buffer gate the way the real-provider probe does: the first
  frame waits for the Small runway (6 s), a pre-roll burst does not start
  playback early, and a 1x pipe plays on without rebuffering. Measurements
  read the <video> (data-state transitions, `buffered`, `waiting` events)
  through a probe installed before the app loads; the user still only presses
  keys.

  Background:
    Given the fixture server paces streams at real-time rate with a 2 second pre-roll burst
    And the fixture playlist and EPG are served from "http://127.0.0.1:8090"
    And I completed the add-playlist wizard

  # With a 6 s runway and a 2 s pre-roll the first frame cannot come before
  # 4 s of wall time (the other 4 s of media have to arrive at 1x); 3 s is the
  # bar with margin. A gate that started on the first byte would play in < 1 s.
  Scenario: The first frame waits for the buffer runway, not the first byte
    Then playback starts fullscreen on channel 1 "News One"
    And the video surface stays Buffering for at least 3 seconds before the first frame
    And the first frame plays with at least 5 seconds of runway buffered

  # Android's short start runway (1.5 s) would have started on the burst; the
  # runway is seen passing 2 s while the surface is still Buffering. The zap
  # goes to channel 7: channels 1-6 share one fixture stream and the engine
  # keeps a same-URL stream running instead of re-tuning it.
  Scenario: A pre-roll burst does not start playback early
    Given playback goes fullscreen on channel 1 "News One"
    And I zapped to channel 7 "Sports Arena"
    Then the buffered runway passes 2 seconds while the video surface is still Buffering
    And the video surface stays Buffering for at least 3 seconds before the first frame
    And the first frame plays with at least 5 seconds of runway buffered

  # 30 s of media at 1x is 30 s of wall time on top of the runway: the budget
  # is the observation window, not slack for a race.
  @timeout:90000
  Scenario: Playback does not rebuffer over 30 seconds at real-time rate
    Given playback goes fullscreen on channel 1 "News One"
    Then playback runs for 30 seconds without rebuffering
