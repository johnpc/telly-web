import type { JSX, PointerEvent } from 'react';
import { SOFT_REMOTE_BAR, SOFT_REMOTE_PAD, type SoftRemoteButton } from './softRemoteLayout';
import { useSoftRemote, type SoftRemoteState } from './useSoftRemote';

/** Finger-sized in DEVICE pixels: a touch target must not shrink with the dp canvas. */
const BUTTON =
  'flex h-[40px] min-w-[40px] items-center justify-center rounded-[8px] bg-white/15 px-[6px] text-[13px] leading-none font-semibold text-white active:bg-white/35 select-none';

/** Keep taps on the pad from stealing DOM focus (and the engine's focus ring) from the content. */
function keepFocus(e: PointerEvent<HTMLElement>): void {
  e.preventDefault();
}

function PadButton({ button, remote }: { button: SoftRemoteButton; remote: SoftRemoteState }): JSX.Element {
  const handlers = button.key === 'OK' ? remote.okHandlers : { onClick: () => remote.press(button.key) };
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={button.name}
      data-testid={`soft-remote-${button.key}`}
      className={`${BUTTON} ${button.className}`}
      {...handlers}
    >
      {button.label}
    </button>
  );
}

interface PadGroupProps {
  buttons: readonly SoftRemoteButton[];
  className: string;
  remote: SoftRemoteState;
}

function PadGroup({ buttons, className, remote }: PadGroupProps): JSX.Element {
  return (
    <div className={className}>
      {buttons.map((button) => (
        <PadButton key={button.key} button={button} remote={remote} />
      ))}
    </div>
  );
}

/** Floating D-pad for touch devices so every remote key is reachable on a phone. */
export function SoftRemote(): JSX.Element | null {
  const remote = useSoftRemote();
  if (!remote.visible) return null;
  return (
    <div
      data-testid="soft-remote"
      data-state={remote.open ? 'open' : 'closed'}
      className="fixed right-[12px] bottom-[12px] z-50 flex flex-col items-end gap-[8px]"
      onPointerDown={keepFocus}
    >
      {remote.open && (
        <div className="flex flex-col gap-[6px] rounded-[14px] bg-black/70 p-[8px] shadow-xl backdrop-blur">
          <PadGroup
            buttons={SOFT_REMOTE_PAD}
            className="grid grid-cols-3 grid-rows-3 gap-[4px]"
            remote={remote}
          />
          <PadGroup buttons={SOFT_REMOTE_BAR} className="flex gap-[4px]" remote={remote} />
        </div>
      )}
      <button
        type="button"
        tabIndex={-1}
        aria-label={remote.open ? 'Hide remote' : 'Show remote'}
        aria-expanded={remote.open}
        data-testid="soft-remote-toggle"
        className={`${BUTTON} rounded-full bg-black/70`}
        onClick={remote.toggle}
      >
        {remote.open ? '×' : '⌨'}
      </button>
    </div>
  );
}
