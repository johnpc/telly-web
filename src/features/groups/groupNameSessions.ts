import { Observable } from '@/features/guide/observable';
import type { CustomGroup } from './customGroups';
import {
  type GroupToolLive,
  type GroupToolSession,
  type GroupToolStore,
  type GroupToolUi,
  rowsUi,
  textUi,
} from './groupToolSession';
import { action, note } from './toolRows';

/** A session with no PIN gate and no observable steps. */
export abstract class StaticSession extends Observable implements GroupToolSession {
  abstract ui(live: GroupToolLive): GroupToolUi;
  activate(rowId: string, live: GroupToolLive): void {
    void rowId;
    void live;
  }
  submitText(text: string): void {
    void text;
  }
  submitPin(pin: string): Promise<void> {
    void pin;
    return Promise.resolve();
  }
}

/** "Create group": a name editor; committing creates an EMPTY custom group. */
export class CreateGroupSession extends StaticSession {
  constructor(
    private readonly store: GroupToolStore,
    private readonly onDone: () => void,
  ) {
    super();
  }

  ui(): GroupToolUi {
    return textUi('Create group', '');
  }

  override submitText(text: string): void {
    const name = text.trim();
    if (name === '') return;
    void this.store.createGroup(name).then(this.onDone);
  }
}

type Step = 'MENU' | 'RENAME' | 'CONFIRM_DELETE';

/**
 * "Group options" on the selected group: Rename / Delete when it is a custom
 * group; playlist groups (and Favorites / All channels) render both locked.
 */
export class GroupOptionsSession extends StaticSession {
  private step: Step = 'MENU';

  constructor(
    private readonly group: string,
    private readonly custom: CustomGroup | null,
    private readonly store: GroupToolStore,
    private readonly onDone: () => void,
  ) {
    super();
  }

  ui(): GroupToolUi {
    if (this.step === 'RENAME') return textUi('Rename group', this.group);
    if (this.step === 'CONFIRM_DELETE') {
      return rowsUi(`Delete ${this.group}?`, [action('confirm', 'Delete'), action('cancel', 'Cancel')]);
    }
    const locked = this.custom === null;
    const rows = [action('rename', 'Rename group', locked), action('delete', 'Delete group', locked)];
    return rowsUi(
      this.group,
      locked ? [...rows, note('Only custom groups can be renamed or deleted')] : rows,
    );
  }

  override activate(rowId: string): void {
    if (rowId === 'rename') this.go('RENAME');
    else if (rowId === 'delete') this.go('CONFIRM_DELETE');
    else if (rowId === 'cancel') this.go('MENU');
    else if (rowId === 'confirm' && this.custom !== null)
      void this.store.deleteGroup(this.custom.id).then(this.onDone);
  }

  override submitText(text: string): void {
    const name = text.trim();
    if (this.custom === null || name === '') return;
    void this.store.renameGroup(this.custom.id, name).then(this.onDone);
  }

  private go(step: Step): void {
    this.step = step;
    this.notify();
  }
}
