@multiview
Feature: Multiview on a provider that allows one stream at a time
  Web honesty (decisions log 2026-11-24): measured on the real provider
  through the relay, the line carries ONE stream — a second concurrent
  connection gets HTTP 200 with a ~710 KB "too many connections" slate that
  then ends. Android shows only the teaser hint ("Your IPTV provider may limit
  the number of concurrent connections"); telly-web learns the limit from the
  first slate (`Provider stream limit`), tells the pane so instead of looping
  the reconnector on it, and refuses further second streams on that line
  without connecting. Fullscreen playback of a single stream is unaffected.
  The hermetic provider lives in e2e/steps/streamLimit.steps.ts.

  Background:
    Given the fixture playlist and EPG are served from "http://127.0.0.1:8090"
    And I completed the add-playlist wizard
    And the provider allows one stream at a time

  Scenario: Fullscreen playback of a single stream is unaffected by the one-stream line
    Then playback goes fullscreen on channel 1 "News One"

  Scenario: A second screen on a one-stream provider shows the message in its pane, and nothing loops
    Given I opened multiview
    When I press ok
    And I select "Add screen"
    And I pick the channel "Sports Arena" in the multiview picker
    Then I see 2 multiview panes
    And the multiview pane "Sports Arena" says "Your provider allows one stream at a time"
    And the multiview pane "Sports Arena" is in the "Error" state
    And the multiview pane "News One" is still streaming
    And the provider is not asked again for the stream "sports-arena"

  Scenario: Once the line is known to carry one stream, another second screen says so without connecting
    Given I opened multiview
    When I press ok
    And I select "Add screen"
    And I pick the channel "Sports Arena" in the multiview picker
    Then the multiview pane "Sports Arena" says "Your provider allows one stream at a time"
    When I press ok
    And I select "Change channel"
    And I pick the channel "Movie House" in the multiview picker
    Then the multiview pane "Movie House" says "Your provider allows one stream at a time"
    And the multiview pane "News One" is still streaming
    And the provider was never asked for the stream "movie-house"
