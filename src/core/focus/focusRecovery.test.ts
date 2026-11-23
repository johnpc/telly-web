import { describe, expect, it } from 'vitest';
import { autoFocusTarget, recoveryTarget, rememberedTarget } from './focusRecovery';
import { FocusRegistry } from './focusRegistry';
import { node, rectOf } from './testLayout';

describe('focusRecovery edge cases', () => {
  it('recoveryTarget without a last rect takes the first of the pool, and null when nothing is left', () => {
    const registry = new FocusRegistry();
    const root = document.createElement('div');
    document.body.appendChild(root);
    registry.add({ id: 'x', scope: 's', element: node(root, 'x', { x: 0, y: 0 }) });
    const view = {
      registry,
      remembered: new Map<string, string>(),
      openers: new Map<string, string>(),
      lastRect: null,
    };
    expect(recoveryTarget(view, 's')).toBe('x');
    expect(recoveryTarget(view, 'other')).toBe('x');
    registry.remove('x');
    expect(recoveryTarget(view, 's')).toBeNull();
    expect(rememberedTarget(view)).toBeNull();
    expect(rectOf({ x: 1, y: 2 }).toJSON()).toEqual({});
  });

  it('autoFocusTarget skips a remembered id that is no longer registered', () => {
    const registry = new FocusRegistry();
    const root = document.createElement('div');
    document.body.appendChild(root);
    registry.add({ id: 'first', scope: 's', element: node(root, 'first', { x: 0, y: 0 }) });
    const view = {
      registry,
      remembered: new Map([['s', 'gone']]),
      openers: new Map<string, string>(),
      lastRect: null,
    };
    expect(autoFocusTarget(view, 's', 'remembered', false)).toBe('first');
    expect(autoFocusTarget(view, 's', 'first', true)).toBe('first');
    expect(autoFocusTarget(view, 's', 'remembered', true)).toBeNull();
    expect(autoFocusTarget(view, 's', false, false)).toBeNull();
    expect(autoFocusTarget(view, 'empty', 'first', false)).toBeNull();
  });
});
