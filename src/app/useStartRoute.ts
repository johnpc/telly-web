import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { channelRepository } from '@/core/db/channelRepository';
import { useNavigator } from '@/core/navigation/useNavigator';
import { useRoute } from '@/core/navigation/useRoute';
import { useAppDeps } from './appContext';

/**
 * Boot → first real route, once the channel count resolves (never before:
 * the Boot frame is bare so no interstitial flashes). Later route changes
 * are the navigator's business.
 */
export function useStartRoute(): void {
  const navigator = useNavigator();
  const route = useRoute();
  const { startRoute } = useAppDeps();
  const count = useLiveQuery(() => channelRepository.totalCount(), []);
  useEffect(() => {
    if (route.kind !== 'Boot' || count === undefined) return;
    navigator.replaceAll(startRoute.forChannelCount(count));
  }, [route.kind, count, navigator, startRoute]);
}
