import { boolSetting, intSetting, stringSetSetting, stringSetting } from './setting';

/**
 * Every persisted setting, with the defaults captured from TiviMate 5.2.0
 * (port of Android `TellySettings.kt`). Keys and defaults are IDENTICAL to
 * the Android app so a backup file moves between the two apps unchanged.
 * `CORS_PROXY` is the one web-specific key (CLAUDE.md decisions log).
 */
export const TellySettings = {
  // General.
  AUTOSTART_ON_BOOT: boolSetting('general_autostart_boot', false),
  AUTOSTART_ON_WAKE: boolSetting('general_autostart_wake', false),
  LAST_CHANNEL_ON_START: boolSetting('general_last_channel_on_start', true),
  PIP_ON_HOME: boolSetting('general_pip_on_home', false),
  CONFIRM_EXIT: boolSetting('general_confirm_exit', false),
  USER_AGENT: stringSetting('general_user_agent', ''),
  UDP_PROXY: stringSetting('general_udp_proxy', ''),
  /** Web only: providers without CORS headers are routed through this base URL. */
  CORS_PROXY: stringSetting('general_cors_proxy', ''),
  AUTO_BACKUP: boolSetting('general_auto_backup', true),

  // Playlists.
  PLAYLISTS_SORTING: stringSetting('playlists_sorting', 'By name'),

  // EPG. Interval 0 = "None": fetch only when never fetched.
  EPG_UPDATE_INTERVAL_HOURS: intSetting('epg_update_interval_hours', 0),
  EPG_PAST_DAYS_TO_KEEP: intSetting('epg_past_days_to_keep', 7),
  EPG_STORE_DESCRIPTIONS: boolSetting('epg_store_descriptions', true),
  EPG_UPDATE_ON_APP_START: boolSetting('epg_update_on_app_start', false),
  EPG_UPDATE_ON_PLAYLISTS_CHANGE: boolSetting('epg_update_on_playlists_change', false),

  // Appearance.
  LANGUAGE: stringSetting('appearance_language', 'System'),
  FONT_SIZE: stringSetting('appearance_font_size', 'Medium'),
  ACCENT_COLOR: stringSetting('appearance_accent_color', 'Blue'),
  CLOCK_FORMAT: stringSetting('appearance_clock_format', '12-hour'),
  SHOW_CHANNEL_NUMBERS: boolSetting('appearance_channel_numbers', true),
  GUIDE_VISIBLE_CHANNELS: intSetting('appearance_guide_visible_channels', 7),
  GUIDE_TRANSPARENCY: stringSetting('appearance_guide_transparency', 'Opaque'),
  PLAYER_TRANSPARENCY: intSetting('appearance_player_transparency', 0),
  PLAYER_PANEL_TIMEOUT_SEC: intSetting('appearance_player_timeout_sec', 5),
  PLAYER_SHOW_CLOCK: boolSetting('appearance_player_show_clock', true),
  SHOW_ALL_CHANNELS_GROUP: boolSetting('appearance_group_all_channels', true),
  SHOW_FAVORITES_GROUP: boolSetting('appearance_group_favorites', true),
  LOGO_BACKGROUND: stringSetting('appearance_logo_background', 'Default'),
  LOGO_ROUNDED_CORNERS: boolSetting('appearance_logo_rounded', true),

  // Playback.
  BUFFER_SIZE: stringSetting('playback_buffer_size', 'Small'),
  AUDIO_DECODER: stringSetting('playback_audio_decoder', 'Hardware'),
  VIDEO_DECODER: stringSetting('playback_video_decoder', 'Hardware'),
  AUTO_FRAME_RATE: stringSetting('playback_afr', 'Off'),
  SURROUND_BY_DEFAULT: boolSetting('playback_surround_default', false),
  AUDIO_PASSTHROUGH: boolSetting('playback_audio_passthrough', false),
  USE_EXTERNAL_PLAYER: stringSetting('playback_external_player', 'Off'),
  RESIZE_MODE: stringSetting('playback_resize_mode', 'Fit'),
  SKIP_STEPS: stringSetting('playback_skip_steps', '10s / 30s / 1m / 5m'),

  // Remote control seeking options.
  SEEK_RWFF_CATCHUP: boolSetting('remote_seek_rwff_catchup', true),
  RW_REWINDS_LIVE: boolSetting('remote_rw_rewinds_live', false),
  SEEK_LEFT_RIGHT: boolSetting('remote_seek_left_right', false),
  LEFT_REWINDS_LIVE: boolSetting('remote_left_rewinds_live', false),
  SEEK_DOWN_UP: boolSetting('remote_seek_down_up', false),
  DOWN_REWINDS_LIVE: boolSetting('remote_down_rewinds_live', false),

  // Remote control key remaps (raw values are the picker labels).
  REMOTE_PLAYER_OK: stringSetting('remote_player_ok', 'Show info panel'),
  REMOTE_PLAYER_UP_DOWN: stringSetting('remote_player_up_down', 'Show info panel'),
  REMOTE_PLAYER_LEFT_RIGHT: stringSetting('remote_player_left_right', 'Nothing'),
  REMOTE_PLAYER_LONG_OK: stringSetting('remote_player_long_ok', 'Open quick menu'),
  REMOTE_GUIDE_LEFT_RIGHT: stringSetting('remote_guide_left_right', 'Move by programme'),
  REMOTE_GUIDE_CHANNEL_UP_DOWN: stringSetting('remote_guide_channel_up_down', 'Nothing'),
  REMOTE_GUIDE_LONG_OK: stringSetting('remote_guide_long_ok', 'Open channel menu'),

  // Parental controls. The PIN is stored salted+hashed.
  PARENTAL_ENABLED: boolSetting('parental_enabled', false),
  PARENTAL_PIN_HASH: stringSetting('parental_pin_hash', ''),
  PARENTAL_PIN_SALT: stringSetting('parental_pin_salt', ''),
  PARENTAL_PIN_INPUT_METHOD: stringSetting('parental_pin_input_method', 'Picker'),
  PARENTAL_RELOCK: stringSetting('parental_relock', 'Always require'),
  PARENTAL_CHANNELS_ONLY: boolSetting('parental_channels_only', false),
  PARENTAL_REQUIRE_FOR_SETTINGS: boolSetting('parental_require_settings', false),
  PARENTAL_REQUIRE_FOR_PLAYLISTS: boolSetting('parental_require_settings_playlists', false),
  PARENTAL_LOCKED_GROUPS: stringSetSetting('parental_locked_groups'),

  // Reminders / Other -> VOD / Other -> Search / About.
  REMINDER_LEAD_MINUTES: intSetting('reminders_lead_minutes', 5),
  VOD_REMEMBER_POSITION: boolSetting('vod_remember_position', true),
  SEARCH_SAVE_HISTORY: boolSetting('search_save_history', true),
  SEND_STATISTICS: boolSetting('about_send_statistics', true),
} as const;
