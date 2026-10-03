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

import { normaliseShorthand, type WodGlossary } from './wodConversionEngine';

const glossary = JSON.parse(readFileSync(new URL('../../../scripts/wod-compiler/glossary.json', import.meta.url), 'utf8')) as WodGlossary;
const parse = (text: string) => parseWodDetailed(text, { lexicon, glossary });
const ids = (p: ReturnType<typeof parse>) => p.lines.filter((l) => l.kind === 'movement').map((l) => l.movementId);

describe('WOD conversion engine, box shorthand and the glossary', () => {
  it('expands whiteboard shorthand into the long form', () => {
    expect(normaliseShorthand('5 RFT: 10 T2B 15 KBS 53/35# 400m run').text).toBe('5 rounds for time of: 10 T2B 15 KBS 53/35 lb 400m run');
    expect(normaliseShorthand('AMRAP 12: 5 C2B').text).toBe('AMRAP in 12 minutes of: 5 C2B');
    expect(normaliseShorthand('12 min AMRAP 5 C2B').text).toBe('AMRAP in 12 minutes of: 5 C2B');
    expect(normaliseShorthand('E2MOM 10: 3 power cleans').text).toBe('every 2 minutes for 20 minutes: 3 power cleans');
    expect(normaliseShorthand('EMOM 12 odd: 15 cal row even: 12 burpees').text).toBe('every minute on the minute for 12 minutes: Odd minutes: 15 cal row Even minutes: 12 burpees');
    expect(normaliseShorthand('21 KB swings (1.5 pood)').text).toBe('21 KB swings (1.5 pood (24 kg))');
    expect(normaliseShorthand('10 DB thrusters 2x50/35 lb').text).toBe('10 DB thrusters double, 50/35 lb');
    expect(normaliseShorthand('Back squat 5x5 @ 80% of 1RM').text).toBe('Back squat 5x5 (80% of 1RM)');
    expect(normaliseShorthand('NFT: 3 sets of 10 GHD sit-ups').text).toBe('not for time: 3 sets of 10 GHD sit-ups');
    expect(normaliseShorthand('Buy in: 20 burpees TC 12').text).toBe('Buy-in: 20 burpees time cap: 12 minutes');
  });

  it('pulls CrossFit.com division lines out as the men\'s and women\'s settings', () => {
    const n = normaliseShorthand('3 rounds for time of: 10 deadlifts ♀ 155-lb (70-kg) barbell ♂ 225-lb (102-kg) barbell Post time to comments.');
    expect(n.women).toBe('155-lb barbell');
    expect(n.men).toBe('225-lb barbell');
    expect(n.text).toBe('3 rounds for time of: 10 deadlifts Post time to comments.');
  });

  it('reads abbreviations through the lexicon aliases', () => {
    const p = parse('5 RFT: 10 T2B 15 KBS 53/35# 400m run');
    expect(p).toMatchObject({ format: 'for_time', rounds: 5, score: 'time', confidence: 'high' });
    expect(ids(p)).toEqual(['toes-to-bar', 'kettlebell-swing', 'run']);
    expect(p.lines[1].load).toEqual({ men: '53 lb', women: '35 lb' });
    expect(p.lines[2].quantity).toEqual({ value: 400, measure: 'distance', unit: 'm' });
    expect(ids(parse('AMRAP 12: 5 C2B 10 HSPU 15 DL 185/125'))).toEqual(['chest-to-bar-pull-up', 'handstand-push-up', 'deadlift']);
  });

  it('knows death by, buy-in and cash-out, EMOM slots and not-for-time work', () => {
    const death = parse('Death by 10m shuttle runs');
    expect(death).toMatchObject({ format: 'death_by', score: 'rounds_reps', timer: { mode: 'interval', intervalSeconds: 60, rounds: 30 }, tags: ['ladder'] });
    expect(death.lines[0].modifiers).toContain('add one rep each minute');

    const bookends = parse('Buy-in: 20 burpees Then 3 RFT: 10 DB thrusters 2x50/35 lb 10 BBJO 24/20" Cash-out: 100 DUs');
    expect(bookends).toMatchObject({ format: 'for_time', rounds: 3, tags: ['buy-in', 'cash-out'] });
    expect(bookends.lines.map((l) => l.role ?? l.movementId)).toEqual(['buy-in', 'burpee', 'then', 'dumbbell-thruster', 'burpee-box-jump-over', 'cash-out', 'double-under']);
    expect(bookends.lines[3].load).toEqual({ men: '50 lb', women: '35 lb' });

    const emom = parse('EMOM 12 odd: 15 cal row even: 12 burpees');
    expect(emom).toMatchObject({ format: 'emom', intervalCount: 12, timeCapSeconds: 720 });
    expect(emom.lines.map((l) => l.role ?? l.movementId)).toEqual(['interval-slot', 'row', 'interval-slot', 'burpee']);
    expect(emom.lines[1].quantity).toMatchObject({ value: 15, measure: 'calories' });

    const nft = parse('Not for time: 3 sets of 10 GHD sit-ups 10 hip extensions 10 banded face pulls');
    expect(nft).toMatchObject({ format: 'skill', score: 'none', rounds: 3 });
    expect(nft.name).toBeUndefined();
    expect(ids(nft)).toEqual(['ghd-sit-up', 'hip-extension', 'face-pull']);
    expect(nft.lines.find((l) => l.movementId === 'face-pull')?.modifiers).toEqual(['banded']);
  });

  it('keeps percentages, footnotes and time caps off the movement lines', () => {
    const squat = parse('Back squat 5x5 @ 80% of 1RM Rest 2 minutes between sets');
    expect(squat).toMatchObject({ format: 'strength', score: 'load' });
    expect(squat.lines[0]).toMatchObject({ movementId: 'back-squat', modifiers: ['80% of 1RM'] });
    expect(squat.lines[1]).toMatchObject({ kind: 'rest', quantity: { value: 120 } });

    const open = parse('Complete as many rounds and reps as possible in 15 minutes of: 3 lateral burpees over the dumbbell 3 dumbbell hang clean-to-overheads 30-foot walking lunge (2 x 15 feet) *After completing each round, add 3 reps to the burpees and hang clean-to-overheads. ♀ 35-lb (15-kg) dumbbell ♂ 50-lb (22.5-kg) dumbbell Post time or reps completed to comments.');
    expect(open).toMatchObject({ format: 'amrap', timeCapSeconds: 900, confidence: 'high' });
    expect(ids(open)).toEqual(['burpee-over-dumbbell', 'dumbbell-clean-and-jerk', 'lunge']);
    expect(open.lines[0].load).toEqual({ men: '50-lb dumbbell', women: '35-lb dumbbell' });
    expect(open.lines[2].quantity).toMatchObject({ value: 30, unit: 'ft' });
    expect(open.lines[3]).toMatchObject({ kind: 'note', role: 'instruction', name: 'After completing each round, add 3 reps to the burpees and hang clean-to-overheads' });

    const capped = parse('For time: 21 pull-ups 42 double-unders 21 thrusters (weight 1) 15 bar muscle-ups 30 double-unders 15 thrusters (weight 3) Time cap: 12 minutes');
    expect(capped.timeCapSeconds).toBe(720);
    expect(capped.lines.at(-1)).toMatchObject({ movementId: 'thruster', modifiers: ['weight 3'] });
    expect(capped.lines.filter((l) => l.kind === 'note')).toEqual([]);
  });

  it('shares a rep ladder across the lines and tags partner work', () => {
    const p = parse('With a partner, YGIG: 100-90-80-70-60-50-40-30-20-10 Cal ski erg Burpees Alternate 10 reps at a time until done');
    expect(p).toMatchObject({ format: 'for_time', repScheme: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10] });
    expect(p.tags).toEqual(expect.arrayContaining(['ladder', 'partner']));
    expect(ids(p)).toEqual(['ski', 'burpee']);
    expect(p.lines[0]).toMatchObject({ kind: 'note', role: 'structure', name: 'With a partner, YGIG' });
    expect(p.lines[1].modifiers).toEqual(['calories']);
    expect(p.lines[1].repScheme).toBeUndefined();
    expect(p.warnings.some((w) => w.startsWith('Partner'))).toBe(true);
  });
});
