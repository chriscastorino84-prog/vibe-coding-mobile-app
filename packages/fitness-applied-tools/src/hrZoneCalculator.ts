export type HeartRateZone = {
  zone: 1 | 2 | 3 | 4 | 5;
  name: string;
  lowerBpm: number;
  upperBpm: number;
  percentage: readonly [number, number];
};

export type HrZoneCalculation = {
  method: 'tanaka' | 'age';
  maxHeartRate: number;
  restingHeartRate?: number;
  zones: HeartRateZone[];
};

export function calculateHrZones(input: {
  age: number;
  restingHeartRate?: number;
  method?: 'tanaka' | 'age';
}): HrZoneCalculation {
  if (!Number.isInteger(input.age) || input.age < 13 || input.age > 120) {
    throw new Error('Age must be a whole number from 13 to 120.');
  }
  if (input.restingHeartRate !== undefined
    && (!Number.isFinite(input.restingHeartRate) || input.restingHeartRate < 30 || input.restingHeartRate > 120)) {
    throw new Error('Resting heart rate must be between 30 and 120 BPM.');
  }

  const method = input.method ?? 'tanaka';
  const maxHeartRate = Math.round(method === 'tanaka' ? 208 - (0.7 * input.age) : 220 - input.age);
  const percentages: Array<readonly [number, number]> = [[0.5, 0.6], [0.6, 0.7], [0.7, 0.8], [0.8, 0.9], [0.9, 1]];
  const names = ['Recovery', 'Aerobic base', 'Tempo', 'Threshold', 'Peak'] as const;

  const zones = percentages.map(([lower, upper], index) => {
    const lowerBpm = input.restingHeartRate === undefined
      ? Math.round(maxHeartRate * lower)
      : Math.round(input.restingHeartRate + ((maxHeartRate - input.restingHeartRate) * lower));
    const upperBpm = input.restingHeartRate === undefined
      ? Math.round(maxHeartRate * upper)
      : Math.round(input.restingHeartRate + ((maxHeartRate - input.restingHeartRate) * upper));
    return {
      zone: (index + 1) as HeartRateZone['zone'],
      name: names[index],
      lowerBpm,
      upperBpm,
      percentage: [lower, upper] as readonly [number, number],
    };
  });

  return { method, maxHeartRate, ...(input.restingHeartRate === undefined ? {} : { restingHeartRate: input.restingHeartRate }), zones };
}
