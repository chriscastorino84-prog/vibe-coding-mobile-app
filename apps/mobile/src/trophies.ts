import type { Trophy, WorkoutSession } from './types';

type TrophyRule = {
  id: string;
  name: string;
  description: string;
  category: Trophy['category'];
  icon: string;
  isEarned: (sessions: WorkoutSession[]) => boolean;
  attainmentSession: (sessions: WorkoutSession[]) => WorkoutSession;
};

const trophyRules: TrophyRule[] = [
  {
    id: 'first-workout',
    name: 'First workout complete',
    description: 'Finish your first recorded training session.',
    category: 'workout',
    icon: '01',
    isEarned: (sessions) => sessions.length >= 1,
    attainmentSession: (sessions) => sessions[0],
  },
  {
    id: 'measurement-check-in',
    name: 'Baseline captured',
    description: 'Record your first anthropometric measurement.',
    category: 'measurement',
    icon: '02',
    isEarned: (sessions) => sessions.some((session) => (session.measurements ?? []).length > 0),
    attainmentSession: (sessions) =>
      sessions.find((session) => (session.measurements ?? []).length > 0) ?? sessions[0],
  },
  {
    id: 'three-session-rhythm',
    name: 'Three-session rhythm',
    description: 'Complete three recorded training sessions.',
    category: 'consistency',
    icon: '03',
    isEarned: (sessions) => sessions.length >= 3,
    attainmentSession: (sessions) => sessions[2],
  },
  {
    id: 'garage-explorer',
    name: 'Garage explorer',
    description: 'Train through every seeded program type.',
    category: 'exploration',
    icon: '04',
    isEarned: (sessions) => new Set(sessions.map((session) => session.programId)).size >= 3,
    attainmentSession: (sessions) => sessions[sessions.length - 1],
  },
];

export function buildEarnedTrophies(sessions: WorkoutSession[]): Trophy[] {
  return trophyRules
    .filter((rule) => rule.isEarned(sessions))
    .map((rule) => {
      const session = rule.attainmentSession(sessions);
      return {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        category: rule.category,
        icon: rule.icon,
        unlockedAt: session.completedAt,
        attainmentSessionId: session.id,
        statsSnapshot: {
          tonnage: session.tonnage,
          exercises: (session.exercises ?? []).map((exercise) => ({
            name: exercise.name,
            tonnage: exercise.tonnage,
          })),
          measurements: session.measurements ?? [],
        },
      };
    });
}
