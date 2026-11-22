import type { JSX, ReactNode } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { dp, sp } from './toolCss';

interface ToolPaneProps {
  scopeId: string;
  title: string;
  testId: string;
  children: ReactNode;
}

/**
 * The settings-shell right sheet (Android `SettingsScreenSheet`): a titled
 * pane docked at the right edge over the dimmed screen behind it.
 */
export function ToolPaneScreen({ scopeId, title, testId, children }: ToolPaneProps): JSX.Element {
  return (
    <FocusScope id={scopeId} trap autoFocus="first">
      <section
        className="absolute flex flex-col overflow-hidden rounded-[4px] bg-telly-menu-sheet text-telly-text shadow-2xl"
        style={{ top: dp(8), right: dp(8), bottom: dp(8), width: dp(400) }}
        data-testid={testId}
      >
        <h2 className="shrink-0 bg-telly-settings-header px-[1.1em] py-[0.6em]" style={{ fontSize: sp(20) }}>
          {title}
        </h2>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </section>
    </FocusScope>
  );
}
