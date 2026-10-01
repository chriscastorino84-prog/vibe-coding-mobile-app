export interface TrophyDefinition {
  trophyId: string;
  ruleVersion: string;
  minimumCompletions: number;
}

export interface TrophyRecord {
  trophyId: string;
  ruleVersion: string;
  unlockedAt: string;
}

export function evaluateCompletionTrophies(
  definitions: TrophyDefinition[],
  completedSessions: number,
  existing: TrophyRecord[] = [],
): TrophyRecord[] {
  const unlocked = new Map(existing.map((record) => [record.trophyId, record]));
  for (const definition of definitions) {
    if (completedSessions >= definition.minimumCompletions && !unlocked.has(definition.trophyId)) {
      unlocked.set(definition.trophyId, {
        trophyId: definition.trophyId,
        ruleVersion: definition.ruleVersion,
        unlockedAt: new Date().toISOString(),
      });
    }
  }
  return [...unlocked.values()];
}
