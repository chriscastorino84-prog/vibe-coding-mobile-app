import { describe, expect, it } from 'vitest';

import { calculateBmr } from './bmrCalculator';

describe('BMR calculator', () => {
  it('returns a versioned Mifflin-St Jeor result for a male input', () => {
    expect(calculateBmr({ sex: 'male', age: 30, weightKg: 80, heightCm: 180 })).toMatchObject({
      value: 1780,
      unit: 'kcal/day',
      method: 'Mifflin-St Jeor',
      methodVersion: 'mifflin-st-jeor-v1',
      label: 'Calculated result',
    });
  });

  it('returns the female equation result', () => {
    expect(calculateBmr({ sex: 'female', age: 30, weightKg: 60, heightCm: 165 }).value).toBe(1320);
  });

  it('rejects invalid inputs instead of returning a plausible default', () => {
    expect(() => calculateBmr({ sex: 'male', age: 12, weightKg: 80, heightCm: 180 })).toThrow();
    expect(() => calculateBmr({ sex: 'male', age: 30, weightKg: 0, heightCm: 180 })).toThrow();
  });
});
