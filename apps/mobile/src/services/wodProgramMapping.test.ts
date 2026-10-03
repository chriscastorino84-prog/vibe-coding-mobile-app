import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { ContentPackage } from '@fitness-applied/contracts';

import { mapContentPackageToPrograms } from './fitnessAppliedProgramMapping';

/*
  Contract: every workout the WOD compiler produces (content/wods/
  wods-app-export.json) maps into the app's Program model with the tools the
  runtime needs still attached: the clock, the tracking inputs, the reps, the
  catalog instructions. If this fails, the generator and the app disagree.
*/
type AppExport = { schemaVersion: string; programs: Array<Record<string, unknown>> };
const appExport = JSON.parse(readFileSync(new URL('../../../../content/wods/wods-app-export.json', import.meta.url), 'utf8')) as AppExport;

function packageOf(programs: unknown[]): ContentPackage {
  return {
    packageId: 'wods', schemaVersion: '1', contentVersion: '1', locale: 'en-US', publishedAt: '2026-10-03T00:00:00.000Z',
    contentHash: 'a'.repeat(64), minClientVersion: '1.0.0', status: 'published',
    programs: programs as ContentPackage['programs'], calculators: [], recipes: [], shoppingListTemplates: [], trophyDefinitions: [], analyticsDefinitions: [],
  };
}

describe('WOD programs map into the app with their tools', () => {
  const bySlug = (slug: string) => appExport.programs.find((p) => p.slug === slug) as Record<string, unknown>;

  it('every compiled workout maps to a program with at least one exercise', () => {
    const programs = mapContentPackageToPrograms(packageOf(appExport.programs), []);
    expect(programs).toHaveLength(appExport.programs.length);
    const empty = programs.filter((p) => !p.sections?.length || !p.sections[0].exercises.length);
    expect(empty.map((p) => p.id)).toEqual([]);
  });

  it('a rep-scheme workout: stopwatch, time scored, reps on every line, instructions from the catalog', () => {
    const [diane] = mapContentPackageToPrograms(packageOf([bySlug('diane')]), []);
    expect(diane).toMatchObject({ category: 'WOD', marketplaceStatus: 'published', accessTier: 'free' });
    const [deadlift, hspu] = diane.sections![0].exercises;
    expect(deadlift).toMatchObject({ id: 'Barbell_Deadlift', name: 'Deadlift', reps: '21-15-9', workoutType: 'standard', timer: { mode: 'stopwatch' } });
    expect(deadlift.tracking?.inputs).toEqual(expect.arrayContaining(['seconds', 'weight']));
    expect(deadlift.instructions).toMatch(/barbell/i);
    expect(deadlift.description).toBe('Men: 225 lb · Women: 155 lb');
    expect(hspu).toMatchObject({ id: 'Handstand_Push-Ups', reps: '21-15-9' });
  });

  it('an AMRAP: countdown of the cap drives the existing runtime (workDurationSeconds), rounds and reps tracked', () => {
    const amrap = appExport.programs.find((p) => p.format === 'amrap' && (p.timeCapSeconds as number) > 0)!;
    const [program] = mapContentPackageToPrograms(packageOf([amrap]), []);
    const first = program.sections![0].exercises[0];
    expect(first.workoutType).toBe('amrap');
    expect(first.workDurationSeconds).toBe(amrap.timeCapSeconds);
    expect(first.timer).toMatchObject({ mode: 'countdown', durationSeconds: amrap.timeCapSeconds });
    expect(first.tracking?.inputs).toEqual(expect.arrayContaining(['rounds', 'reps']));
  });

  it('tabata and EMOM: interval clock with work/rest or interval seconds', () => {
    const tabata = appExport.programs.find((p) => p.format === 'tabata')!;
    const [t] = mapContentPackageToPrograms(packageOf([tabata]), []);
    expect(t.sections![0].exercises[0]).toMatchObject({ workoutType: 'timed_sets', workDurationSeconds: 20, restSeconds: 10, timer: { mode: 'interval', workDurationSeconds: 20, restSeconds: 10, rounds: 8 } });
    const emom = appExport.programs.find((p) => p.format === 'emom' && p.intervalSeconds === 60)!;
    const [e] = mapContentPackageToPrograms(packageOf([emom]), []);
    expect(e.sections![0].exercises[0]).toMatchObject({ workoutType: 'timed_sets', intervalSeconds: 60, timer: { mode: 'interval', intervalSeconds: 60 } });
  });

  it('strength: load scored, sets from the rep scheme, no clock', () => {
    const strength = appExport.programs.find((p) => p.format === 'strength')!;
    const [s] = mapContentPackageToPrograms(packageOf([strength]), []);
    const lift = s.sections![0].exercises[0];
    expect(lift.timer).toEqual({ mode: 'none' });
    expect(lift.tracking?.inputs).toEqual(expect.arrayContaining(['weight', 'reps']));
    expect(typeof lift.sets === 'number' || typeof lift.reps === 'string').toBe(true);
  });
});
