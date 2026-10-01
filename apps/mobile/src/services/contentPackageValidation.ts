import type { ContentPackage, ContentPackageMetadata } from '@fitness-applied/contracts';

const SHA256_HASH = /^[a-f0-9]{64}$/i;

export function validateContentPackageMetadata(metadata: ContentPackageMetadata) {
  if (!metadata.packageId || !metadata.contentVersion || !metadata.locale) {
    throw new Error('Content package metadata is missing required identity fields');
  }
  if (metadata.status !== 'published') {
    throw new Error(`Content package ${metadata.packageId} is not published`);
  }
  if (!metadata.publishedAt || !SHA256_HASH.test(metadata.contentHash)) {
    throw new Error(`Content package ${metadata.packageId} has invalid publication metadata`);
  }
}

export function validateContentPackage(value: unknown): asserts value is ContentPackage {
  if (!value || typeof value !== 'object') {
    throw new Error('Content package response must be an object');
  }
  const candidate = value as Partial<ContentPackage>;
  validateContentPackageMetadata(candidate as ContentPackageMetadata);
  for (const collection of [
    candidate.programs,
    candidate.calculators,
    candidate.recipes,
    candidate.shoppingListTemplates,
    candidate.trophyDefinitions,
    candidate.analyticsDefinitions,
  ]) {
    if (!Array.isArray(collection)) {
      throw new Error('Content package collections must be arrays');
    }
  }
}
