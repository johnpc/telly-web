import { createElement, type HTMLAttributes, type JSX, type ReactNode } from 'react';
import { useFocusable } from './useFocusable';

interface FocusableProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Unique within the app; also the target of `data-focus-*` overrides. */
  focusId: string;
  as?: 'div' | 'button' | 'li' | 'span' | 'a';
  /** Extra classes while focused (Tailwind ring, scale, ...). */
  focusedClassName?: string;
  children?: ReactNode | ((focused: boolean) => ReactNode);
}

function joinClasses(
  base: string | undefined,
  focused: boolean,
  extra: string | undefined,
): string | undefined {
  const classes = [base, focused ? extra : undefined].filter((c) => c !== undefined && c !== '');
  return classes.length === 0 ? undefined : classes.join(' ');
}

/** A focusable element (`div` by default) with a `focused` render prop or class hook. */
export function Focusable({
  focusId,
  as = 'div',
  className,
  focusedClassName,
  children,
  ...rest
}: FocusableProps): JSX.Element {
  const { ref, focused, props } = useFocusable(focusId);
  return createElement(
    as,
    { ...rest, ...props, ref, className: joinClasses(className, focused, focusedClassName) },
    typeof children === 'function' ? children(focused) : children,
  );
}
