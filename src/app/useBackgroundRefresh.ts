import { useEffect, useRef } from 'react';
import { useSettingsRepository } from '@/core/settings/settingsContext';
import { TellySettings } from '@/core/settings/tellySettings';
import { useEpgRefresh } from '@/features/epg/useEpgRefresh';
import { defaultRefreshDeps, refreshDuePlaylists, type DuePolicy } from '@/features/playlist/playlistRefresh';
import {
  playlistUpdateIntervalSetting,
  playlistUpdateOnStartSetting,
} from '@/features/playlist/playlistSettings';

const EPG_TICK_MS = 15 * 60 * 1000;

/**
 * Android `MainActivity.keepEpgFresh` + `keepPlaylistsFresh`: on launch and
 * every quarter hour, refresh what is due (the gate serialises the work).
 * EPG also re-runs on EPG-relevant playlist changes (inside `useEpgRefresh`).
 */
export function useBackgroundRefresh(): void {
  const settings = useSettingsRepository();
  const epg = useEpgRefresh();
  const mutateEpg = epg.mutate;
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const deps = defaultRefreshDeps(settings.get(TellySettings.CORS_PROXY));
    const policy = (onStart: boolean): DuePolicy => ({
      onStart,
      intervalHours: (url: string) => settings.get(playlistUpdateIntervalSetting(url)),
      updateOnStart: (url: string) => settings.get(playlistUpdateOnStartSetting(url)),
    });
    void refreshDuePlaylists(deps, policy(true));
    if (settings.get(TellySettings.EPG_UPDATE_ON_APP_START)) mutateEpg('all');
    else mutateEpg('due');
    const timer = window.setInterval(() => {
      void refreshDuePlaylists(deps, policy(false));
      mutateEpg('due');
    }, EPG_TICK_MS);
    return () => window.clearInterval(timer);
  }, [settings, mutateEpg]);
}
