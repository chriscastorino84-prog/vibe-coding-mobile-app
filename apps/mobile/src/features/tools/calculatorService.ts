import { convertEffortToPercentage, type EffortScale } from '../../domain/effortConversion';
import { estimateLanderOneRepMax } from '../../domain/strengthEstimate';
export { calculateBmr } from '../../../../../packages/fitness-applied-tools/src/bmrCalculator';
export type { BmrCalculation, BmrSex } from '../../../../../packages/fitness-applied-tools/src/bmrCalculator';
export { calculateHrZones } from '../../../../../packages/fitness-applied-tools/src/hrZoneCalculator';
export type { HeartRateZone, HrZoneCalculation } from '../../../../../packages/fitness-applied-tools/src/hrZoneCalculator';

export type CalculatorResult = {
  value: number;
  unit: string;
  label: 'Approximate estimate' | 'Calculated result';
  method: string;
  methodVersion: string;
  limitation: string;
};

export function calculateBmi(weightKg: number, heightCm: number): CalculatorResult {
  if (!Number.isFinite(weightKg) || weightKg <= 0 || !Number.isFinite(heightCm) || heightCm <= 0) {
    throw new Error('Weight and height must be positive numbers');
  }
  const value = Number((weightKg / ((heightCm / 100) ** 2)).toFixed(2));
  return {
    value,
    unit: 'kg/m²',
    label: 'Calculated result',
    method: 'BMI',
    methodVersion: 'bmi-v1',
    limitation: 'BMI is a general screening measure and does not diagnose health conditions.',
  };
}

export function calculateLander(load: number, reps: number): CalculatorResult {
  const result = estimateLanderOneRepMax({ load, reps });
  if (!result.ok) throw new Error(`Unable to calculate Lander estimate: ${result.error}`);
  return {
    value: Number(result.estimated1RM.toFixed(2)),
    unit: 'load units',
    label: result.label,
    method: result.method,
    methodVersion: result.methodVersion,
    limitation: result.uncertainty,
  };
}

export function calculateEffortEstimate(
  load: number,
  reps: number,
  effort: number,
  effortScale: EffortScale,
): CalculatorResult {
  const result = convertEffortToPercentage({ load, reps, effort, effortScale });
  if (!result.ok) throw new Error(`Unable to calculate effort estimate: ${result.error}`);
  return {
    value: Number(result.estimated1RM.toFixed(2)),
    unit: 'load units',
    label: result.label,
    method: result.method,
    methodVersion: result.methodVersion,
    limitation: result.uncertainty,
  };
}
