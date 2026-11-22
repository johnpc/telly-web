import type { JSX } from 'react';
import type { ChannelRow } from '@/core/db/types';
import { AiringRowScreen, MasterCardScreen } from './SearchProgramRowsScreen';
import type { SearchProgramChannel, SearchProgramHit } from './searchResults';
import { SectionHeader } from './SearchWidgetsScreen';

interface SearchProgramsProps {
  groups: readonly SearchProgramChannel[];
  selected: SearchProgramChannel | null;
  onTune(channel: ChannelRow): void;
  onProgramRow(hit: SearchProgramHit): void;
}

/**
 * The Programs section (ref-round6 §D): a channel-master / airings-detail
 * two-pane. The left lane lists ONE card per matching channel in name order;
 * the rows pane lists ONLY the selected channel's airings, chronological, one
 * row per airing, never deduped. Focusing a card selects it (focus memory) and
 * swaps the rows pane; OK on a card TUNES it, OK on a row opens the dropdown.
 */
export function SearchProgramsScreen({
  groups,
  selected,
  onTune,
  onProgramRow,
}: SearchProgramsProps): JSX.Element {
  return (
    <section className="min-h-0 flex-1">
      <SectionHeader text="Programs" className="pt-[4rem] pl-[3rem]" />
      <div className="flex gap-[3.5rem] pt-[2.75rem] pl-[3rem]">
        <MasterLaneScreen groups={groups} selectedId={selected?.channel.id ?? null} onTune={onTune} />
        <AiringsPaneScreen airings={selected?.airings ?? []} onProgramRow={onProgramRow} />
      </div>
    </section>
  );
}

interface MasterLaneProps {
  groups: readonly SearchProgramChannel[];
  selectedId: number | null;
  onTune(channel: ChannelRow): void;
}

function MasterLaneScreen({ groups, selectedId, onTune }: MasterLaneProps): JSX.Element {
  return (
    <ul data-testid="search-programs-lane" className="w-[15rem] shrink-0 pb-[3rem]">
      {groups.map(({ channel }) => (
        <MasterCardScreen
          key={channel.id}
          channel={channel}
          selected={channel.id === selectedId}
          onClick={() => onTune(channel)}
        />
      ))}
    </ul>
  );
}

interface AiringsPaneProps {
  airings: readonly SearchProgramHit[];
  onProgramRow(hit: SearchProgramHit): void;
}

/** The rows pane: the selected channel's airings only, chronological. */
function AiringsPaneScreen({ airings, onProgramRow }: AiringsPaneProps): JSX.Element {
  const last = airings[airings.length - 1];
  return (
    <ul data-testid="search-airings" className="w-[50.5rem] shrink-0 pb-[3rem]">
      {airings.map((hit) => (
        <AiringRowScreen
          key={hit.program.startMs}
          hit={hit}
          last={hit === last}
          onClick={() => onProgramRow(hit)}
        />
      ))}
    </ul>
  );
}
