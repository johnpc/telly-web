import type { JSX } from 'react';

interface ProgressBarProps {
  permille: number;
  thumb?: boolean;
  /** Tailwind fill colour; the accent by default, light grey for the mini dash. */
  fillClass?: string;
  className?: string;
}

/** TiviMate progress line: grey track, accent/grey fill, optional round thumb (Android `TellyScreenProgressBar`). */
export function ProgressBar({
  permille,
  thumb = false,
  fillClass = 'bg-telly-playback-accent',
  className = 'h-[0.25rem] w-full',
}: ProgressBarProps): JSX.Element {
  const width = `${Math.min(Math.max(permille, 0), 1000) / 10}%`;
  return (
    <div className={`relative flex items-center ${className}`} data-testid="progress-bar">
      <div className="absolute inset-0 bg-telly-progress-track" />
      <div className={`absolute inset-y-0 left-0 ${fillClass}`} style={{ width }} />
      {thumb && (
        <div className="absolute flex h-full items-center" style={{ left: width }}>
          <div className={`-ml-[0.5rem] h-[1rem] w-[1rem] rounded-full ${fillClass}`} />
        </div>
      )}
    </div>
  );
}
