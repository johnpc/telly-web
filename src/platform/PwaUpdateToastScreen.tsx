import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { FocusScope } from '@/core/focus/FocusScope';
import { useKeyHandler } from '@/core/input/useKeyHandler';
import { type PwaUpdate, pwaUpdate } from './pwaUpdate';
import {
  type PwaUpdateToast,
  UPDATE_TOAST_KEYS,
  UPDATE_TOAST_RELOADING,
  UPDATE_TOAST_TITLE,
  usePwaUpdateToast,
} from './usePwaUpdate';

/**
 * "telly was updated" over whatever is on screen (never fullscreen video), in
 * the guide hint's bottom-right grey toast treatment. The toast itself is the
 * focusable: it takes focus when it appears, OK reloads, BACK (or an arrow)
 * puts it away and the focus engine hands focus back to the node that had it.
 */
export function PwaUpdateToastScreen({ machine = pwaUpdate }: { machine?: PwaUpdate }): JSX.Element | null {
  const toast = usePwaUpdateToast(machine);
  if (toast === null) return null;
  return <UpdateToast toast={toast} />;
}

function UpdateToast({ toast }: { toast: PwaUpdateToast }): JSX.Element {
  useKeyHandler(toast.onKey);
  return (
    <FocusScope id="pwa-update" autoFocus="first">
      <Focusable
        focusId="pwa-update-toast"
        role="status"
        onClick={toast.reload}
        className="absolute right-0 z-50 m-[2rem] rounded-[4px] bg-telly-guide-toast px-[1.5rem] py-[1rem] text-[1.875rem] leading-[2.5rem] text-black outline-none focused:ring-[0.375rem] focused:ring-(--telly-accent)"
        style={{ bottom: 'var(--soft-remote-inset, 0px)' }}
        data-testid="pwa-update-toast"
        data-phase={toast.phase}
      >
        <div>
          <b>{UPDATE_TOAST_TITLE}</b>
        </div>
        {toast.phase === 'reloading' ? (
          <div>{UPDATE_TOAST_RELOADING}</div>
        ) : (
          <div>
            {UPDATE_TOAST_KEYS.map(([key, action], index) => (
              <span key={key}>
                {index > 0 && ' · '}
                <b>{key}:</b> {action}
              </span>
            ))}
          </div>
        )}
      </Focusable>
    </FocusScope>
  );
}
