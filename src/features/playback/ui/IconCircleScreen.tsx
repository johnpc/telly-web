import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { Icon, type IconName } from './IconsScreen';

interface IconCircleProps {
  focusId: string;
  icon: IconName;
  label: string;
  onClick: () => void;
  testId?: string;
}

/** Round icon button with TiviMate's circular focus treatment: transparent at rest, a white circle with a black glyph when focused. */
export function IconCircle({ focusId, icon, label, onClick, testId }: IconCircleProps): JSX.Element {
  return (
    <Focusable
      focusId={focusId}
      as="button"
      aria-label={label}
      data-testid={testId}
      onClick={onClick}
      className="flex h-[5rem] w-[5rem] items-center justify-center rounded-full text-white"
      focusedClassName="bg-telly-focus-fill text-telly-focus-text"
    >
      <Icon name={icon} className="h-[2.75rem] w-[2.75rem]" />
    </Focusable>
  );
}
