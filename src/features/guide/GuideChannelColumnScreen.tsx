import type { JSX } from 'react';
import { displayName } from '@/core/db/types';
import { LogoTileScreen } from './LogoTileScreen';
import { sp } from './guideCss';
import { CHANNEL_COLUMN_DP, dp } from './guideGeometry';
import type { GuideRow } from './guideModel';

interface ColumnProps {
  row: GuideRow;
  playing: boolean;
  showNumber: boolean;
}

/**
 * The grid row's fixed channel column: number, 45×30 dp logo tile and the
 * (custom) display name, accent blue + ▶ while previewed (capture 32).
 */
export function GuideChannelColumnScreen({ row, playing, showNumber }: ColumnProps): JSX.Element {
  const accent = playing ? 'text-telly-playback-accent' : '';
  const name = displayName(row.channel);
  return (
    <div
      className="flex h-full shrink-0 items-center"
      style={{ width: dp(CHANNEL_COLUMN_DP), paddingLeft: dp(16), paddingRight: dp(10) }}
    >
      {showNumber && (
        <span
          className={`shrink-0 ${accent || 'text-telly-text-muted'}`}
          style={{ width: dp(28), marginRight: dp(8), fontSize: sp(17) }}
          data-testid="row-number"
        >
          {row.displayNumber}
        </span>
      )}
      <LogoTileScreen logoUrl={row.channel.logoUrl} name={name} widthDp={45} heightDp={30} />
      <span
        className={`min-w-0 flex-1 truncate ${accent || 'text-white'}`}
        style={{ marginLeft: dp(10), fontSize: sp(16) }}
        data-testid="row-name"
      >
        {name}
      </span>
      {row.channel.blocked && (
        <span aria-label="Blocked" style={{ fontSize: sp(12) }}>
          🔒
        </span>
      )}
      {playing && (
        <span className={accent} style={{ fontSize: sp(10) }} aria-label="Playing">
          ▶
        </span>
      )}
    </div>
  );
}
