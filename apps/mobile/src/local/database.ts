import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'fitness-applied.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;

export function openLocalDatabase() {
  databasePromise ??= SQLite.openDatabaseAsync(DATABASE_NAME);
  return databasePromise;
}

export async function migrateLocalDatabase() {
  const database = await openLocalDatabase();
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS content_packages (
      package_id TEXT NOT NULL,
      content_version TEXT NOT NULL,
      locale TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      payload TEXT NOT NULL,
      cached_at TEXT NOT NULL,
      PRIMARY KEY (package_id, content_version, locale)
    );
    CREATE TABLE IF NOT EXISTS sync_operations (
      operation_id TEXT PRIMARY KEY NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      state TEXT NOT NULL CHECK (state IN ('pending', 'in_flight', 'completed', 'failed')),
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  await database.runAsync(
    'INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)',
    1,
    new Date().toISOString(),
  );
  return database;
}
