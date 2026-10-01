import type { SyncOperationType } from '../local/syncQueue';
import { openLocalDatabase } from '../local/database';
export { retryDelayMs } from './syncBackoff';

export type SyncOperationState = 'pending' | 'in_flight' | 'completed' | 'failed';

export interface SyncOperation {
  operationId: string;
  entityType: string;
  entityId: string;
  operationType: SyncOperationType;
  payload: unknown;
  state: SyncOperationState;
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncTransport {
  submit(operation: SyncOperation): Promise<void>;
}

function fromRow(row: {
  operation_id: string;
  entity_type: string;
  entity_id: string;
  operation_type: SyncOperationType;
  payload: string;
  state: SyncOperationState;
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}): SyncOperation {
  return {
    operationId: row.operation_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    operationType: row.operation_type,
    payload: JSON.parse(row.payload) as unknown,
    state: row.state,
    attempts: row.attempts,
    lastError: row.last_error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPendingOperations(limit = 25): Promise<SyncOperation[]> {
  const database = await openLocalDatabase();
  const rows = await database.getAllAsync<Parameters<typeof fromRow>[0]>(
    `SELECT operation_id, entity_type, entity_id, operation_type, payload, state,
      attempts, last_error, created_at, updated_at
     FROM sync_operations
     WHERE state IN ('pending', 'failed')
     ORDER BY created_at ASC LIMIT ?`,
    limit,
  );
  return rows.map(fromRow);
}

export async function flushSyncQueue(transport: SyncTransport, limit = 25) {
  const database = await openLocalDatabase();
  const operations = await getPendingOperations(limit);
  const results: { operationId: string; state: SyncOperationState }[] = [];

  for (const operation of operations) {
    const now = new Date().toISOString();
    await database.runAsync(
      `UPDATE sync_operations
       SET state = 'in_flight', attempts = attempts + 1, updated_at = ?
       WHERE operation_id = ? AND state IN ('pending', 'failed')`,
      now,
      operation.operationId,
    );
    try {
      await transport.submit({ ...operation, state: 'in_flight', attempts: operation.attempts + 1 });
      await database.runAsync(
        `UPDATE sync_operations SET state = 'completed', last_error = NULL, updated_at = ?
         WHERE operation_id = ?`,
        new Date().toISOString(),
        operation.operationId,
      );
      results.push({ operationId: operation.operationId, state: 'completed' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown synchronization error';
      await database.runAsync(
        `UPDATE sync_operations SET state = 'failed', last_error = ?, updated_at = ?
         WHERE operation_id = ?`,
        message,
        new Date().toISOString(),
        operation.operationId,
      );
      results.push({ operationId: operation.operationId, state: 'failed' });
    }
  }
  return results;
}
