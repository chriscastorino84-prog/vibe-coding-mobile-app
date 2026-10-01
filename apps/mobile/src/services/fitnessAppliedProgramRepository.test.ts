import { describe, expect, it } from 'vitest';
import type { ContentPackage } from '@fitness-applied/contracts';

import { seedPrograms } from '../data/seedPrograms';
import { mapContentPackageToPrograms } from './fitnessAppliedProgramMapping';
import {
  buildProgramPreviews,
  FitnessAppliedProgramRepository,
} from './fitnessAppliedProgramRepository';

const contentPackage = (programs: ContentPackage['programs']): ContentPackage => ({
  packageId: 'fitness-applied-launch',
  schemaVersion: '1.0.0',
  contentVersion: '1.2.0',
  locale: 'en-US',
  publishedAt: '2026-09-30T00:00:00.000Z',
  contentHash: 'a'.repeat(64),
  minClientVersion: '1.0.0',
  status: 'published',
  programs,
  calculators: [],
  recipes: [],
  shoppingListTemplates: [],
  trophyDefinitions: [],
  analyticsDefinitions: [],
});

describe('Fitness-Applied program integration', () => {
  it('maps published warm-up metadata and sections onto the current Program model', () => {
    const programs = mapContentPackageToPrograms(contentPackage([
      {
        id: 'warmup',
        name: 'Published Dynamic Warm-Up',
        description: 'Published description',
        sections: [{
          id: 'primer',
          title: 'Primer',
          exercises: [{ id: 'march', name: 'March in place', prescription: '2 minutes' }],
        }],
      },
    ]));

    const warmUp = programs.find((program) => program.id === 'warm-up');
    expect(warmUp?.name).toBe('Published Dynamic Warm-Up');
    expect(warmUp?.sections?.[0].title).toBe('Primer');
    expect(warmUp?.sections?.[0].exercises[0].prescription).toBe('2 minutes');
  });

  it('keeps static warm-up and cool-down sections when the package has no program records', () => {
    const programs = mapContentPackageToPrograms(contentPackage([]));

    expect(programs.find((program) => program.id === 'warm-up')?.sections).toEqual(
      seedPrograms.find((program) => program.id === 'warm-up')?.sections,
    );
    expect(programs.find((program) => program.id === 'cool-down')?.sections?.length).toBeGreaterThan(0);
  });

  it('returns static programs without API credentials or a cached package', async () => {
    const repository = new FitnessAppliedProgramRepository(async () => {
      throw new Error('Fitness-Applied content API is not configured');
    });

    const result = await repository.load();

    expect(result.source).toBe('static');
    expect(result.programs.map((program) => program.id)).toContain('warm-up');
    expect(result.previews[0].contentSource).toBe('static');
  });

  it('marks previews as Fitness-Applied content for a cached or network package', () => {
    const previews = buildProgramPreviews(seedPrograms.slice(0, 1), 'fitness-applied', '1.2.0');

    expect(previews[0]).toMatchObject({
      id: 'warm-up',
      contentSource: 'fitness-applied',
      contentVersion: '1.2.0',
    });
  });

  it('preserves the existing content client source when a cached package is used', async () => {
    const repository = new FitnessAppliedProgramRepository(async () => ({
      package: contentPackage([{ id: 'warm-up' }]),
      source: 'cache',
    }));

    const result = await repository.load();

    expect(result.source).toBe('cache');
    expect(result.contentVersion).toBe('1.2.0');
    expect(result.previews.find((preview) => preview.id === 'warm-up')?.contentSource)
      .toBe('fitness-applied');
  });
});
