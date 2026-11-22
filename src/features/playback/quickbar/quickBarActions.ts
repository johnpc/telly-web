import type { PlayerEngine } from '@/core/player';
import { enterPip } from '@/features/pip/pipEnter';
import { DISMISS, show } from '../overlay/playbackCommands';
import type { PlaybackController } from '../playbackController';
import { pickerKindOf } from '../tracks/trackPickerKind';
import type { QuickBarAction } from './quickBar';

/** Quick-bar OK: every slot is live — navigation, PIP or a track picker (ux-spec §3.14). */
export function onQuickBarAction(
  ctl: PlaybackController,
  engine: PlayerEngine,
  action: QuickBarAction,
): void {
  switch (action) {
    case 'Channels list':
      return ctl.commands.openPanel();
    case 'Search':
      return leave(ctl, () => ctl.nav.openSearch());
    case 'Multiview':
      return leave(ctl, () => ctl.nav.openMultiview());
    case 'Recordings':
      return leave(ctl, () => ctl.nav.openRecordings());
    case 'Picture-in-picture':
      void enterPip(engine.video, () => ctl.commands.execute(DISMISS));
      return;
    default: {
      const picker = pickerKindOf(action);
      if (picker !== null)
        ctl.commands.execute(show({ kind: 'TrackPicker', picker, back: { kind: 'None' } }));
    }
  }
}

/** Routes open over bare playback: no stale quick-bar behind the pushed screen. */
function leave(ctl: PlaybackController, open: () => void): void {
  ctl.commands.execute(DISMISS);
  open();
}
