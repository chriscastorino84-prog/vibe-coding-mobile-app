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
movements.json  (the bridge: 180 CrossFit movements,                 └─→ wods-review.md        (what to check)
                 1,100+ aliases, and the catalog exercise each maps to)
glossary.json   (the semantic lexicon: shorthand and slang for formats,
                 scores, structure, modifiers, loads, units, equipment)
muscles.json    (the muscles each movement works, and how the catalog's
                 muscle names map onto the Muscle Visualizer API)

wods-master.json ──→ visualize.ts ──→ content/wods/images/*.webp + manifest.json
                     (one muscle-map picture per distinct muscle set and body model)
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

`glossary.json`, `muscles.json`, `movements.json` and `exclusions.json` next to the
script are read by default (`--glossary`, `--muscles`, `--lexicon`, `--exclusions`
override them). `exclusions.json` lists workouts to leave out by stable id, so a
recompile keeps them out (today: the second IGNITE Workout).

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

**Read the shorthand.** Before parsing, `normaliseShorthand` rewrites
whiteboard shorthand into the long form the parser reads: `5 RFT` → 5 rounds
for time, `AMRAP 12` / `12 min AMRAP`, `EMOM 12` / `E2MOM 10` / `OTM`,
`odd:`/`even:` slots, `135#` → 135 lb, `1.5 pood` → 24 kg, `2×50/35 lb` →
double, `@ 80% of 1RM` → a load modifier, `NFT` → not for time, `TC 12`,
`Buy-in:` / `Cash-out:`, `Death by`, and CrossFit.com's ♀/♂ division lines
(pulled out as the women's and men's loads). `glossary.json` then supplies
the vocabulary the parser leans on: format phrases (chipper, ladder, death
by), score words, structure (partner, YGIG, you go I go, waterfall,
synchro), modifiers (strict, unbroken, touch-and-go, banded…), load words
(AHAP, RX, Rx+, bodyweight), units (pood, cal, DUs) and slang (T2B, C2B,
HSPU, KBS, BBJO, DL…). Movement abbreviations live with their movements in
`movements.json` as aliases. What the glossary recognises lands on the
record as `tags` (partner, ladder, rx, buy-in, cash-out), as note lines with
a `role` (buy-in, cash-out, then, interval-slot, structure, instruction),
or as line modifiers.

**Correlate.** Each movement line is matched against `movements.json`, the
lexicon. Each lexicon entry names the free-exercise-db exercise it
corresponds to (`catalog`), so the master carries that exercise's
instructions and muscles on every recognised line. Movements with no
equivalent there (wall-ball, toes-to-bar, burpee…) carry the lexicon's
one-line cue instead; `wods-review.md` lists them.

**Muscles.** `muscles.json` gives every movement a muscle set in the
catalog's vocabulary: from the free-exercise-db exercise when there is one
(primary → target, secondary → secondary), from the table's own `movements`
entry for CrossFit-only movements (burpee, wall-ball, toes-to-bar, run,
ski…). The compiler tallies the lines of each workout into one map
(`muscles`: targets ranked by how often they appear, then the rest) and a
`visual` record for the picture: `key` (a hash of the muscle set, so workouts
that work the same muscles share one picture), the muscles, and once the
pictures exist, `images` and the legend `colors`.

**Generate.** `packages/fitness-applied-tools/src/workoutGenerator.ts`
arranges the columns for each runtime. `generateProgram` gives the mobile
app its content-program shape (one exercise per line, timer, tracking
inputs, reps text, catalog instructions, the fields the current
WorkoutScreen reads). `generatePage` gives the website a page record (the
same tools plus display text: "21-15-9 reps Thruster (95 lb / 65 lb)"). Both
come from one record, so the app and the site can never disagree about a
workout.

## Muscle-map pictures (Muscle Visualizer API)

`visualize.ts` asks the [Muscle Visualizer API](https://github.com/ExerciseDB/muscle-visualizer-api)
(ExerciseDB / AscendAPI, served through RapidAPI) for one "workout
activation" picture per distinct muscle set and body model, in the brand
colours, and writes them next to a `manifest.json`. The next compile run with
`--images` puts the file names on each workout's `visual.images`; the app and
the website render the picture and the legend from that record, so neither
runtime calls the API and no key leaves this folder.

```
export MUSCLE_VISUALIZER_API_KEY=…        # your RapidAPI key; never commit it
npx tsx visualize.ts --master ../../content/wods/wods-master.json --out ../../content/wods/images --dry-run
npx tsx visualize.ts --master ../../content/wods/wods-master.json --out ../../content/wods/images [--limit 100]
npx tsx compile.ts … --images ../../content/wods/images
```

`--dry-run` lists the requests without spending quota. Pictures already on
disk are never fetched again and the script stops at the first 429, so a
small free plan can be worked through over several days with `--limit`. The
current dataset has 594 distinct muscle sets, so 1,188 pictures for both
body models (594 with `--gender male`). A smaller cap in `workoutMuscles`
(fewer target/secondary muscles per map) would mean fewer distinct sets.

The API's muscle names are not published; the script reads them from
`GET /api/v1/muscles` and picks, for each catalog muscle, the first candidate
in `muscles.json → catalog` the API knows. Names it cannot place are reported;
add candidates to the table. Pictures are the API's output and subject to
RapidAPI's and AscendAPI's terms — check them before publishing the images.

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
| `wods-review.md` | the owner | unrecognised text, low-confidence rows, untied loads, dropped rows, movements without muscles |
| `images/` | both runtimes | `<key>-<male|female>.webp` per muscle set + `manifest.json` (from `visualize.ts`) |

`scripts/workout-program-import/export.ts` is the earlier, one-exercise-per-
workout exporter. It still works; this compiler supersedes it.
