import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { PinPrompt } from '@/features/playback/gate/PinPromptScreen';
import { cellAt } from './multiviewGrid';
import { MultiviewScreenMenu } from './MultiviewMenuScreen';
import { MultiviewScreenPane } from './MultiviewPaneScreen';
import { MultiviewScreenPicker } from './MultiviewPickerScreen';
import { useMultiview, type MultiviewView } from './useMultiview';

/** The teaser hint under the single pane, copy verbatim. */
function Hint(): JSX.Element {
  return (
    <div className="absolute inset-x-0 bottom-[6.375rem] flex flex-col items-center gap-[0.25rem]">
      <span className="text-[2.125rem] text-white">Press OK to show menu</span>
      <span className="text-[1.875rem] text-telly-text-muted">
        Your IPTV provider may limit the number of concurrent connections
      </span>
    </div>
  );
}

/** Panes positioned by the mosaic cells; the focused one owns audio. */
function Grid({ view }: { view: MultiviewView }): JSX.Element {
  const { vm, panes, focusedId } = view;
  return (
    <>
      {panes.map((pane, index) => (
        <MultiviewScreenPane
          key={pane.id}
          pane={pane}
          cell={cellAt(panes.length, index)}
          focused={pane.id === focusedId}
          onFocus={() => vm.panes.focus(pane.id)}
          onOk={() => vm.onPaneOk(pane.id)}
        />
      ))}
    </>
  );
}

/** The pane menu, placed beside the focused pane's cell. */
function MenuLayer({ view }: { view: MultiviewView }): JSX.Element {
  const { vm, panes, focusedId } = view;
  const index = Math.max(
    0,
    panes.findIndex((pane) => pane.id === focusedId),
  );
  return (
    <MultiviewScreenMenu
      rows={vm.menuRows()}
      cell={cellAt(panes.length, index)}
      onAction={(action) => vm.onMenuAction(action)}
      onBack={() => vm.onBack()}
    />
  );
}

/** The channel picker over the dimmed panes, opened on the focused pane's channel. */
function PickerLayer({ view }: { view: MultiviewView }): JSX.Element {
  const { vm, channels } = view;
  return (
    <MultiviewScreenPicker
      channels={channels}
      currentChannelId={vm.panes.focused?.channel.id ?? null}
      onPick={(channel) => vm.onPick(channel)}
      onBack={() => vm.onBack()}
    />
  );
}

/** The menu / picker layer above the grid, by `MultiviewLayer`. */
function Layer({ view }: { view: MultiviewView }): JSX.Element | null {
  if (view.layer.kind === 'Menu') return <MenuLayer view={view} />;
  if (view.layer.kind === 'Picker') return <PickerLayer view={view} />;
  return null;
}

/** The blocked-channel tune gate over every multiview layer: the shared centred PIN card. */
function Gate({ view }: { view: MultiviewView }): JSX.Element | null {
  const { vm, prompt } = view;
  if (prompt === null) return null;
  return (
    <PinPrompt
      title="Enter PIN"
      keyboard={vm.gate.keyboardPin}
      onSubmit={(pin) => vm.gate.submit(pin)}
      onDismiss={() => vm.onBack()}
    />
  );
}

/**
 * Multiview host (Android `MultiviewScreen`): the pane grid on black (every
 * pane on its own engine, D-pad moves focus, audio follows focus, CH+/- zap
 * the focused pane), the teaser hint under a single pane, the menu / picker
 * layers above and the blocked-channel PIN card over everything. Thin —
 * every transition lives in `MultiviewViewModel`.
 */
export function MultiviewScreen(): JSX.Element {
  const view = useMultiview();
  return (
    <FocusScope id="multiview" onBack={() => view.vm.onBack()}>
      <div
        data-testid="multiview-screen"
        data-layer={view.layer.kind}
        data-pane-count={view.panes.length}
        className="relative h-full w-full overflow-hidden bg-black font-sans"
      >
        <Grid view={view} />
        {view.panes.length === 1 && <Hint />}
        <Layer view={view} />
        <Gate view={view} />
      </div>
    </FocusScope>
  );
}
