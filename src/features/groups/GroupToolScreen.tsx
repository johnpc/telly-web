import { useSyncExternalStore, type JSX } from 'react';
import type { GroupToolSession } from './groupToolSession';
import { PinEntryScreen } from './PinEntryScreen';
import { TextFieldScreen } from './TextFieldScreen';
import { ToolPaneScreen } from './ToolPaneScreen';
import { ToolRowsScreen } from './ToolRowsScreen';
import { useGroupToolLive } from './useGroupToolLive';

/**
 * The one renderer of every group/bulk tool screen (Android `GroupToolScreen`):
 * a settings-style right sheet whose body is the tool's row list, the name
 * editor, or the parental PIN entry.
 */
export function GroupToolScreen({ session }: { session: GroupToolSession }): JSX.Element {
  useSyncExternalStore(session.subscribe, () => session.version);
  const live = useGroupToolLive();
  const ui = session.ui(live);
  return (
    <ToolPaneScreen scopeId="guide-group-tool" title={ui.title} testId="group-tool">
      {ui.pin ? (
        <div className="p-[1.5em]">
          <PinEntryScreen focusId="group-tool-pin" onSubmit={(pin) => void session.submitPin(pin)} />
        </div>
      ) : ui.textInitial !== null ? (
        <div className="p-[1.5em]">
          <TextFieldScreen
            focusId="group-tool-text"
            initial={ui.textInitial}
            onCommit={(text) => session.submitText(text)}
          />
        </div>
      ) : (
        <ToolRowsScreen
          rows={ui.rows}
          focusPrefix="group-tool-"
          onActivate={(id) => session.activate(id, live)}
        />
      )}
    </ToolPaneScreen>
  );
}
