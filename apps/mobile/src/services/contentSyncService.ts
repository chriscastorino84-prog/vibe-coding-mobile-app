import { getPublicEnvironment } from '../config/environment';
import type { ContentPackage } from '@fitness-applied/contracts';

import { getContentPackageWithOfflineFallback } from './fitnessAppliedContentClient';

export type ContentSyncResult =
  | { status: 'skipped'; reason: 'not_configured' }
  | { status: 'synced'; source: 'network' | 'cache'; package: ContentPackage }
  | { status: 'failed'; error: string };

export async function synchronizeLaunchContent(): Promise<ContentSyncResult> {
  if (!getPublicEnvironment().contentApiUrl) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  try {
    const result = await getContentPackageWithOfflineFallback('fitness-applied-launch');
    return { status: 'synced', ...result };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unable to synchronize launch content',
    };
  }
}
