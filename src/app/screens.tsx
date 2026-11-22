import type { JSX } from 'react';
import type { Route } from '@/core/navigation/routes';
import { BootScreen } from './BootScreen';
import { ComingSoonScreen } from './ComingSoonScreen';

/**
 * Route → screen. Each feature slice registers its screen here as it lands;
 * unported routes render the placeholder so navigation never dead-ends.
 */
export function screenFor(route: Route): JSX.Element {
  switch (route.kind) {
    case 'Boot':
      return <BootScreen />;
    default:
      return <ComingSoonScreen route={route} />;
  }
}
