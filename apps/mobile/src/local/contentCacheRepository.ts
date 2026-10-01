import type { ContentPackage } from '@fitness-applied/contracts';

import { openLocalDatabase } from './database';

export async function saveContentPackage(contentPackage: ContentPackage) {
  const database = await openLocalDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO content_packages
      (package_id, content_version, locale, content_hash, payload, cached_at)
      VALUES (?, ?, ?, ?, ?, ?)`,
    contentPackage.packageId,
    contentPackage.contentVersion,
    contentPackage.locale,
    contentPackage.contentHash,
    JSON.stringify(contentPackage),
    new Date().toISOString(),
  );
}

export async function getCachedContentPackage(
  packageId: string,
  locale: string,
): Promise<ContentPackage | null> {
  const database = await openLocalDatabase();
  const row = await database.getFirstAsync<{ payload: string }>(
    `SELECT payload FROM content_packages
     WHERE package_id = ? AND locale = ?
     ORDER BY cached_at DESC LIMIT 1`,
    packageId,
    locale,
  );
  return row ? (JSON.parse(row.payload) as ContentPackage) : null;
}
