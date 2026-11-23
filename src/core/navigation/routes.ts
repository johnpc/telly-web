// Typed destinations for the app's hand-rolled back stack. Ported 1:1 from
// Android `core/navigation/Route.kt` (same names, same payloads).

export type Route =
  /** Cold-start skeleton (#131619 frame) shown while the database resolves. */
  | { kind: 'Boot' }
  /** First-run landing screen ("telly doesn't provide any sources..."). */
  | { kind: 'Welcome' }
  /** The two-pane settings sheet, rendered over the current base route. */
  | { kind: 'Settings' }
  /** The add-playlist wizard (type chooser -> URL -> processing -> name). */
  | { kind: 'AddPlaylistWizard' }
  /** Fullscreen playback of the last-watched channel; the app's main screen. */
  | { kind: 'Playback' }
  /** The TV guide: preview window + info pane over the programme grid. */
  | { kind: 'Guide' }
  /** TiviMate-style search screen. */
  | { kind: 'Search' }
  /** Multiview grid from the quick-bar's Multiview slot. */
  | { kind: 'Multiview' }
  /** The full-screen History list behind the info overlay's History card; BACK pops to the player. */
  | { kind: 'History' }
  /** Saved programmes behind the guide rail's bookmark icon. */
  | { kind: 'MyList' }
  /** The context sheet's "Manage Favorites" screen. */
  | { kind: 'ManageFavorites' }
  /** The context sheet's "Reorder channels" screen, on the sheet's group. */
  | { kind: 'ReorderChannels'; group: string }
  /** The Channel-options pane's bulk "Channel names editor" list. */
  | { kind: 'ChannelNamesEditor' }
  /** The VOD "Movies" browser behind the guide rail's film icon. */
  | { kind: 'Vod' }
  /** Fullscreen seekable playback of one VOD item, keyed for resume. */
  | { kind: 'VodPlayback'; itemKey: string }
  /** The Recordings / DVR library; BACK pops back to wherever it was opened from. */
  | { kind: 'Recordings' }
  /** Web-only: where Android would `finish()`, the shell shows the exited frame (OK starts over). */
  | { kind: 'Exited' };

export type RouteKind = Route['kind'];

/** Structural equality (routes are plain data). */
export function sameRoute(a: Route, b: Route): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
