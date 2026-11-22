import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { Icon, type IconName } from './IconsScreen';

interface MenuRowProps {
  focusId: string;
  label: string;
  onClick: () => void;
  icon?: IconName | undefined;
  /** Radio mark for single-choice pickers. */
  checked?: boolean | undefined;
  testId?: string;
}

/** Text row with the universal white focus pill (context-menu rows, picker rows). */
export function MenuRow({ focusId, label, onClick, icon, checked, testId }: MenuRowProps): JSX.Element {
  return (
    <Focusable
      focusId={focusId}
      as="button"
      data-testid={testId}
      onClick={onClick}
      className="flex h-[5rem] w-full items-center gap-[1.5rem] rounded px-[2rem] text-left text-[1.875rem] text-telly-text"
      focusedClassName="bg-telly-focus-fill text-telly-focus-text"
    >
      {icon !== undefined && <Icon name={icon} className="h-[2.25rem] w-[2.25rem]" />}
      {checked !== undefined && (
        <span
          className={`h-[2.25rem] w-[2.25rem] shrink-0 rounded-full border-[0.25rem] ${checked ? 'border-current bg-current' : 'border-current'}`}
          aria-checked={checked}
          role="radio"
        />
      )}
      <span className="truncate">{label}</span>
    </Focusable>
  );
}
