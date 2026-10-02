import { describe, expect, it } from 'vitest';

import { calculateHrZones } from './hrZoneCalculator';

describe('HR Zone calculator', () => {
  it('calculates five Tanaka zones', () => {
    const result = calculateHrZones({ age: 30 });
    expect(result.maxHeartRate).toBe(187);
    expect(result.zones).toHaveLength(5);
    expect(result.zones[1]).toMatchObject({ lowerBpm: 112, upperBpm: 131 });
  });

  it('supports heart-rate-reserve zones', () => {
    const result = calculateHrZones({ age: 40, restingHeartRate: 60 });
    expect(result.zones[0]).toMatchObject({ lowerBpm: 120, upperBpm: 132 });
  });
});
