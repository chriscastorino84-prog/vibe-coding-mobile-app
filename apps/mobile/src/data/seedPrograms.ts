import type { Program } from '../types';

const dynamicWarmUpSections: NonNullable<Program['sections']> = [
  {
    id: 'cardio-primer',
    title: 'Cardio Primer',
    summary: 'Start here to raise heart rate, body temperature, and fluid transport before mobility work.',
    rounds: '5 minutes',
    exercises: [
      { id: 'low-intensity-cardio', name: 'Low-intensity cardio', prescription: '5 minutes', focus: 'Keep the effort conversational and steady; the goal is preparation, not fatigue.' },
    ],
  },
  {
    id: 'hr-mobility',
    title: 'HR & Mobility Warm-Up',
    summary: 'Move dynamically through the ranges you will use in training.',
    rounds: '2 rounds',
    exercises: [
      { id: 'drinking-bird', name: 'Drinking Bird', prescription: '5 reps each side', focus: 'Hips back, chest up, slide the opposite hand down the planted leg.', description: 'You should feel the calves, back of the knee, hamstrings, and glutes.' },
      { id: 'lunge-reach-rotate', name: 'Lunge + Reach and Rotate', prescription: '5 reps each side', focus: 'Reach from the hips and rotate toward the opposite knee.', description: 'Keep attention on the grounded knee and move only as far as comfortable.' },
      { id: 'toy-soldier', name: 'Toy Soldier', prescription: '5 alternating reps each side', focus: 'Keep your chest up, hips square, and pull the toe toward the hand.', description: 'Do not kick or tuck the tailbone to reach higher.' },
      { id: 'over-under', name: 'Over / Under', prescription: '5 reps each way', focus: 'Keep your hips square over; use a wide, parallel stance under.', description: 'Keep the straight leg softly locked and knees wide as you shift.' },
      { id: 'worlds-greatest-stretch', name: "World's Greatest Stretch", prescription: '5 reps each way', focus: 'Hold a strong high plank and rotate only as far as balance allows.', description: 'Plant both hands inside the lunged leg before rotating.' },
    ],
  },
  {
    id: 'shoulders-hips-core',
    title: 'Shoulders, Hips & Core Warm-Up',
    summary: 'Build control through the shoulders, hips, and trunk.',
    rounds: '3 compound sets',
    exercises: [
      { id: 'prone-ys', name: "Prone Y's", prescription: '15 bodyweight; 12 light; 10 light+', focus: 'Keep thumbs up and pull them toward the sky behind you.' },
      { id: 'four-position-bridge', name: '4-Position Bridge + High-Hip Clamshells', prescription: '5 reps each position + 10 clamshells', focus: 'Brace first, keep a neutral spine, and drive hips high.', description: 'Move through four foot/knee positions, then open and close the legs with hips held high.' },
      { id: 'hollow-rock', name: 'Hollow Rock', prescription: '15 reps', focus: 'Lift your chest, press your low back down, and hold your legs off the floor.', description: 'If the low back takes over, switch to long-lever reverse sit-ups.' },
    ],
  },
];

const conditioningRampUpWeekOne = [
  {
    id: 'conditioning-ramp-up-day-1',
    dayNumber: 1 as const,
    title: 'Strength + steady-state',
    focus: 'Full-body strength at RPE 6, then aerobic base work.',
    exercises: [
      { id: 'goblet-squat', name: 'Goblet Squat', sets: 3, reps: '12', rpePrescription: 'RPE 6' },
      { id: 'db-chest-press', name: 'DB Chest Press', sets: 3, reps: '12', rpePrescription: 'RPE 6' },
      { id: 'bent-db-row', name: 'Bent DB Row', sets: 3, reps: '12', rpePrescription: 'RPE 6' },
      { id: 'single-leg-rdl', name: 'Single-Leg Romanian Deadlift', sets: 3, reps: '12', rpePrescription: 'RPE 6' },
      { id: 'plank', name: 'Plank', sets: 3, reps: '30-45 sec' },
      { id: 'steady-state-cardio-day-1', name: 'Steady-State Cardio', sets: 1, reps: '15 min', rpePrescription: 'Conversational pace' },
    ],
  },
  {
    id: 'conditioning-ramp-up-day-2',
    dayNumber: 2 as const,
    title: 'Conditioning circuit',
    focus: 'Five movements performed for time across three rounds.',
    exercises: [
      { id: 'kettlebell-swings', name: 'Kettlebell Swings', sets: 3, reps: '40 sec work / 20 sec rest' },
      { id: 'box-step-ups', name: 'Box Step-Ups', sets: 3, reps: '40 sec work / 20 sec rest' },
      { id: 'medicine-ball-slams', name: 'Medicine Ball Slams', sets: 3, reps: '40 sec work / 20 sec rest' },
      { id: 'mountain-climbers', name: 'Mountain Climbers', sets: 3, reps: '40 sec work / 20 sec rest' },
      { id: 'walking-lunges', name: 'Walking Lunges', sets: 3, reps: '40 sec work / 20 sec rest' },
    ],
  },
  {
    id: 'conditioning-ramp-up-day-3',
    dayNumber: 3 as const,
    title: 'Strength + steady-state',
    focus: 'Full-body strength at RPE 6, then aerobic base work.',
    exercises: [
      { id: 'lat-pulldown-assisted-pull-up', name: 'Lat Pulldown or Assisted Pull-Up', sets: 3, reps: '12', rpePrescription: 'RPE 6' },
      { id: 'goblet-split-squat', name: 'Goblet Split Squat', sets: 3, reps: '12', rpePrescription: 'RPE 6' },
      { id: 'half-kneeling-shoulder-press', name: 'DB 1/2 Kneel Shoulder Press', sets: 3, reps: '12 | 12', rpePrescription: 'RPE 6' },
      { id: 'cable-face-pull', name: 'Cable Face Pull', sets: 3, reps: '15' },
      { id: 'dead-bug', name: 'Dead Bug', sets: 3, reps: '10' },
      { id: 'steady-state-cardio-day-3', name: 'Steady-State Cardio', sets: 1, reps: '15 min', rpePrescription: 'Conversational pace' },
    ],
  },
];

export const seedPrograms: Program[] = [
  {
    id: 'warm-up',
    name: 'Dynamic Warm-Up',
    type: 'warm-up',
    status: 'current',
    description:
      'Prime the body with a quick mobility routine built to reduce stiffness and get the system ready for training.',
    phase: 'Warm-Up',
    tone: 'Mobility + readiness',
    accent: '#4FD1C5',
    startedAt: '2026-09-01T00:00:00.000Z',
    sections: dynamicWarmUpSections,
  },
  {
    id: 'resistance-build',
    name: 'Conditioning Ramp-Up',
    type: 'resistance',
    status: 'current',
    description:
      'Phase 1 conditioning with three weekly training days that build strength, movement quality, and aerobic capacity.',
    phase: 'Phase 1',
    tone: 'Conditioning + progression',
    accent: '#8B5CF6',
    startedAt: '2026-09-01T00:00:00.000Z',
    workoutDays: conditioningRampUpWeekOne,
  },
  {
    id: 'cool-down',
    name: 'Cool-Down Reset',
    type: 'cool-down',
    status: 'current',
    description:
      'Regain control, reduce fatigue, and close the session with a calm recovery reset.',
    phase: 'Recovery',
    tone: 'Recovery + reset',
    accent: '#F7C873',
    startedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'cardio-base',
    name: 'Cardio Base',
    type: 'cardio',
    status: 'current',
    description: 'Build an aerobic base with repeatable, measurable conditioning sessions.',
    phase: 'Engine build',
    tone: 'Endurance + capacity',
    accent: '#60A5FA',
    startedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'foundation-cycle-archive',
    name: 'Foundation Cycle',
    type: 'resistance',
    status: 'closed',
    description: 'A completed foundation block preserved as a progress record.',
    phase: 'Closed program',
    tone: 'Strength + consistency',
    accent: '#F97316',
    startedAt: '2026-06-01T00:00:00.000Z',
    closedAt: '2026-08-31T00:00:00.000Z',
  },
];
