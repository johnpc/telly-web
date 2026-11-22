// The soft D-pad's buttons: a 3×3 grid (arrows around OK) plus a bottom row.
import type { SimpleRemoteKey } from '../input/remoteKeys';

export interface SoftRemoteButton {
  key: SimpleRemoteKey;
  label: string;
  /** Accessible name, also the test id (`soft-remote-<key>`). */
  name: string;
  /** Tailwind grid placement. */
  className: string;
}

export const SOFT_REMOTE_PAD: readonly SoftRemoteButton[] = [
  { key: 'UP', label: '↑', name: 'Up', className: 'col-start-2 row-start-1' },
  { key: 'LEFT', label: '←', name: 'Left', className: 'col-start-1 row-start-2' },
  { key: 'OK', label: 'OK', name: 'OK', className: 'col-start-2 row-start-2' },
  { key: 'RIGHT', label: '→', name: 'Right', className: 'col-start-3 row-start-2' },
  { key: 'DOWN', label: '↓', name: 'Down', className: 'col-start-2 row-start-3' },
];

export const SOFT_REMOTE_BAR: readonly SoftRemoteButton[] = [
  { key: 'BACK', label: 'BACK', name: 'Back', className: '' },
  { key: 'CHANNEL_UP', label: 'CH+', name: 'Channel up', className: '' },
  { key: 'CHANNEL_DOWN', label: 'CH−', name: 'Channel down', className: '' },
  { key: 'MENU', label: 'MENU', name: 'Menu', className: '' },
];
