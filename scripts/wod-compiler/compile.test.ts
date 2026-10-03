import { describe, expect, it } from 'vitest';
import { cleanProse, compile, parseCsv, validateMuscleTable, type MuscleTable } from './compile.js';
import { plannedImages, resolveMuscleNames, visualize, workoutImageUrl, type Fetcher } from './visualize.js';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { WodGlossary, WodLexicon } from '../../packages/fitness-applied-tools/src/wodConversionEngine.js';

const lexicon = JSON.parse(readFileSync(new URL('./movements.json', import.meta.url), 'utf8')) as WodLexicon;
const glossary = JSON.parse(readFileSync(new URL('./glossary.json', import.meta.url), 'utf8')) as WodGlossary;
const muscles = JSON.parse(readFileSync(new URL('./muscles.json', import.meta.url), 'utf8')) as MuscleTable;
const exercises = [
  { id: 'Barbell_Deadlift', name: ' Barbell  Deadlift ', instructions: ['Stand in front of the bar.', 'Lift it.'], primaryMuscles: ['hamstrings'], secondaryMuscles: ['lower back', 'glutes'], category: 'strength', equipment: 'barbell', level: 'intermediate' },
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

  it('reads the glossary and the muscle table: shorthand parses, tags land, muscles tally into one map per workout', () => {
    const shorthand = ['wod,men_setting,women_setting', '"Buy-in: 20 burpees Then 3 RFT: 10 DL 185/125# 400m run Cash-out: 50 DUs",,', '"Death by 10m shuttle runs",,'].join('\n');
    const { master, appExport, site } = compile({ wodsCsv: shorthand, exercises, lexicon, glossary, muscles, license, now: '2026-10-03T00:00:00.000Z' });
    expect(master.workouts[0]).toMatchObject({ format: 'for_time', rounds: 3, tags: ['buy-in', 'cash-out'] });
    expect(master.workouts[0].lines.filter((l) => l.kind === 'movement').map((l) => l.movementId)).toEqual(['burpee', 'deadlift', 'run', 'double-under']);
    expect(master.workouts[0].lines.find((l) => l.movementId === 'deadlift')?.load).toEqual({ men: '185 lb', women: '125 lb' });
    expect(master.workouts[1]).toMatchObject({ format: 'death_by', score: 'rounds_reps', tags: ['ladder'] });
    // deadlift from the catalog, burpee/run/double-under from muscles.json
    expect(master.movements.find((m) => m.id === 'deadlift')?.muscles).toEqual({ target: ['hamstrings'], secondary: ['lower back', 'glutes'] });
    expect(master.movements.find((m) => m.id === 'burpee')?.muscles.target).toEqual(['chest', 'quadriceps']);
    const w = master.workouts[0];
    expect(w.muscles.target).toContain('hamstrings');
    expect(w.muscles.target).toContain('chest');
    expect(w.visual).toMatchObject({ provider: 'exercisedb-muscle-visualizer', target: w.muscles.target, secondary: w.muscles.secondary });
    expect(w.visual?.key).toMatch(/^[0-9a-f]{8}$/);
    expect(w.visual?.images).toBeUndefined();
    expect(appExport.programs[0]).toMatchObject({ tags: ['buy-in', 'cash-out'], muscles: w.muscles, visual: w.visual });
    expect(appExport.programs[0].sections[0].exercises[0]).toMatchObject({ kind: 'note', role: 'buy-in' });
    expect(appExport.programs[1].sections[0].exercises[0].workoutType).toBe('timed_sets');
    expect(site.workouts[0]).toMatchObject({ visual: w.visual, tags: ['buy-in', 'cash-out'] });
    expect(site.workouts[1].formatLabel).toBe('Death by');
    expect(master.sources.glossary?.count).toBeGreaterThan(50);
    expect(master.review.muscleSets).toBe(2);
    // the picture manifest puts file names on the workouts
    const withImages = compile({ wodsCsv: shorthand, exercises, lexicon, glossary, muscles, license, images: { provider: 'exercisedb-muscle-visualizer', generatedAt: 'x', colors: { target: '#C9A86A', secondary: '#8DA2B9' }, images: { [w.visual!.key]: { male: `${w.visual!.key}-male.webp`, target: [], secondary: [] } } } });
    expect(withImages.master.workouts[0].visual?.images).toEqual({ male: `${w.visual!.key}-male.webp` });
    expect(withImages.master.workouts[0].visual?.colors).toEqual({ target: '#C9A86A', secondary: '#8DA2B9' });
    expect(withImages.master.review.pictured).toBe(1);
  });

  it('validates the muscle table against the lexicon and the catalog vocabulary', () => {
    expect(validateMuscleTable(muscles, lexicon, new Set(['hamstrings', 'lower back', 'glutes']))).toEqual([]);
    expect(validateMuscleTable({ ...muscles, movements: { ...muscles.movements, nope: { target: ['wings'], secondary: [] } } }, lexicon, new Set(['tail']))).toEqual([
      'catalog muscle "tail" has no visualizer names in muscles.json',
      'muscles.json names movement "nope", which is not in the lexicon',
      'movement "nope" uses muscle "wings", which is not a catalog muscle',
    ]);
    expect(() => compile({ wodsCsv: csv, exercises, lexicon, muscles: { ...muscles, catalog: { biceps: ['BICEPS'] } }, license })).toThrow(/has no visualizer names/);
  });

  it('plans and fetches one picture per muscle set and body model, resumes, and stops on 429', async () => {
    const { master } = compile({ wodsCsv: csv, exercises, lexicon, glossary, muscles, license });
    const { map, unknown } = resolveMuscleNames(muscles, ['BICEPS', 'HAMSTRINGS', 'LOWER_BACK', 'GLUTES', 'CHEST', 'QUADS', 'SHOULDERS', 'TRICEPS', 'ABS', 'CALVES']);
    expect(map.quadriceps).toBe('QUADS');
    expect(map['lower back']).toBe('LOWER_BACK');
    expect(unknown).toContain('lats');
    const planned = plannedImages(master, map, { gender: ['male', 'female'], size: 'medium', format: 'webp', dryRun: true });
    expect(planned.length).toBe(master.review.muscleSets * 2);
    expect(planned[0].file).toBe(`${planned[0].key}-male.webp`);
    const url = new URL(workoutImageUrl(['HAMSTRINGS'], ['GLUTES'], 'female', { size: 'large', format: 'png' }));
    expect(url.pathname).toBe('/api/v1/visualize/workout');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ targetMuscles: 'HAMSTRINGS', secondaryMuscles: 'GLUTES', gender: 'female', size: 'large', format: 'png' });

    const dir = mkdtempSync(join(tmpdir(), 'wod-images-'));
    const calls: string[] = [];
    let quota = 3;
    const fetcher: Fetcher = async (u) => {
      calls.push(u);
      if (u.endsWith('/api/v1/muscles')) return { status: 200, ok: true, json: async () => ({ success: true, data: ['HAMSTRINGS', 'LOWER_BACK', 'GLUTES', 'CHEST', 'QUADS', 'SHOULDERS', 'TRICEPS', 'ABS', 'CALVES', 'LATS', 'BICEPS', 'FOREARMS', 'TRAPS'] }), arrayBuffer: async () => new ArrayBuffer(0), text: async () => '' };
      quota -= 1;
      if (quota < 0) return { status: 429, ok: false, json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0), text: async () => 'quota' };
      return { status: 200, ok: true, json: async () => ({}), arrayBuffer: async () => new TextEncoder().encode('img').buffer as ArrayBuffer, text: async () => '' };
    };
    const first = await visualize(master, muscles, dir, { gender: ['male', 'female'], size: 'medium', format: 'webp', dryRun: false }, 'test-key', fetcher);
    expect(first.fetched).toBe(3);
    expect(first.remaining).toBe(planned.length - 3);
    expect(existsSync(join(dir, planned[0].file))).toBe(true);
    expect(existsSync(join(dir, 'manifest.json'))).toBe(true);
    expect(calls[0]).toMatch(/\/api\/v1\/muscles$/);
    // second run: finished pictures are skipped, the rest fetched
    quota = 100;
    const second = await visualize(master, muscles, dir, { gender: ['male', 'female'], size: 'medium', format: 'webp', dryRun: false }, 'test-key', fetcher);
    expect(second.skipped).toBe(3);
    expect(second.fetched).toBe(planned.length - 3);
    expect(second.remaining).toBe(0);
    expect(Object.keys(second.manifest.images)).toHaveLength(master.review.muscleSets);
    const key = planned[0].key;
    expect(second.manifest.images[key]).toMatchObject({ male: `${key}-male.webp`, female: `${key}-female.webp` });
    // and the compiler picks the manifest up
    const again = compile({ wodsCsv: csv, exercises, lexicon, glossary, muscles, license, images: second.manifest });
    expect(again.master.review.pictured).toBe(again.master.workouts.filter((w) => w.visual).length);
  });

  it('refuses a lexicon entry that points at a missing exercise', () => {
    const broken: WodLexicon = { movements: [{ ...lexicon.movements[0], catalog: 'Nope' }] };
    expect(() => compile({ wodsCsv: csv, exercises, lexicon: broken, license })).toThrow(/not in the exercise file/);
  });
});
