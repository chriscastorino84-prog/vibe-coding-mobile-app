import { describe, expect, it } from 'vitest';

import {
  calculateLanderDenominator,
  estimateLanderOneRepMax,
  LANDER_MAX_REPS,
  LANDER_MIN_REPS,
  LANDER_METHOD_VERSION,
} from './strengthEstimate';

describe('Lander strength estimates', () => {
  it('uses the entered discovery load and reps and labels the result with its method version', () => {
    const result = estimateLanderOneRepMax({ load: 100, reps: 5 });

    expect(result).toMatchObject({
      ok: true,
      label: 'Approximate estimate',
      method: 'Lander',
      methodVersion: LANDER_METHOD_VERSION,
      provenance: { load: 100, reps: 5 },
    });
    if (!result.ok) return;
    expect(result.estimated1RM).toBeCloseTo((100 * 100) / (101.3 - 2.67123 * 5));
    expect(result.uncertainty).toContain('Equation-based estimate');
  });

  it('accepts both ends of the documented 1–10 rep range', () => {
    for (const reps of [LANDER_MIN_REPS, LANDER_MAX_REPS]) {
      expect(estimateLanderOneRepMax({ load: 80, reps }).ok).toBe(true);
    }
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects invalid load %s',
    (load) => {
      expect(estimateLanderOneRepMax({ load, reps: 5 })).toEqual({ ok: false, error: 'invalid_load' });
    },
  );

  it.each([0, -1, 1.5, 11, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid reps %s',
    (reps) => {
      expect(estimateLanderOneRepMax({ load: 80, reps })).toEqual({ ok: false, error: 'invalid_reps' });
    },
  );

  it('does not use effort on the %1RM pathway', () => {
    const withoutEffort = estimateLanderOneRepMax({ load: 80, reps: 6 });
    const withEffort = estimateLanderOneRepMax({ load: 80, reps: 6, effort: 0, effortScale: 'RIR' });

    expect(withEffort).toEqual(withoutEffort);
  });

  it('identifies the formula denominator failure boundary outside supported reps', () => {
    expect(calculateLanderDenominator(38)).toBeLessThanOrEqual(0);
    expect(estimateLanderOneRepMax({ load: 80, reps: 38 })).toEqual({ ok: false, error: 'invalid_reps' });
  });

  it('rejects an estimate that overflows despite valid inputs', () => {
    const result = estimateLanderOneRepMax({ load: Number.MAX_VALUE, reps: 10 });

    expect(result).toEqual({ ok: false, error: 'invalid_estimate' });
  });
});
