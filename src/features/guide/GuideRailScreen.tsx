import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { focusEngine } from '@/core/focus/focusEngine';
import { BookmarkIcon, DvrIcon, MovieIcon, SearchIcon, SettingsIcon, TvIcon } from './GuideIconsScreen';
import type { GuideController } from './guideController';
import { dp } from './guideGeometry';
import { RAIL_PREFIX } from './guideKeyRouting';

interface RailProps {
  controller: GuideController;
  groupsFocusId: string;
}

interface RailTarget {
  id: string;
  label: string;
  icon: (props: { className?: string }) => JSX.Element;
  onClick: () => void;
  lit?: boolean;
}

/**
 * The 56 dp nav rail at the far left (capture 25): app icon on top, search /
 * live-TV / My-list / Movies / DVR icons mid-rail with the live-TV section
 * lit white, settings gear at the bottom. UP/DOWN traverse the chain, RIGHT
 * returns to the groups column, OK on the live-TV icon does the same.
 */
export function GuideRailScreen({ controller, groupsFocusId }: RailProps): JSX.Element {
  const targets: RailTarget[] = [
    {
      id: 'search',
      label: 'Search',
      icon: SearchIcon,
      onClick: () => controller.deps.open({ kind: 'Search' }),
    },
    {
      id: 'live-tv',
      label: 'Live TV',
      icon: TvIcon,
      onClick: () => void focusEngine.focus(groupsFocusId),
      lit: true,
    },
    {
      id: 'my-list',
      label: 'My list',
      icon: BookmarkIcon,
      onClick: () => controller.deps.open({ kind: 'MyList' }),
    },
    { id: 'movies', label: 'Movies', icon: MovieIcon, onClick: () => controller.deps.open({ kind: 'Vod' }) },
    {
      id: 'recordings',
      label: 'Recordings',
      icon: DvrIcon,
      onClick: () => controller.deps.open({ kind: 'Recordings' }),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: SettingsIcon,
      onClick: () => controller.deps.open({ kind: 'Settings' }),
    },
  ];
  const focusIdOf = (index: number): string =>
    `${RAIL_PREFIX}${targets[Math.min(Math.max(index, 0), targets.length - 1)]?.id ?? ''}`;
  return (
    <nav
      className="flex h-full flex-col items-center bg-telly-guidance-pane"
      style={{ width: dp(56) }}
      data-testid="guide-rail"
    >
      <img
        src={`${import.meta.env.BASE_URL}icon.png`}
        alt=""
        style={{ width: dp(36), height: dp(36), marginTop: dp(8) }}
      />
      <div style={{ height: dp(123) }} />
      {targets.map((target, index) => {
        const gear = index === targets.length - 1;
        return (
          <Focusable
            key={target.id}
            as="button"
            focusId={focusIdOf(index)}
            aria-label={target.label}
            className={`flex items-center justify-center rounded-[4px] ${target.lit === true ? 'text-white' : 'text-telly-text-muted'} ${gear ? 'mt-auto' : ''}`}
            style={{
              width: dp(40),
              height: dp(40),
              padding: dp(8),
              marginTop: gear ? undefined : dp(24),
              marginBottom: gear ? dp(16) : undefined,
            }}
            focusedClassName="bg-telly-focus-fill focused:text-telly-focus-text"
            data-focus-up={focusIdOf(index - 1)}
            data-focus-down={focusIdOf(index + 1)}
            data-focus-left={focusIdOf(index)}
            data-focus-right={groupsFocusId}
            onClick={target.onClick}
          >
            <target.icon />
            <span className="sr-only">{target.label}</span>
          </Focusable>
        );
      })}
    </nav>
  );
}
