export type ContentStatus = 'draft' | 'published' | 'retired';

export interface ContentPackageMetadata {
  packageId: string;
  schemaVersion: string;
  contentVersion: string;
  locale: string;
  publishedAt: string | null;
  contentHash: string;
  minClientVersion: string;
  status: ContentStatus;
}

export interface ContentPackage extends ContentPackageMetadata {
  programs: unknown[];
  calculators: unknown[];
  recipes: unknown[];
  shoppingListTemplates: unknown[];
  trophyDefinitions: unknown[];
  analyticsDefinitions: unknown[];
}

export function isPublishedPackage(value: ContentPackageMetadata): boolean {
  return value.status === 'published' && value.publishedAt !== null && /^[a-f0-9]{64}$/i.test(value.contentHash);
}
