import { describe, expect, it } from 'vitest';

import { parseWod } from './wodConversionEngine';

describe('WOD conversion engine', () => {
  it('extracts AMRAP time cap, rounds, movements, and tracking columns', () => {
    expect(parseWod('AMRAP 12 minutes: 5 pull-ups, 10 push-ups')).toMatchObject({
      workoutType: 'amrap',
      timeCapSeconds: 720,
      trackingInputs: ['reps', 'rounds'],
    });
  });

  it('extracts timed-set and interval columns', () => {
    expect(parseWod('Tabata: 20 seconds work, 10 seconds rest x 8')).toMatchObject({
      workoutType: 'timed_sets',
      workDurationSeconds: 20,
      restSeconds: 10,
      sets: 8,
    });
  });

  it('splits compact set-by-rep prescriptions into separate columns', () => {
    expect(parseWod('Back squat 5x3')).toMatchObject({ workoutType: 'standard', sets: 5, reps: 3 });
  });
});

import { readFileSync } from 'node:fs';
import { parseWodDetailed, type WodLexicon } from './wodConversionEngine';

const lexicon = JSON.parse(readFileSync(new URL('../../../scripts/wod-compiler/movements.json', import.meta.url), 'utf8')) as WodLexicon;

describe('WOD conversion engine, detailed', () => {
  it('reads a named rep-scheme workout: name, scheme, movements, and the load on the barbell line only', () => {
    const p = parseWodDetailed('Diane 21-15-9 reps for time of: Deadlifts Handstand push-ups', { lexicon, menSetting: '225 lb', womenSetting: '155 lb' });
    expect(p).toMatchObject({ name: 'Diane', format: 'for_time', score: 'time', repScheme: [21, 15, 9], confidence: 'high' });
    expect(p.timer).toEqual({ mode: 'stopwatch' });
    expect(p.lines.map((l) => l.movementId)).toEqual(['deadlift', 'handstand-push-up']);
    expect(p.lines[0].load).toEqual({ men: '225 lb', women: '155 lb' });
    expect(p.lines[1].load).toBeUndefined();
  });

  it('reads counts with units: metres, calories, miles, and a men/women split', () => {
    const p = parseWodDetailed('Hoover 8 rounds for time of: 400-meter run 15 burpee box jump-overs 10-calorie bike 6 alternating dumbbell snatches 15/20-calorie row Run 1 mile', {
      lexicon, menSetting: '24-inch box and 75-lb dumbbell', womenSetting: '20-inch box and 50-lb dumbbell',
    });
    expect(p).toMatchObject({ name: 'Hoover', rounds: 8, format: 'for_time' });
    const q = p.lines.map((l) => [l.movementId, l.quantity?.value, l.quantity?.alt, l.quantity?.measure]);
    expect(q).toEqual([
      ['run', 400, undefined, 'distance'],
      ['burpee-box-jump-over', 15, undefined, 'reps'],
      ['bike', 10, undefined, 'calories'],
      ['dumbbell-snatch', 6, undefined, 'reps'],
      ['row', 15, 20, 'calories'],
      ['run', 1, undefined, 'distance'],
    ]);
    expect(p.lines[1].load).toEqual({ men: '24-inch box', women: '20-inch box' });
    expect(p.lines[3].load).toEqual({ men: '75-lb dumbbell', women: '50-lb dumbbell' });
    expect(p.lines[3].modifiers).toContain('alternating');
  });

  it('AMRAP: countdown of the cap, rounds and reps tracked', () => {
    const p = parseWodDetailed('Complete as many rounds and reps as possible in 15 minutes of: 5 thrusters 10 toes-to-bars 15 burpees', { lexicon, menSetting: '165 lb', womenSetting: '115 lb' });
    expect(p).toMatchObject({ format: 'amrap', score: 'rounds_reps', timeCapSeconds: 900, timer: { mode: 'countdown', durationSeconds: 900 } });
    expect(p.trackingInputs).toEqual(expect.arrayContaining(['rounds', 'reps']));
  });

  it('strength: each lift keeps its own rep scheme and the score is load', () => {
    const p = parseWodDetailed('Overhead squat 5-5-5 reps Snatch balance 3-3-3 reps Hang squat snatch 1-1-1 reps', { lexicon });
    expect(p).toMatchObject({ format: 'strength', score: 'load', sets: 3 });
    expect(p.lines.map((l) => [l.movementId, l.repScheme])).toEqual([['overhead-squat', [5, 5, 5]], ['snatch-balance', [3, 3, 3]], ['hang-snatch', [1, 1, 1]]]);
  });

  it('EMOM and complexes: interval clock with a round count', () => {
    const complex = parseWodDetailed('Complete 1 complex every 3 minutes for a total of 7 sets for max load: 1 power clean 1 hang squat clean 1 shoulder-to-overhead', { lexicon });
    expect(complex).toMatchObject({ format: 'max_load', score: 'load', intervalSeconds: 180, intervalCount: 7, timer: { mode: 'interval', intervalSeconds: 180, rounds: 7 } });
    const emom = parseWodDetailed('Every minute on the minute for 12 minutes: 5 pull-ups 10 push-ups', { lexicon });
    expect(emom).toMatchObject({ format: 'emom', intervalSeconds: 60, intervalCount: 12 });
  });

  it('tabata: 8 × 20/10 on the clock, total reps as the score, no fake count on the lines', () => {
    const p = parseWodDetailed('For total reps: Tabata pull-ups Tabata box jump-overs Tabata push-ups', { lexicon });
    expect(p).toMatchObject({ format: 'tabata', score: 'reps', timer: { mode: 'interval', workSeconds: 20, restSeconds: 10, rounds: 8 } });
    expect(p.lines.every((l) => l.quantity === undefined)).toBe(true);
  });

  it('rest lines carry their seconds; instructions that name a movement become notes', () => {
    const p = parseWodDetailed('For time: Run 1,600 meters Rest 3 minutes Run 800 meters Partition the pull-ups as needed', { lexicon });
    expect(p.lines.map((l) => [l.kind, l.quantity?.value])).toEqual([['movement', 1600], ['rest', 180], ['movement', 800], ['note', undefined]]);
  });

  it('unrecognised movements are kept and flagged, never dropped', () => {
    const p = parseWodDetailed('3 rounds for time of: 10 flibber flops 20 push-ups', { lexicon });
    expect(p.confidence).toBe('medium');
    expect(p.lines[0]).toMatchObject({ kind: 'movement', recognised: false, name: 'flibber flops', quantity: { value: 10 } });
    expect(p.warnings.join(' ')).toMatch(/flibber flops/);
  });

  it('skill work is one line on a countdown', () => {
    const p = parseWodDetailed('Practice handstand walks for 20 minutes', { lexicon });
    expect(p).toMatchObject({ format: 'skill', score: 'none', timer: { mode: 'countdown', durationSeconds: 1200 } });
    expect(p.lines).toHaveLength(1);
  });

  it('inline loads in the prose attach to their line', () => {
    const p = parseWodDetailed('5 rounds for time of: 10 thrusters, 95 lb 10 pull-ups', { lexicon });
    expect(p.lines[0].load).toEqual({ men: '95 lb' });
    expect(p.lines[0].movementId).toBe('thruster');
    expect(p.lines[1].load).toBeUndefined();
  });
});
