import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { cleanProse, compile, parseCsv } from './compile.js';
import type { WodLexicon } from '../../packages/fitness-applied-tools/src/wodConversionEngine.js';

const lexicon = JSON.parse(readFileSync(new URL('./movements.json', import.meta.url), 'utf8')) as WodLexicon;
const exercises = [
  { id: 'Barbell_Deadlift', name: ' Barbell  Deadlift ', instructions: ['Stand in front of the bar.', 'Lift it.'], primaryMuscles: ['hamstrings'], category: 'strength', equipment: 'barbell', level: 'intermediate' },
  ...lexicon.movements.filter((m) => m.catalog && m.catalog !== 'Barbell_Deadlift').map((m) => ({ id: m.catalog as string, name: m.catalog as string, instructions: ['Do it.'] })),
];
const license = { approved: true, reviewer: 'Chris', reviewedAt: '2026-10-03' };
const csv = [
  'wod,men_setting,women_setting',
  '"Diane 21-15-9 reps for time of: Deadlifts Handstand push-ups",225 lb,155 lb',
  '"Complete as many rounds as possible in 10 minutes of: 10 burpees 20 wall-ball shots","20-lb. ball to 10-ft. target","14-lb. ball to 9-ft. target"',
  '"Diane 21-15-9 reps for time of: Deadlifts Handstand push-ups",225 lb,155 lb',
  'Rest day,,',
  '"Featured Article: Something about coaching",,',
].join('\n');

describe('WOD compiler', () => {
  it('cleans prose and reads CSV with quoted commas', () => {
    expect(cleanProse('  It’s “21-15-9”  –  go ')).toBe('It\'s "21-15-9" - go');
    expect(parseCsv('a,b\n"x, y",2')).toEqual([{ a: 'x, y', b: '2' }]);
  });

  it('builds the master dataset: cleaned exercises, movements tied to them, workouts parsed, non-workouts dropped, duplicates folded', () => {
    const { master, appExport, site, review } = compile({ wodsCsv: csv, exercises, lexicon, license, now: '2026-10-03T00:00:00.000Z' });
    expect(master.workouts).toHaveLength(2);
    expect(master.review.duplicates).toEqual([{ kept: master.workouts[0].id, dropped: ['row 4'] }]);
    expect(master.review.dropped.map((d) => d.row)).toEqual([5, 6]);
    const deadlift = master.movements.find((m) => m.id === 'deadlift');
    expect(deadlift?.exercise).toMatchObject({ id: 'Barbell_Deadlift', name: 'Barbell Deadlift', instructions: ['Stand in front of the bar.', 'Lift it.'], primaryMuscles: ['hamstrings'] });
    expect(master.movements.find((m) => m.id === 'wall-ball')?.exercise).toBeNull();
    const diane = master.workouts[0];
    expect(diane).toMatchObject({ name: 'Diane', slug: 'diane', named: true, format: 'for_time', repScheme: [21, 15, 9], equipment: ['barbell', 'wall'], patterns: ['gymnastics', 'weightlifting'] });
    expect(master.workouts[1]).toMatchObject({ name: 'WOD 0001', named: false, format: 'amrap' });
    expect(master.workouts[1].lines[1].load).toEqual({ men: '20-lb. ball to 10-ft. target', women: '14-lb. ball to 9-ft. target' });
    expect(appExport.programs[0].sections[0].exercises[0]).toMatchObject({ exerciseId: 'Barbell_Deadlift', instructions: 'Stand in front of the bar. Lift it.' });
    expect(site.workouts[0].lines[0].text).toBe('21-15-9 reps Deadlift (225 lb / 155 lb)');
    expect(review).toMatch(/Workouts: 2/);
  });

  it('fails closed without the license review', () => {
    expect(() => compile({ wodsCsv: csv, exercises, lexicon, license: { approved: false } })).toThrow(/license review approval/);
  });

  it('refuses a lexicon entry that points at a missing exercise', () => {
    const broken: WodLexicon = { movements: [{ ...lexicon.movements[0], catalog: 'Nope' }] };
    expect(() => compile({ wodsCsv: csv, exercises, lexicon: broken, license })).toThrow(/not in the exercise file/);
  });
});
