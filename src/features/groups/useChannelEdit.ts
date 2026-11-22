import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { type ChannelRepository, channelRepository } from '@/core/db/channelRepository';
import type { ChannelRow } from '@/core/db/types';
import { ChannelEdit } from './channelEdit';

const NONE: ChannelRow[] = [];

export interface ChannelEditView {
  rows: ChannelRow[];
  toggle(channel: ChannelRow): void;
  move(channelId: number, delta: number): void;
}

/** Writes every changed row back through the repository, in order. */
function persistAll(repository: ChannelRepository): (rows: readonly ChannelRow[]) => Promise<void> {
  return async (rows) => {
    for (const row of rows) await repository.update(row);
  };
}

function viewOf(edit: ChannelEdit, channels: readonly ChannelRow[]): ChannelEditView {
  return {
    rows: edit.rows(channels),
    toggle: (channel) => void edit.toggle(channels, channel),
    move: (channelId, delta) => void edit.move(channels, channelId, delta),
  };
}

/** Live visible channels + the edit model persisting through the channel repository. */
export function useChannelEdit(
  group: string | null,
  repository: ChannelRepository = channelRepository,
): ChannelEditView {
  const [edit] = useState(() => new ChannelEdit(persistAll(repository), group));
  const channels = useLiveQuery(() => repository.visible(), [repository]) ?? NONE;
  return useMemo(() => viewOf(edit, channels), [edit, channels]);
}
