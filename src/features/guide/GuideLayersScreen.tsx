import type { JSX } from 'react';
import { COMING_SOON, ChannelOptionsScreen, MessageScreen } from '@/features/channelmenu';
import { GroupToolScreen } from '@/features/groups/GroupToolScreen';
import { PinEntryScreen } from '@/features/groups/PinEntryScreen';
import { ToolPaneScreen } from '@/features/groups/ToolPaneScreen';
import { RecordingLayerScreen } from '@/features/recording';
import type { GuideController } from './guideController';

/**
 * Screens the sheet routes to. Description and coming-soon are pushed (BACK
 * pops one level back to the sheet); Channel options REPLACES the sheet; the
 * PIN dialogs and the group/bulk tools are right panes over the dimmed grid.
 */
export function GuideLayersScreen({ controller }: { controller: GuideController }): JSX.Element | null {
  const layer = controller.layer;
  switch (layer.kind) {
    case 'ChannelOptions':
      return (
        <ChannelOptionsScreen
          channelId={layer.channelId}
          options={controller.parts.options}
          channels={controller.deps.channels}
          onRow={controller.parts.onChannelOption}
          onBack={() => controller.menu.close()}
        />
      );
    case 'GroupTool':
      return <GroupToolScreen session={layer.session} />;
    case 'Description':
      return <MessageScreen headline={layer.title} subtitle={layer.text} testId="guide-description" />;
    case 'ComingSoon':
      return <MessageScreen headline={layer.feature} subtitle={COMING_SOON} testId="coming-soon" />;
    case 'RecordingStop':
    case 'CustomRecording':
      return (
        <RecordingLayerScreen
          layer={layer}
          record={controller.parts.recording}
          onBack={() => controller.menu.close()}
        />
      );
    case 'BlockPin':
      return (
        <ToolPaneScreen scopeId="guide-pin" title={layer.mode} testId="guide-pin">
          <div className="p-[1.5em]">
            <PinEntryScreen
              focusId="guide-block-pin"
              onSubmit={(pin) => void controller.parts.submitPin(pin)}
            />
          </div>
        </ToolPaneScreen>
      );
    case 'GroupPin':
      return (
        <ToolPaneScreen scopeId="guide-pin" title="Enter PIN" testId="guide-pin">
          <div className="p-[1.5em]">
            <PinEntryScreen
              focusId="guide-group-pin"
              onSubmit={(pin) => void controller.parts.submitPin(pin)}
            />
          </div>
        </ToolPaneScreen>
      );
    default:
      return null;
  }
}
