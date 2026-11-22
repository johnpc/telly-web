import { useLiveQuery } from 'dexie-react-hooks';
import { type PlaylistRepository, playlistRepository } from '@/core/db/playlistRepository';
import type { PlaylistRow } from '@/core/db/types';

/** Every stored playlist, live (the Room `Flow` equivalent); undefined until the first read. */
export function usePlaylists(repository: PlaylistRepository = playlistRepository): PlaylistRow[] | undefined {
  return useLiveQuery(() => repository.all(), [repository]);
}
