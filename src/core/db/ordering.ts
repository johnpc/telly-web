import type { EntityTable, IDType, InsertType } from 'dexie';

/** `ORDER BY` helper shared by the repositories (SQLite-style string ordering). */
export function compareStrings(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * Room `OnConflictStrategy.REPLACE` over a unique secondary index: `put`
 * over the existing row id when the index already holds the key, else
 * `add`. (Room re-inserts with a new id; keeping the id is the one
 * deliberate difference.)
 */
export function putOrAdd<Row extends { id: number }>(
  table: EntityTable<Row, 'id'>,
  row: InsertType<Row, 'id'>,
  existingId: number | undefined,
): Promise<IDType<Row, 'id'>> {
  return existingId === undefined ? table.add(row) : table.put({ ...row, id: existingId } as Row);
}
