import { beforeEach, describe, expect, it, vi } from 'vitest';

const { storage } = vi.hoisted(() => ({ storage: new Map<string, string>() }));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => { storage.set(key, value); },
  },
}));

import { exportLegacyWorkoutData, importLegacyWorkoutData } from '../services/legacyWorkoutMigration';

describe('legacy workout preservation', () => {
  beforeEach(() => storage.clear());

  it('exports legacy values without deleting them', async () => {
    storage.set('workout.completed-sessions.v1', '[{"id":"old-session"}]');
    const exported = await exportLegacyWorkoutData();
    expect(exported.values['workout.completed-sessions.v1']).toBe('[{"id":"old-session"}]');
    expect(storage.has('workout.completed-sessions.v1')).toBe(true);
  });

  it('imports exported values without clearing existing values', async () => {
    await importLegacyWorkoutData({
      exportedAt: '2026-09-27T00:00:00.000Z',
      values: { 'workout.trophies.v1': '[]' },
    });
    expect(storage.get('workout.trophies.v1')).toBe('[]');
  });
});
