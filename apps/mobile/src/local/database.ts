import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const DATABASE_NAME = 'fitness-applied.db';
const DATABASE_KEY = 'fitness-applied.local-database-key.v1';

let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;

async function getDatabaseKey() {
  if (Platform.OS === 'web') return undefined;
  let key = await SecureStore.getItemAsync(DATABASE_KEY);
  if (!key) {
    key = Crypto.randomUUID();
    await SecureStore.setItemAsync(DATABASE_KEY, key, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
  return key;
}

export function openLocalDatabase() {
  databasePromise ??= (async () => {
    const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
    const key = await getDatabaseKey();
    if (key) await database.execAsync(`PRAGMA key = '${key.replaceAll("'", "''")}';`);
    return database;
  })();
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
    CREATE TABLE IF NOT EXISTS workouts (
      workout_id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      program_id TEXT NOT NULL,
      content_version TEXT NOT NULL,
      scheduled_week INTEGER NOT NULL,
      scheduled_day INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'abandoned')),
      payload TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS measurements (
      measurement_id TEXT PRIMARY KEY NOT NULL,
      workout_id TEXT,
      bodyweight_value REAL NOT NULL,
      bodyweight_unit TEXT NOT NULL CHECK (bodyweight_unit IN ('kg', 'lb')),
      body_composition_percent REAL NOT NULL,
      recorded_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS private_records (
      record_key TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
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

export async function initializeLocalDatabase() {
  return migrateLocalDatabase();
}

export async function getPrivateRecord<T>(key: string): Promise<T | null> {
  const database = await initializeLocalDatabase();
  const record = await database.getFirstAsync<{ payload: string }>(
    'SELECT payload FROM private_records WHERE record_key = ?',
    key,
  );
  return record ? JSON.parse(record.payload) as T : null;
}

export async function setPrivateRecord(key: string, value: unknown): Promise<void> {
  const database = await initializeLocalDatabase();
  await database.runAsync(
    'INSERT OR REPLACE INTO private_records (record_key, payload, updated_at) VALUES (?, ?, ?)',
    key,
    JSON.stringify(value),
    new Date().toISOString(),
  );
}
