import { describe, expect, it } from 'vitest';

import { buildDataExport } from './dataExportService';

describe('data export', () => {
  it('returns a versioned JSON bundle', () => {
    const parsed = JSON.parse(buildDataExport({ workouts: [], measurements: [], trophies: [] })) as {
      formatVersion: string;
      exportedAt: string;
    };
    expect(parsed.formatVersion).toBe('1.0.0');
    expect(parsed.exportedAt).toMatch(/T/);
  });
});
