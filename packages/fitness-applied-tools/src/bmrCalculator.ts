export type BmrSex = 'female' | 'male';

export type BmrCalculation = {
  value: number;
  unit: 'kcal/day';
  label: 'Calculated result';
  method: 'Mifflin-St Jeor';
  methodVersion: 'mifflin-st-jeor-v1';
  inputs: {
    sex: BmrSex;
    age: number;
    weightKg: number;
    heightCm: number;
  };
  limitation: string;
};

export function calculateBmr(input: {
  sex: BmrSex;
  age: number;
  weightKg: number;
  heightCm: number;
}): BmrCalculation {
  if (input.sex !== 'female' && input.sex !== 'male') {
    throw new Error('Sex must be female or male for the selected BMR equation.');
  }
  if (!Number.isInteger(input.age) || input.age < 13 || input.age > 120) {
    throw new Error('Age must be a whole number from 13 to 120.');
  }
  if (!Number.isFinite(input.weightKg) || input.weightKg <= 0 || input.weightKg > 500) {
    throw new Error('Weight must be greater than 0 and no more than 500 kg.');
  }
  if (!Number.isFinite(input.heightCm) || input.heightCm <= 0 || input.heightCm > 250) {
    throw new Error('Height must be greater than 0 and no more than 250 cm.');
  }

  const base = (10 * input.weightKg) + (6.25 * input.heightCm) - (5 * input.age);
  const value = Number((base + (input.sex === 'male' ? 5 : -161)).toFixed(0));

  return {
    value,
    unit: 'kcal/day',
    label: 'Calculated result',
    method: 'Mifflin-St Jeor',
    methodVersion: 'mifflin-st-jeor-v1',
    inputs: {
      sex: input.sex,
      age: input.age,
      weightKg: input.weightKg,
      heightCm: input.heightCm,
    },
    limitation: 'BMR is an estimate of resting energy needs and is not a diagnosis or a personalized calorie prescription.',
  };
}
