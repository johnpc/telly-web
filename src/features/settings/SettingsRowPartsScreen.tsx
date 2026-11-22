import type { JSX } from 'react';

/** Padlock for rows the web cannot honor; circle-check for playlist/source rows. */
export function RowIcon({ kind, focused }: { kind: 'lock' | 'check'; focused: boolean }): JSX.Element {
  const color =
    kind === 'lock'
      ? 'text-telly-text-disabled'
      : focused
        ? 'text-telly-focus-text'
        : 'text-telly-playback-accent';
  return (
    <span className={`mr-4 flex h-12 w-12 shrink-0 items-center justify-center ${color}`} aria-hidden="true">
      {kind === 'lock' ? (
        <svg viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor">
          <path d="M18 8h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm3.1-9H8.9V6a3.1 3.1 0 0 1 6.2 0v2z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-12 w-12" fill="currentColor">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 15-5-5 1.4-1.4L10 14.2l7.6-7.6L19 8l-9 9z" />
        </svg>
      )}
    </span>
  );
}

/** The trailing accent check on the selected picker option. */
export function SelectedCheck(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-12 w-12 shrink-0 text-telly-playback-accent"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
    </svg>
  );
}

/** Trailing spinner on an in-flight "Update ..." action row (a rotating open arc). */
export function RowSpinner(): JSX.Element {
  return (
    <span
      role="status"
      aria-label="updating"
      className="h-9 w-9 shrink-0 animate-spin rounded-full border-[0.25rem] border-current border-r-transparent"
    />
  );
}

/**
 * The Material-2 style switch TiviMate renders (47x27 dp touch box, pill
 * track + round thumb; accent when on, grey when off, dimmed when locked).
 * Purely visual — the row handles the click.
 */
export function RowSwitch({ checked, locked }: { checked: boolean; locked: boolean }): JSX.Element {
  const thumb = locked
    ? 'bg-telly-text-disabled'
    : checked
      ? 'bg-telly-playback-accent'
      : 'bg-telly-text-muted';
  const track = locked
    ? 'bg-telly-text-disabled/40'
    : checked
      ? 'bg-telly-playback-accent/50'
      : 'bg-telly-text-muted/40';
  return (
    <span className="relative ml-4 flex h-[3.375rem] w-[5.875rem] shrink-0 items-center" aria-hidden="true">
      <span className={`absolute left-[0.8125rem] h-[1.75rem] w-[4.25rem] rounded-full ${track}`} />
      <span className={`absolute h-10 w-10 rounded-full ${thumb} ${checked ? 'right-0' : 'left-0'}`} />
    </span>
  );
}
