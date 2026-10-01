import type { ContentPackage } from '@fitness-applied/contracts';

import { getPublicEnvironment } from '../config/environment';
import { saveContentPackage, getCachedContentPackage } from '../local/contentCacheRepository';
import { validateContentPackage } from './contentPackageValidation';

export async function fetchContentPackage(
  packageId: string,
  locale = 'en-US',
): Promise<ContentPackage> {
  const { contentApiUrl } = getPublicEnvironment();
  if (!contentApiUrl) {
    throw new Error('Fitness-Applied content API is not configured');
  }

  const url = new URL(`/api/v1/packages/${encodeURIComponent(packageId)}`, contentApiUrl);
  url.searchParams.set('locale', locale);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Fitness-Applied content request failed (${response.status})`);
  }

  const payload: unknown = await response.json();
  validateContentPackage(payload);
  await saveContentPackage(payload);
  return payload;
}

export async function getContentPackageWithOfflineFallback(
  packageId: string,
  locale = 'en-US',
): Promise<{ package: ContentPackage; source: 'network' | 'cache' }> {
  try {
    return { package: await fetchContentPackage(packageId, locale), source: 'network' };
  } catch (error) {
    const cached = await getCachedContentPackage(packageId, locale);
    if (cached) {
      validateContentPackage(cached);
      return { package: cached, source: 'cache' };
    }
    throw error;
  }
}
