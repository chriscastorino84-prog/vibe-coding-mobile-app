import { describe, expect, it } from 'vitest';

import {
  convertEffortToPercentage,
  EFFORT_CONVERSION_METHOD_VERSION,
  RPE_TO_RIR_ANCHORS,
} from './effortConversion';

describe('RPE/RIR percentage conversion', () => {
  it('exposes the explicit RPE/RIR anchor mapping', () => {
    expect(RPE_TO_RIR_ANCHORS).toEqual({ 10: 0, 9: 1, 8: 2, 7: 3 });
  });

  it.each([
    [10, 0],
    [9, 1],
    [8, 2],
    [7, 3],
  ])('maps RPE %i to %i RIR and retains estimate provenance', (effort, inferredRir) => {
    const result = convertEffortToPercentage({ load: 100, reps: 5, effort, effortScale: 'RPE' });

    expect(result).toMatchObject({
      ok: true,
      label: 'Approximate estimate',
      method: 'RPE/RIR percentage lookup',
      methodVersion: EFFORT_CONVERSION_METHOD_VERSION,
      provenance: { load: 100, reps: 5, effort, effortScale: 'RPE', inferredRir },
    });
    if (!result.ok) return;
    expect(result.estimated1RM).toBeGreaterThan(0);
    expect(result.percentageRange.min).toBeLessThan(result.estimatedPercentage);
    expect(result.percentageRange.max).toBeGreaterThan(result.estimatedPercentage);
    expect(result.provenance.source).toContain('Helms');
    expect(result.uncertainty).toContain('Approximate');
  });

  it('uses direct RIR input and keeps lower-effort extrapolation visibly uncertain', () => {
    const result = convertEffortToPercentage({ load: 80, reps: 8, effort: 5, effortScale: 'RIR' });

    expect(result).toMatchObject({
      ok: true,
      provenance: { effortScale: 'RIR', inferredRir: 5 },
    });
    if (!result.ok) return;
    expect(result.uncertainty).toContain('heuristic extension');
    expect(result.percentageRange.max - result.percentageRange.min).toBeGreaterThan(10);
  });

  it('applies the reciprocal-scale rule below the documented RPE anchors and discloses it', () => {
    const result = convertEffortToPercentage({ load: 80, reps: 8, effort: 6, effortScale: 'RPE' });

    expect(result).toMatchObject({ ok: true, provenance: { inferredRir: 4 } });
    if (!result.ok) return;
    expect(result.uncertainty).toContain('heuristic extension');
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects load %s', (load) => {
    expect(convertEffortToPercentage({ load, reps: 5, effort: 8, effortScale: 'RPE' }))
      .toEqual({ ok: false, error: 'invalid_load' });
  });

  it.each([0, 1.5, 11, Number.NaN])('rejects reps %s outside 1–10', (reps) => {
    expect(convertEffortToPercentage({ load: 80, reps, effort: 8, effortScale: 'RPE' }))
      .toEqual({ ok: false, error: 'invalid_reps' });
  });

  it.each([-1, 1.5, 11, Number.NaN, Number.POSITIVE_INFINITY])('rejects effort %s outside 0–10 integer values', (effort) => {
    expect(convertEffortToPercentage({ load: 80, reps: 5, effort, effortScale: 'RIR' }))
      .toEqual({ ok: false, error: 'invalid_effort' });
  });
});
