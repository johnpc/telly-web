import type { JSX } from 'react';
import { useStartNotice } from './useStartNotice';

/** Bottom-centre notice for a `?channel=` launch link nobody matched (the guide hint-toast treatment). */
export function StartNoticeScreen(): JSX.Element | null {
  const notice = useStartNotice();
  if (notice.kind === 'None') return null;
  return (
    <div
      role="status"
      className="absolute left-1/2 z-50 -translate-x-1/2 rounded bg-telly-guide-toast px-6 py-4 text-[1.875rem] text-black"
      style={{ bottom: 'calc(var(--soft-remote-inset, 0px) + 3rem)' }}
      data-testid="start-notice"
    >
      No channel named {notice.query}
    </div>
  );
}
