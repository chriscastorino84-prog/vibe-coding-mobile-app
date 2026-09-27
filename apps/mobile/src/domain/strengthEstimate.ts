export const LANDER_METHOD = 'Lander' as const;
export const LANDER_METHOD_VERSION = 'lander-1967-v1' as const;
export const LANDER_MIN_REPS = 1;
export const LANDER_MAX_REPS = 10;

export type LanderEstimateInput = {
  load: number;
  reps: number;
  effort?: number | null;
  effortScale?: 'RPE' | 'RIR' | null;
};

export type LanderEstimate = {
  ok: true;
  estimated1RM: number;
  label: 'Approximate estimate';
  method: typeof LANDER_METHOD;
  methodVersion: typeof LANDER_METHOD_VERSION;
  provenance: {
    load: number;
    reps: number;
  };
  uncertainty: 'Equation-based estimate; actual performance may differ.';
};

export type LanderEstimateError =
  | 'invalid_load'
  | 'invalid_reps'
  | 'invalid_denominator'
  | 'invalid_estimate';

export type LanderEstimateResult = LanderEstimate | { ok: false; error: LanderEstimateError };

export function calculateLanderDenominator(reps: number): number {
  return 101.3 - 2.67123 * reps;
}

/**
 * Estimates 1RM from the final discovery set's entered load and reps.
 * Effort is intentionally excluded: it is not part of the Lander calculation.
 */
export function estimateLanderOneRepMax(input: LanderEstimateInput): LanderEstimateResult {
  const { load, reps } = input;

  if (!Number.isFinite(load) || load <= 0) {
    return { ok: false, error: 'invalid_load' };
  }
  if (!Number.isInteger(reps) || reps < LANDER_MIN_REPS || reps > LANDER_MAX_REPS) {
    return { ok: false, error: 'invalid_reps' };
  }

  const denominator = calculateLanderDenominator(reps);
  if (!Number.isFinite(denominator) || denominator <= 0) {
    return { ok: false, error: 'invalid_denominator' };
  }

  const estimated1RM = (100 * load) / denominator;
  if (!Number.isFinite(estimated1RM) || estimated1RM <= 0) {
    return { ok: false, error: 'invalid_estimate' };
  }

  return {
    ok: true,
    estimated1RM,
    label: 'Approximate estimate',
    method: LANDER_METHOD,
    methodVersion: LANDER_METHOD_VERSION,
    provenance: { load, reps },
    uncertainty: 'Equation-based estimate; actual performance may differ.',
  };
}
