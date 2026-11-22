import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import type { Route } from '@/core/navigation/routes';
import { useNavigator } from '@/core/navigation/useNavigator';

/** Placeholder while a slice lands; BACK pops like every pushed screen. */
export function ComingSoonScreen({ route }: { route: Route }): JSX.Element {
  const navigator = useNavigator();
  return (
    <FocusScope id={`coming-soon-${route.kind}`} onBack={() => navigator.pop()}>
      <div
        className="flex h-full w-full items-center justify-center text-telly-text-secondary"
        data-testid="coming-soon"
      >
        {route.kind} — coming soon
      </div>
    </FocusScope>
  );
}
