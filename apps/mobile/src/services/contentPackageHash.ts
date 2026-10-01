import * as Crypto from 'expo-crypto';

import type { ContentPackage } from '@fitness-applied/contracts';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>(
      (result, key) => {
        if (key !== 'contentHash') {
          result[key] = canonicalize((value as Record<string, unknown>)[key]);
        }
        return result;
      },
      {},
    );
  }
  return value;
}

export async function verifyContentPackageHash(contentPackage: ContentPackage): Promise<void> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify(canonicalize(contentPackage)),
  );
  if (hash.toLowerCase() !== contentPackage.contentHash.toLowerCase()) {
    throw new Error(`Content package ${contentPackage.packageId} failed hash verification`);
  }
}
