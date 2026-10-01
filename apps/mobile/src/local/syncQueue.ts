import { randomUUID } from 'expo-crypto';

import { openLocalDatabase } from './database';

export type SyncOperationType = 'create' | 'update' | 'delete';

export async function enqueueSyncOperation(input: {
  entityType: string;
  entityId: string;
  operationType: SyncOperationType;
  payload: unknown;
}) {
  const database = await openLocalDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO sync_operations
      (operation_id, entity_type, entity_id, operation_type, payload, state, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
    randomUUID(),
    input.entityType,
    input.entityId,
    input.operationType,
    JSON.stringify(input.payload),
    now,
    now,
  );
}
