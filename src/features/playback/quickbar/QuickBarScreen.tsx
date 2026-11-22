import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { TopScrim } from '../info/OverlayScaffoldScreen';
import type { PlaybackInfoData } from '../info/playbackInfo';
import type { PanelStyle } from '../info/usePlayerSettings';
import { Focusable } from '@/core/focus/Focusable';
import { Icon, type IconName } from '../ui/IconsScreen';
import type { QuickBarAction, QuickBarItem } from './quickBar';

const ICONS: Readonly<Record<QuickBarAction, IconName>> = {
  Search: 'search',
  'Channels list': 'list',
  Recordings: 'dvr',
  Multiview: 'multiview',
  'Picture-in-picture': 'pip',
  'Video track': 'videocam',
  'Audio track': 'volume',
  Latency: 'latency',
  Subtitles: 'cc',
};

/** One icon+label slot; the slot name is read by assistive tech (and the harness) while the label shows the live value. */
function Slot({ item, onClick }: { item: QuickBarItem; onClick: () => void }): JSX.Element {
  return (
    <Focusable
      focusId={`quickbar-${item.action}`}
      as="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-[0.75rem] text-white"
    >
      {(focused) => (
        <>
          <span
            className={`flex h-[5rem] w-[5rem] items-center justify-center rounded-full ${
              focused ? 'bg-telly-focus-fill text-telly-focus-text' : ''
            }`}
          >
            <Icon name={ICONS[item.action]} className="h-[2.75rem] w-[2.75rem]" />
          </span>
          <span className="sr-only">{item.action}</span>
          <span className="truncate text-[1.5rem]" data-testid="quick-bar-label">
            {item.label}
          </span>
        </>
      )}
    </Focusable>
  );
}

interface QuickBarProps {
  items: readonly QuickBarItem[];
  info: PlaybackInfoData | null;
  style: PanelStyle;
  onAction: (action: QuickBarAction) => void;
}

/** Bottom icon quick-bar (round3-ref 07/08): nine evenly spread icon+label slots over a bottom scrim, focus starting on Search. */
export function QuickBar({ items, info, style, onAction }: QuickBarProps): JSX.Element {
  return (
    <FocusScope id="playback-quickbar" trap autoFocus="first">
      <div className="absolute inset-0" data-testid="quick-bar">
        <TopScrim group={info?.group ?? null} clockText={info?.clockText ?? ''} style={style} />
        <div
          className="absolute inset-x-0 bottom-0 flex items-end px-[2rem] pt-[10rem] pb-[1.75rem]"
          style={{ background: `linear-gradient(transparent, rgba(0,0,0,${0.8 * style.alphaFactor}))` }}
        >
          {items.map((item) => (
            <Slot key={item.action} item={item} onClick={() => onAction(item.action)} />
          ))}
        </div>
      </div>
    </FocusScope>
  );
}
