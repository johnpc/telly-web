import { act, render, renderHook, screen } from '@testing-library/react';
import type { JSX } from 'react';
import { describe, expect, it } from 'vitest';
import { Navigator } from './navigator';
import { NavigatorProvider } from './NavigatorProvider';
import { useNavigator } from './useNavigator';
import { useRoute } from './useRoute';

function Screen(): JSX.Element {
  const route = useRoute();
  const navigator = useNavigator();
  return (
    <div>
      <output data-testid="route">{route.kind}</output>
      <button onClick={() => navigator.push({ kind: 'Guide' })}>guide</button>
    </div>
  );
}

describe('NavigatorProvider', () => {
  it('renders the current route and follows push / hardware back (popstate)', () => {
    const navigator = new Navigator({ kind: 'Playback' });
    render(
      <NavigatorProvider navigator={navigator}>
        <Screen />
      </NavigatorProvider>,
    );
    expect(screen.getByTestId('route')).toHaveTextContent('Playback');
    act(() => screen.getByRole('button').click());
    expect(screen.getByTestId('route')).toHaveTextContent('Guide');
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { tellyDepth: 1 } }));
    });
    expect(screen.getByTestId('route')).toHaveTextContent('Playback');
  });

  it('builds a window.history-backed navigator from `start` by default', () => {
    render(
      <NavigatorProvider start={{ kind: 'Boot' }}>
        <Screen />
      </NavigatorProvider>,
    );
    expect(screen.getByTestId('route')).toHaveTextContent('Boot');
    expect(window.history.state).toEqual({ tellyDepth: 1 });
    act(() => screen.getByRole('button').click());
    expect(window.history.state).toEqual({ tellyDepth: 2 });
  });

  it('defaults to Welcome and throws outside the provider', () => {
    render(
      <NavigatorProvider>
        <Screen />
      </NavigatorProvider>,
    );
    expect(screen.getByTestId('route')).toHaveTextContent('Welcome');
    expect(() => renderHook(() => useNavigator())).toThrow(/NavigatorProvider/);
  });
});
