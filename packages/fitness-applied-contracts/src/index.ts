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

export interface ContentProgramExercise {
  id: string;
  name: string;
  prescription?: string;
  description?: string;
  focus?: string;
}

export interface ContentProgramSection {
  id: string;
  title: string;
  summary?: string;
  rounds?: string;
  exercises: ContentProgramExercise[];
}

/**
 * The published program shape is intentionally small. The mobile app can
 * safely ignore authoring-only fields while still rendering static sections.
 */
export interface ContentProgram {
  id: string;
  name?: string;
  type?: string;
  description?: string;
  phase?: string;
  tone?: string;
  accent?: string;
  sections?: ContentProgramSection[];
  workoutWeeks?: unknown[];
}

export interface ContentPackage extends ContentPackageMetadata {
  programs: ContentProgram[];
  calculators: unknown[];
  recipes: unknown[];
  shoppingListTemplates: unknown[];
  trophyDefinitions: unknown[];
  analyticsDefinitions: unknown[];
}

export function isPublishedPackage(value: ContentPackageMetadata): boolean {
  return value.status === 'published' && value.publishedAt !== null && /^[a-f0-9]{64}$/i.test(value.contentHash);
}
