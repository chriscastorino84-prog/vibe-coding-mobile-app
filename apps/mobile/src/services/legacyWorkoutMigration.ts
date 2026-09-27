import AsyncStorage from '@react-native-async-storage/async-storage';

const LEGACY_KEYS = [
  'workout.completed-sessions.v1',
  'workout.trophies.v1',
  'workout.progress-photo-checkpoints.v1',
] as const;

export type LegacyWorkoutExport = {
  exportedAt: string;
  values: Partial<Record<(typeof LEGACY_KEYS)[number], string>>;
};

export async function exportLegacyWorkoutData(): Promise<LegacyWorkoutExport> {
  const values: LegacyWorkoutExport['values'] = {};
  for (const key of LEGACY_KEYS) {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) values[key] = value;
  }

  return { exportedAt: new Date().toISOString(), values };
}

export async function importLegacyWorkoutData(data: LegacyWorkoutExport): Promise<void> {
  for (const key of LEGACY_KEYS) {
    const value = data.values[key];
    if (value !== undefined) await AsyncStorage.setItem(key, value);
  }
}
