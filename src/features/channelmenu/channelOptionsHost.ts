import type { ChannelOptionsDialog } from './channelOptionsController';

/** The host's layer variant that carries the dialog: read it there, write it there, never a copy. */
export interface ChannelOptionsHost {
  dialog(): ChannelOptionsDialog | null;
  showDialog(dialog: ChannelOptionsDialog | null): void;
}

interface OptionsLayer {
  kind: 'ChannelOptions';
  dialog: ChannelOptionsDialog | null;
}

function hasDialog<L extends { kind: string }>(layer: L): layer is L & OptionsLayer {
  return layer.kind === 'ChannelOptions';
}

/** The current layer when it is the pane, else null. */
function paneOf<L extends { kind: string }>(current: () => L): (L & OptionsLayer) | null {
  const layer = current();
  return hasDialog(layer) ? layer : null;
}

class LayerDialogHost<L extends { kind: string }> implements ChannelOptionsHost {
  constructor(
    private readonly current: () => L,
    private readonly show: (layer: L) => void,
  ) {}

  dialog(): ChannelOptionsDialog | null {
    return paneOf(this.current)?.dialog ?? null;
  }

  showDialog(dialog: ChannelOptionsDialog | null): void {
    const pane = paneOf(this.current);
    if (pane !== null) this.show({ ...pane, dialog });
  }
}

/** A host over any layer union whose `ChannelOptions` variant carries `dialog`. */
export function dialogHostOf<L extends { kind: string }>(
  current: () => L,
  show: (layer: L) => void,
): ChannelOptionsHost {
  return new LayerDialogHost(current, show);
}
