import type { JSX } from 'react';
import { EXIT_MESSAGE } from './exitConfirm';
import type { GuideController } from './guideController';
import { sp } from './guideCss';
import { dp } from './guideGeometry';
import { HINT_LINES } from './guideHint';
import { useGuideHint } from './useGuideHint';

/** The first-open hint toast (bottom right) and the confirm-exit warning (bottom centre), both in the light grey toast treatment. */
export function GuideToastsScreen({ controller }: { controller: GuideController }): JSX.Element {
  const hint = useGuideHint(controller.deps.store);
  const toast = 'rounded-[4px] bg-telly-guide-toast text-black';
  return (
    <>
      {hint && (
        <div
          className={`absolute bottom-0 right-0 z-10 ${toast}`}
          style={{
            margin: dp(16),
            paddingLeft: dp(12),
            paddingRight: dp(12),
            paddingTop: dp(8),
            paddingBottom: dp(8),
            fontSize: sp(15),
            lineHeight: dp(20),
          }}
          data-testid="guide-hint"
        >
          {HINT_LINES.map(([key, rest]) => (
            <div key={key}>
              <b>{key}:</b> {rest}
            </div>
          ))}
        </div>
      )}
      {controller.exit.warning && (
        <div
          className={`absolute bottom-0 left-1/2 z-40 -translate-x-1/2 ${toast}`}
          style={{
            marginBottom: dp(24),
            paddingLeft: dp(12),
            paddingRight: dp(12),
            paddingTop: dp(8),
            paddingBottom: dp(8),
            fontSize: sp(15),
          }}
          data-testid="exit-toast"
        >
          {EXIT_MESSAGE}
        </div>
      )}
    </>
  );
}
