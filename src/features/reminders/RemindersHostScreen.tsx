import { useEffect, useSyncExternalStore, type JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { FocusScope } from '@/core/focus/FocusScope';
import { useNavigator } from '@/core/navigation/useNavigator';
import { usePlaybackSession } from '@/features/playback/tune';
import type { ReminderPopupData } from './reminderPopup';
import { type RemindersHub, remindersHub } from './remindersHub';

/**
 * Root-hosted reminders: runs the engine's ticks while mounted and renders the
 * popup over guide/playback/settings alike — programme title + channel +
 * "Starts at HH:MM" in the GuidedStep style. "Watch now" tunes the channel and
 * adopts the guide-root BACK chain with playback on top; Dismiss and BACK close
 * and hand focus back to the node that had it.
 */
export function RemindersHost({ hub = remindersHub }: { hub?: RemindersHub }): JSX.Element | null {
  const { popup, dismiss } = useRemindersPopup(hub);
  if (popup === null) return null;
  return <ReminderPopupScreen popup={popup} hub={hub} dismiss={dismiss} />;
}

/** Runs the ticks while mounted; the popup state plus its dismiss (the focus engine hands focus back to the opener). */
function useRemindersPopup(hub: RemindersHub): { popup: ReminderPopupData | null; dismiss(): void } {
  useEffect(() => hub.start(), [hub]);
  const popup = useSyncExternalStore(hub.popup.subscribe, hub.popup.snapshot);
  return { popup, dismiss: () => hub.popup.dismiss() };
}

interface PopupProps {
  popup: ReminderPopupData;
  hub: RemindersHub;
  dismiss(): void;
}

function ReminderPopupScreen({ popup, hub, dismiss }: PopupProps): JSX.Element {
  const watch = useWatchReminder(popup, hub);
  return (
    <FocusScope id="reminder-popup" trap autoFocus="first" onBack={dismiss}>
      <div
        data-testid="reminder-popup"
        className="absolute inset-0 z-40 flex bg-telly-onboarding-bg text-telly-text"
      >
        <div className="flex w-1/2 flex-col justify-center gap-[1rem] pr-[5rem] pl-[10rem]">
          <BellIcon />
          <div className="text-[2.75rem]">{popup.programmeTitle}</div>
          {popup.channelName !== '' && (
            <div className="text-[2rem] text-telly-text-muted">{popup.channelName}</div>
          )}
          <div className="text-[2rem] text-telly-text-muted">{popup.startsAtLabel}</div>
        </div>
        <ul className="flex w-1/2 flex-col gap-[1rem] pt-[23.625rem] pl-[2.5rem]">
          <PopupAction label="Watch now" onClick={watch} />
          <PopupAction label="Dismiss" onClick={dismiss} />
        </ul>
      </div>
    </FocusScope>
  );
}

/** Watch now: tune the reminder's channel, then guide root beneath fullscreen playback. */
function useWatchReminder(popup: ReminderPopupData, hub: RemindersHub): () => void {
  const navigator = useNavigator();
  const session = usePlaybackSession();
  return () => {
    const channel = session?.channels.find((row) => row.id === popup.channelId);
    if (channel !== undefined) session?.tuner.tune(channel);
    hub.popup.dismiss();
    navigator.replaceAll({ kind: 'Guide' });
    navigator.push({ kind: 'Playback' });
  };
}

function PopupAction({ label, onClick }: { label: string; onClick(): void }): JSX.Element {
  return (
    <Focusable
      as="li"
      focusId={`reminder-${label.toLowerCase().replace(/\s+/g, '-')}`}
      onClick={onClick}
      className="flex h-[5.5rem] w-[40rem] items-center rounded-[0.5rem] bg-telly-button-resting px-[2rem] text-[2rem]"
      focusedClassName="!bg-telly-focus-fill focused:text-telly-focus-text"
    >
      {label}
    </Focusable>
  );
}

function BellIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[5rem] w-[5rem] text-telly-text-muted"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
  );
}
