import { describe, expect, it } from 'vitest';

import { validateContentPackage } from './contentPackageValidation';

const packageBase = {
  packageId: 'launch',
  schemaVersion: '1.0.0',
  contentVersion: '1.0.0',
  locale: 'en-US',
  publishedAt: '2026-09-30T00:00:00.000Z',
  minClientVersion: '1.0.0',
  programs: [],
  calculators: [],
  recipes: [],
  shoppingListTemplates: [],
  trophyDefinitions: [],
  analyticsDefinitions: [],
};

describe('content package validation', () => {
  it('accepts a published package with a real-looking hash', () => {
    expect(() => validateContentPackage({
      ...packageBase,
      status: 'published',
      contentHash: 'a'.repeat(64),
    })).not.toThrow();
  });

  it('rejects drafts and placeholder hashes', () => {
    expect(() => validateContentPackage({
      ...packageBase,
      status: 'draft',
      contentHash: '0'.repeat(64),
    })).toThrow();
  });
});
