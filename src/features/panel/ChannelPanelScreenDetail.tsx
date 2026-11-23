import type { JSX } from 'react';
import { displayName } from '@/core/db/types';
import { LogoTile, ProgressBar } from './ChannelPanelScreenWidgets';
import type { PanelRow } from './panelRows';
import type { LogoStyle } from './usePanelModel';

/** "02:30 — 03:45 PM  ▬▬  61 min … News": range, dash progress, remaining, group right-aligned. */
function TimesLine({ row }: { row: PanelRow }): JSX.Element {
  return (
    <div
      data-testid="panel-detail-times"
      className="flex items-center gap-5 text-[1.875rem] text-telly-text-muted"
    >
      {row.nowRange !== null && <span className="whitespace-nowrap">{row.nowRange}</span>}
      <ProgressBar
        permille={row.progressPermille}
        widthClass="w-20"
        heightClass="h-1.5"
        fillClass="bg-telly-dash-fill"
      />
      {row.remaining !== null && <span className="whitespace-nowrap">{row.remaining}</span>}
      <span className="flex-1" />
      {row.channel.groupTitle !== null && (
        <span className="text-[1.75rem] text-white">{row.channel.groupTitle}</span>
      )}
    </div>
  );
}

/**
 * The focused row's inline expansion (round3-ref 04, capture 47): 70 dp
 * logo, programme title with the favorite star at the right edge, times +
 * dash + remaining with the group name right-aligned, then the description.
 */
interface DetailProps {
  row: PanelRow;
  logo: LogoStyle;
  /** The now/next read has not answered yet: the programme block stays blank (no "No information"). */
  pending?: boolean;
}

export function ChannelPanelScreenDetail({ row, logo, pending = false }: DetailProps): JSX.Element {
  return (
    <div data-testid="panel-detail" className="flex px-6 py-4">
      <LogoTile
        logoUrl={row.channel.logoUrl}
        name={displayName(row.channel)}
        sizeClass="h-[8.75rem] w-[8.75rem] portrait:hidden"
        textClass="text-5xl"
        style={logo}
      />
      <div className="ml-8 flex min-w-0 flex-1 flex-col gap-2 portrait:ml-0">
        <div className="flex items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="truncate text-[2.125rem] font-semibold text-white">
              {pending ? '' : (row.nowTitle ?? 'No information')}
            </span>
            {!pending && <TimesLine row={row} />}
          </div>
          <span aria-hidden className="ml-6 text-[2.5rem] leading-none text-white">
            {row.channel.favorite ? '★' : '☆'}
          </span>
        </div>
        {!pending && row.description !== null && (
          <p
            data-testid="panel-detail-description"
            className="line-clamp-2 text-[1.625rem] text-telly-text-muted"
          >
            {row.description}
          </p>
        )}
      </div>
    </div>
  );
}
