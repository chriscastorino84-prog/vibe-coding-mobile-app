# WOD compiler

Turns two datasets into one master dataset, and the master into what each
runtime reads. Run it once per data revision; commit the outputs.

```
wods.csv ─────────────┐
(Kaggle, 1,272 rows)  │   clean → parse (conversion engine) ─┐
                      ├─────────────────────────────────────┼─→ content/wods/wods-master.json
exercises.json ───────┘   clean → tie to lexicon movements ─┘        │
(free-exercise-db, 876)                                              ├─→ wods-app-export.json  (mobile app)
                                                                     ├─→ wods-site.json        (website)
movements.json  (the bridge: 131 CrossFit movements,                 └─→ wods-review.md        (what to check)
                 aliases, and the catalog exercise each maps to)
```

## Run

```
npm install
npx tsx compile.ts \
  --wods ../../data/wods.csv \
  --exercises ../../data/yuhonas-exercises.json \
  --out ../../content/wods \
  --license-approved --reviewer "Chris Castorino" --reviewed-at 2026-10-03
```

`--license-approved` is required: both sources need a redistribution review
before anything is published (Kaggle: ODbL database, CrossFit.com content;
free-exercise-db: Unlicense). The flag records who reviewed and when.

The data files are not committed. Get them with:

```
curl -L -o wods.zip https://www.kaggle.com/api/v1/datasets/download/uihyunk/crossfit-wods-2019-2025 && unzip wods.zip
curl -L -o yuhonas-exercises.json https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json
```

## What each step does

**Clean.** Straight quotes, one kind of dash, one space between words, blank
rows and non-workouts dropped ("Rest day", a featured article), exact
duplicates folded into the first copy (the review lists them).

**Parse.** `packages/fitness-applied-tools/src/wodConversionEngine.ts`
reads each workout's prose and fills the columns: format (for time, AMRAP,
EMOM, tabata, intervals, strength, max load, skill), the score (time, rounds
and reps, reps, load, distance), the clock the runtime needs (stopwatch,
countdown, interval with work/rest and a round count), the tracking inputs,
rounds, rep scheme, time cap, and one structured line per movement with its
count and unit (reps, metres, calories, seconds), its modifiers (strict,
alternating…) and the load from the men's/women's setting that applies to
it. Lines it cannot read stay in the record, flagged, never dropped.

**Correlate.** Each movement line is matched against `movements.json`, the
lexicon. Each lexicon entry names the free-exercise-db exercise it
corresponds to (`catalog`), so the master carries that exercise's
instructions and muscles on every recognised line. Movements with no
equivalent there (wall-ball, toes-to-bar, burpee…) carry the lexicon's
one-line cue instead; `wods-review.md` lists them.

**Generate.** `packages/fitness-applied-tools/src/workoutGenerator.ts`
arranges the columns for each runtime. `generateProgram` gives the mobile
app its content-program shape (one exercise per line, timer, tracking
inputs, reps text, catalog instructions, the fields the current
WorkoutScreen reads). `generatePage` gives the website a page record (the
same tools plus display text: "21-15-9 reps Thruster (95 lb / 65 lb)"). Both
come from one record, so the app and the site can never disagree about a
workout.

## Growing the lexicon

`wods-review.md` lists the text the engine could not match, most frequent
first. To teach it a movement, add an entry to `movements.json`:

```json
{ "id": "devils-press", "name": "Devil's press", "pattern": "weightlifting",
  "equipment": ["dumbbell"], "measure": "reps",
  "aliases": ["devils press", "devil press"],
  "catalog": null, "note": "A burpee on the dumbbells straight into a double dumbbell snatch." }
```

Aliases are lowercase and singular with hyphens as spaces; the matcher adds
plurals and prefixes. Longer aliases win, so "chest to bar pull up" is
matched before "pull up". `catalog` must be an id from the exercise file or
null. Re-run the compiler; the tests check every catalog reference resolves.

## Outputs

| File | For | Shape |
|---|---|---|
| `wods-master.json` | review, both runtimes | `MasterDataset` in `workoutGenerator.ts` |
| `wods-app-export.json` | mobile app content package | `workout-program-export-v2`: `GeneratedProgram[]` |
| `wods-site.json` | website WOD pages | `fitness-applied-wods-site-v1`: `WorkoutPage[]` + movements |
| `wods-review.md` | the owner | unrecognised text, low-confidence rows, untied loads, dropped rows |

`scripts/workout-program-import/export.ts` is the earlier, one-exercise-per-
workout exporter. It still works; this compiler supersedes it.
