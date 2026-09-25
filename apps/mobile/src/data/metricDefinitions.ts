import type { MeasurementDefinition } from '../types';

export const exerciseDefinitions = [
  { id: 'squat', name: 'Squat' },
  { id: 'bench-press', name: 'Bench press' },
  { id: 'row', name: 'Row' },
] as const;

export const measurementDefinitions: MeasurementDefinition[] = [
  {
    id: 'body-weight',
    label: 'Body weight',
    category: 'anthropometric',
    unit: 'lb',
  },
  {
    id: 'waist',
    label: 'Waist',
    category: 'anthropometric',
    unit: 'in',
  },
  {
    id: 'chest',
    label: 'Chest',
    category: 'anthropometric',
    unit: 'in',
  },
];
