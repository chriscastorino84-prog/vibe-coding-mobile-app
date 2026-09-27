export const EFFORT_CONVERSION_METHOD = 'RPE/RIR percentage lookup' as const;
export const EFFORT_CONVERSION_METHOD_VERSION = 'rpe-rir-approx-v1' as const;
export const EFFORT_CONVERSION_SOURCE =
  'Helms et al. (2016) RPE chart, with RPE/RIR anchors described by Zourdos et al. (2016); see feature research.md';

export type EffortScale = 'RPE' | 'RIR';

export type EffortConversionInput = {
  load: number;
  reps: number;
  effort: number;
  effortScale: EffortScale;
};

export type EffortConversionError =
  | 'invalid_load'
  | 'invalid_reps'
  | 'invalid_effort'
  | 'invalid_denominator';

export type EffortConversionResult =
  | {
      ok: true;
      estimated1RM: number;
      estimatedPercentage: number;
      percentageRange: { min: number; max: number };
      label: 'Approximate estimate';
      method: typeof EFFORT_CONVERSION_METHOD;
      methodVersion: typeof EFFORT_CONVERSION_METHOD_VERSION;
      provenance: {
        load: number;
        reps: number;
        effort: number;
        effortScale: EffortScale;
        inferredRir: number;
        source: string;
      };
      uncertainty: string;
    }
  | { ok: false; error: EffortConversionError };

const MIN_REPS = 1;
const MAX_REPS = 10;
const MIN_EFFORT = 0;
const MAX_EFFORT = 10;

export const RPE_TO_RIR_ANCHORS = {
  10: 0,
  9: 1,
  8: 2,
  7: 3,
} as const;

// Coarse percentage estimates for 1–10 reps at RIR 0–3. Values are rounded
// to 5 percentage-point increments because published charts include estimates
// and meaningful individual variation, not precise universal measurements.
const PERCENT_OF_1RM_BY_REPS_AND_RIR: Record<number, readonly [number, number, number, number]> = {
  1: [100, 100, 95, 95],
  2: [95, 95, 90, 90],
  3: [95, 90, 90, 85],
  4: [90, 90, 85, 85],
  5: [90, 90, 85, 80],
  6: [90, 85, 85, 80],
  7: [90, 85, 80, 80],
  8: [85, 85, 80, 75],
  9: [85, 80, 80, 75],
  10: [85, 80, 75, 75],
};

const ANCHORED_RIR_MAX = 3;
const APPROXIMATION_STEP_PERCENT = 3;
const MIN_ESTIMATED_PERCENT = 5;

function inferRir(effort: number, effortScale: EffortScale): number {
  if (effortScale === 'RIR') return effort;

  const anchoredRir = RPE_TO_RIR_ANCHORS[effort as keyof typeof RPE_TO_RIR_ANCHORS];
  if (anchoredRir !== undefined) return anchoredRir;

  // The conventional reciprocal scale relation extends below the four
  // well-established anchors; those values remain explicitly heuristic.
  return 10 - effort;
}

function estimatePercentage(reps: number, rir: number): number {
  const anchoredRir = Math.min(rir, ANCHORED_RIR_MAX);
  const anchorPercentage = PERCENT_OF_1RM_BY_REPS_AND_RIR[reps][anchoredRir];
  const extrapolatedPoints = Math.max(0, rir - ANCHORED_RIR_MAX) * APPROXIMATION_STEP_PERCENT;
  return Math.max(MIN_ESTIMATED_PERCENT, anchorPercentage - extrapolatedPoints);
}

/**
 * Estimates 1RM from the entered set and an explicitly versioned RPE/RIR
 * lookup. Values beyond the RPE 7–10 / RIR 0–3 anchors use a disclosed
 * linear extension and have a wider uncertainty range.
 */
export function convertEffortToPercentage(input: EffortConversionInput): EffortConversionResult {
  const { load, reps, effort, effortScale } = input;

  if (!Number.isFinite(load) || load <= 0) return { ok: false, error: 'invalid_load' };
  if (!Number.isInteger(reps) || reps < MIN_REPS || reps > MAX_REPS) {
    return { ok: false, error: 'invalid_reps' };
  }
  if (!Number.isFinite(effort) || !Number.isInteger(effort) || effort < MIN_EFFORT || effort > MAX_EFFORT) {
    return { ok: false, error: 'invalid_effort' };
  }
  if (effortScale !== 'RPE' && effortScale !== 'RIR') return { ok: false, error: 'invalid_effort' };

  const inferredRir = inferRir(effort, effortScale);
  const estimatedPercentage = estimatePercentage(reps, inferredRir);
  const denominator = estimatedPercentage / 100;
  if (!Number.isFinite(denominator) || denominator <= 0) {
    return { ok: false, error: 'invalid_denominator' };
  }

  const estimated1RM = load / denominator;
  if (!Number.isFinite(estimated1RM) || estimated1RM <= 0) {
    return { ok: false, error: 'invalid_denominator' };
  }

  const usesHeuristicExtension = inferredRir > ANCHORED_RIR_MAX;
  const uncertaintyPoints = usesHeuristicExtension ? 10 : 5;

  return {
    ok: true,
    estimated1RM,
    estimatedPercentage,
    percentageRange: {
      min: Math.max(0, estimatedPercentage - uncertaintyPoints),
      max: Math.min(100, estimatedPercentage + uncertaintyPoints),
    },
    label: 'Approximate estimate',
    method: EFFORT_CONVERSION_METHOD,
    methodVersion: EFFORT_CONVERSION_METHOD_VERSION,
    provenance: {
      load,
      reps,
      effort,
      effortScale,
      inferredRir,
      source: EFFORT_CONVERSION_SOURCE,
    },
    uncertainty: usesHeuristicExtension
      ? 'Approximate lookup with a heuristic extension below RPE 7 / above RIR 3; individual variation may be substantial.'
      : 'Approximate chart lookup; source values include estimates and individual variation.',
  };
}
