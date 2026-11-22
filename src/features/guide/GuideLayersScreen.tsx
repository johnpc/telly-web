import type { JSX } from 'react';
import { GroupToolScreen } from '@/features/groups/GroupToolScreen';
import { PinEntryScreen } from '@/features/groups/PinEntryScreen';
import { ToolPaneScreen } from '@/features/groups/ToolPaneScreen';
import { ChannelOptionsScreen } from './ChannelOptionsScreen';
import { MessageScreen } from './MessageScreen';
import type { GuideController } from './guideController';
import { COMING_SOON } from './guideModel';

/**
 * Screens the sheet routes to. Description and coming-soon are pushed (BACK
 * pops one level back to the sheet); Channel options REPLACES the sheet; the
 * PIN dialogs and the group/bulk tools are right panes over the dimmed grid.
 */
export function GuideLayersScreen({ controller }: { controller: GuideController }): JSX.Element | null {
  const layer = controller.layer;
  switch (layer.kind) {
    case 'ChannelOptions':
      return <ChannelOptionsScreen controller={controller} channelId={layer.channelId} />;
    case 'GroupTool':
      return <GroupToolScreen session={layer.session} />;
    case 'Description':
      return <MessageScreen headline={layer.title} subtitle={layer.text} testId="guide-description" />;
    case 'ComingSoon':
      return <MessageScreen headline={layer.feature} subtitle={COMING_SOON} testId="coming-soon" />;
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
