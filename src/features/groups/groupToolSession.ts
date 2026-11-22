import type { ChannelRow } from '@/core/db/types';
import type { CustomGroup } from './customGroups';
import type { ToolRow } from './toolRows';

/**
 * What one group/bulk tool screen shows (Android `GroupToolUi`): a titled
 * right pane with either a row list, a text editor (`textInitial` non-null)
 * or the parental PIN entry (`pin`). Pure data; one shared renderer.
 */
export interface GroupToolUi {
  title: string;
  rows: ToolRow[];
  textInitial: string | null;
  pin: boolean;
}

/** The live tables the tool screens read, fed by the host's live queries. */
export interface GroupToolLive {
  channels: readonly ChannelRow[];
  groups: readonly CustomGroup[];
  epgIds: readonly string[];
}

/**
 * One live tool screen behind a context-sheet row. The session owns the
 * multi-step state (observable), derives its UI from the live tables, and
 * calls `onDone` when its action completed so the host pops the layer.
 */
export interface GroupToolSession {
  ui(live: GroupToolLive): GroupToolUi;
  /** OK on a row; ids are the session's own ("done", "channel:7", …). */
  activate(rowId: string, live: GroupToolLive): void;
  /** Commit of the name editor screens. */
  submitText(text: string): void;
  /** The parental PIN entry's submit (Manage blocking gate). */
  submitPin(pin: string): Promise<void>;
  subscribe(listener: () => void): () => void;
  /** Changes on every step transition (`useSyncExternalStore` snapshot). */
  readonly version: number;
}

export function rowsUi(title: string, rows: ToolRow[]): GroupToolUi {
  return { title, rows, textInitial: null, pin: false };
}

export function textUi(title: string, textInitial: string): GroupToolUi {
  return { title, rows: [], textInitial, pin: false };
}

export function pinUi(title: string): GroupToolUi {
  return { title, rows: [], textInitial: null, pin: true };
}

/** Persistence seam the sessions write through (Android `CustomGroupStore` + `ChannelDao`). */
export interface GroupToolStore {
  createGroup(name: string): Promise<number>;
  renameGroup(id: number, name: string): Promise<void>;
  deleteGroup(id: number): Promise<void>;
  addMembers(id: number, channelKeys: readonly string[]): Promise<void>;
  setEpgOverride(channelId: number, epgOverride: string | null): Promise<void>;
  setBlocked(channelId: number, blocked: boolean): Promise<void>;
  setHidden(channelId: number, hidden: boolean): Promise<void>;
}
