import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { parseWodDetailed, type WodLexicon } from './wodConversionEngine';
import { generatePage, generateProgram, headline, lineText, type MasterDataset, type MasterWorkout } from './workoutGenerator';

const lexicon = JSON.parse(readFileSync(new URL('../../../scripts/wod-compiler/movements.json', import.meta.url), 'utf8')) as WodLexicon;

function master(workouts: MasterWorkout[]): MasterDataset {
  return {
    schemaVersion: 'fitness-applied-wod-master-v1',
    generatedAt: '2026-10-03T00:00:00.000Z',
    sources: {},
    movements: lexicon.movements.map((m) => ({
      id: m.id, name: m.name, pattern: m.pattern, equipment: m.equipment, measure: m.measure, note: m.note ?? '', aliases: m.aliases,
      exercise: m.catalog ? { id: m.catalog, name: m.catalog, instructions: [`Do the ${m.name.toLowerCase()} well.`], primaryMuscles: [], secondaryMuscles: [], source: { name: 't', recordId: m.catalog, revision: '1', license: 'Unlicense', attribution: '' } } : null,
    })),
    workouts,
    review: { unrecognised: [], lowConfidence: [], untiedLoads: [], duplicates: [], dropped: [] },
  };
}

function workout(prescription: string, men = '', women = '', name = 'Test'): MasterWorkout {
  const p = parseWodDetailed(prescription, { lexicon, menSetting: men, womenSetting: women });
  return {
    id: 'wod-test', slug: 'test', name: p.name ?? name, named: !!p.name, format: p.format, score: p.score, timer: p.timer, trackingInputs: p.trackingInputs,
    ...(p.timeCapSeconds ? { timeCapSeconds: p.timeCapSeconds } : {}), ...(p.rounds ? { rounds: p.rounds } : {}), ...(p.repScheme ? { repScheme: p.repScheme } : {}),
    ...(p.sets ? { sets: p.sets } : {}), ...(p.intervalSeconds ? { intervalSeconds: p.intervalSeconds } : {}), ...(p.intervalCount ? { intervalCount: p.intervalCount } : {}),
    loads: p.loads, lines: p.lines, equipment: [], patterns: [], prescription, warnings: p.warnings, confidence: p.confidence, source: { name: 's', recordId: '1', revision: 'v1' },
  };
}

describe('workout generator', () => {
  it('app program: one exercise per line, with the clock, the inputs and the catalog instructions', () => {
    const w = workout('Complete as many rounds and reps as possible in 12 minutes of: 5 thrusters 10 pull-ups', '95 lb', '65 lb');
    const program = generateProgram(w, master([w]), 'attribution');
    expect(program).toMatchObject({ category: 'WOD', format: 'amrap', score: 'rounds_reps', headline: 'AMRAP 12 min', marketplace: { status: 'published', accessTier: 'free' } });
    const [thruster, pullUp] = program.sections[0].exercises;
    expect(thruster).toMatchObject({ exerciseId: 'Kettlebell_Thruster', name: 'Thruster', workoutType: 'amrap', workoutFormat: 'amrap', reps: '5', workDurationSeconds: 720, load: { men: '95 lb', women: '65 lb' } });
    expect(thruster.timer).toEqual({ mode: 'countdown', durationSeconds: 720 });
    expect(thruster.tracking.inputs).toEqual(expect.arrayContaining(['rounds', 'reps', 'weight']));
    expect(thruster.instructions).toMatch(/thruster/i);
    expect(pullUp).toMatchObject({ exerciseId: 'Pullups', reps: '10' });
  });

  it('rep-scheme workouts hand every line the scheme', () => {
    const w = workout('Fran 21-15-9 reps for time of: Thrusters Pull-ups', '95 lb', '65 lb');
    const program = generateProgram(w, master([w]), '');
    expect(program.sections[0].exercises.map((e) => e.reps)).toEqual(['21-15-9', '21-15-9']);
    expect(lineText(w.lines[0], w.repScheme)).toBe('21-15-9 reps Thruster (95 lb / 65 lb)');
  });

  it('site page: display text, cues and the same tools', () => {
    const w = workout('3 rounds for time of: 400-meter run 21 kettlebell swings 12 pull-ups', '24 kg', '16 kg');
    const page = generatePage(w, master([w]));
    expect(page).toMatchObject({ headline: '3 rounds for time', formatLabel: 'For time', scoreLabel: 'Your time', rounds: 3, timer: { mode: 'stopwatch' } });
    expect(page.lines.map((l) => l.text)).toEqual(['400 m Run', '21 reps Kettlebell swing (24 kg / 16 kg)', '12 reps Pull-up']);
    expect(page.lines[1]).toMatchObject({ movementId: 'kettlebell-swing', measure: 'reps', equipment: ['kettlebell'] });
    expect(page.lines[1].cue).toMatch(/swing/i);
  });

  it('headlines for each format', () => {
    expect(headline(workout('Every minute on the minute for 10 minutes: 3 power cleans'))).toBe('EMOM 10 × 1 min');
    expect(headline(workout('For total reps: Tabata push-ups'))).toBe('Tabata · 8 × (20 sec on / 10 sec off)');
    expect(headline(workout('Snatch 2-2-2-2-2 reps'))).toBe('2-2-2-2-2 reps');
    expect(headline(workout('Complete 1 complex every 2 minutes for a total of 6 sets for max load: 1 clean 1 jerk'))).toBe('Every 2 min × 6, for max load');
  });
});
