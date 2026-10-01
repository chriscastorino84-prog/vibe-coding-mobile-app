import { describe, expect, it } from 'vitest';

import { calculateBmi, calculateEffortEstimate, calculateLander } from './calculatorService';

describe('calculator service', () => {
  it('returns labeled BMI results', () => {
    expect(calculateBmi(80, 180)).toMatchObject({ value: 24.69, method: 'BMI' });
  });

  it('uses Fitness-Applied calculation methods', () => {
    expect(calculateLander(100, 5).method).toBe('Lander');
    expect(calculateEffortEstimate(100, 5, 8, 'RPE').label).toBe('Approximate estimate');
  });
});
