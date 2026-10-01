import { describe, expect, it } from 'vitest';
import { exportWorkoutPrograms } from './export.js';

const source = {
  name: 'kaggle/uihyunk/crossfit-wods-2019-2025',
  revision: 'v1',
  license: {
    name: 'Database: Open Database, Contents: Database Contents',
    approved: true,
    attribution: 'UiHyunK on Kaggle',
  },
};

describe('CrossFit WOD export', () => {
  it('preserves the source workout and maps it to the content program shape', () => {
    const result = exportWorkoutPrograms(
      'wod,men_setting,women_setting\n"For time: 30 deadlifts 20 cleans",205 lb,145 lb\n"AMRAP 10 minutes: 5 burpees",,',
      source,
    );
    expect(result.programs).toHaveLength(2);
    expect(result.programs[0].sections[0].exercises[0]).toMatchObject({
      prescription: 'For time: 30 deadlifts 20 cleans',
      workoutType: 'standard',
      description: "Men's setting: 205 lb\nWomen's setting: 145 lb",
    });
    expect(result.programs[1].sections[0].exercises[0].workoutType).toBe('amrap');
    expect(result.programs[0]).toMatchObject({ category: 'WOD', marketplace: { status: 'published' } });
  });

  it('handles commas inside quoted WOD text', () => {
    const result = exportWorkoutPrograms(
      'wod,men_setting,women_setting\n"Complete 3 rounds, then row 500m",,',
      source,
    );
    expect(result.programs[0].description).toContain('Complete 3 rounds, then row 500m');
  });

  it('fails closed until the license is explicitly approved', () => {
    expect(() => exportWorkoutPrograms('wod\nBurpees', {
      ...source,
      license: { ...source.license, approved: false },
    })).toThrow(/license review approval/i);
  });
});
