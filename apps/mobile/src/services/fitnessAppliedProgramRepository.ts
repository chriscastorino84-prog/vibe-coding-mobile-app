import type { ContentPackage } from '@fitness-applied/contracts';

import { seedPrograms } from '../data/seedPrograms';
import type { Program } from '../types';
import { mapContentPackageToPrograms } from './fitnessAppliedProgramMapping';

export type ProgramPreview = Pick<Program, 'id' | 'name' | 'type' | 'description' | 'phase' | 'tone' | 'accent' | 'status'> & {
  contentVersion?: string;
  contentSource: 'fitness-applied' | 'static';
};

export type FitnessAppliedProgramsResult = {
  programs: Program[];
  previews: ProgramPreview[];
  source: 'network' | 'cache' | 'static';
  contentVersion?: string;
};

export type ContentPackageLoader = (
  packageId: string,
  locale: string,
) => Promise<{ package: ContentPackage; source: 'network' | 'cache' }>;

async function loadContentPackage(
  packageId: string,
  locale: string,
): Promise<{ package: ContentPackage; source: 'network' | 'cache' }> {
  // Keep the repository importable in node-based tests and static builds that
  // do not load Expo's native SQLite module.
  const { getContentPackageWithOfflineFallback } = await import('./fitnessAppliedContentClient');
  return getContentPackageWithOfflineFallback(packageId, locale);
}

export function buildProgramPreviews(
  programs: Program[],
  contentSource: ProgramPreview['contentSource'] = 'static',
  contentVersion?: string,
): ProgramPreview[] {
  return programs.map(({ id, name, type, description, phase, tone, accent, status }) => ({
    id,
    name,
    type,
    description,
    phase,
    tone,
    accent,
    status,
    contentSource,
    ...(contentVersion ? { contentVersion } : {}),
  }));
}

export class FitnessAppliedProgramRepository {
  constructor(
    private readonly loadPackage: ContentPackageLoader = loadContentPackage,
    private readonly fallbackPrograms: Program[] = seedPrograms,
  ) {}

  async load(
    packageId = 'fitness-applied-launch',
    locale = 'en-US',
  ): Promise<FitnessAppliedProgramsResult> {
    try {
      const result = await this.loadPackage(packageId, locale);
      const programs = mapContentPackageToPrograms(result.package, this.fallbackPrograms);
      return {
        programs,
        previews: buildProgramPreviews(programs, 'fitness-applied', result.package.contentVersion),
        source: result.source,
        contentVersion: result.package.contentVersion,
      };
    } catch {
      return {
        programs: this.fallbackPrograms,
        previews: buildProgramPreviews(this.fallbackPrograms),
        source: 'static',
      };
    }
  }
}

export const fitnessAppliedProgramRepository = new FitnessAppliedProgramRepository();
