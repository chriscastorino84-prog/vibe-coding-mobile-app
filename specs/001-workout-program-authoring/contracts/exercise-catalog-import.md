# Exercise Catalog Import Contract

## Purpose

Define the boundary between external exercise datasets and the app-owned catalog. External sources populate the app catalog; the running app does not query them.

## Import input

Each import run is bound to one source and one immutable source revision. The importer accepts a batch of structured records with:

- Stable source record identifier and source record URL when available.
- Source display name and descriptive/instruction text.
- Optional equipment, category, movement pattern, muscle-group labels, aliases, and difficulty.
- Source repository, revision/date, license name, license URL, attribution/notice, and a completed rights-review state.
- No image fields or image binaries are imported.

The importer must fail closed for an unreviewed or disallowed license. Missing optional exercise metadata is retained as missing; it must not be invented.

## Normalized output

For each accepted record, create/update:

1. A canonical `Exercise` record or a pending review candidate.
2. An `ExerciseSource` provenance record linking the source identifier, source revision, license, and imported fields to the canonical exercise.
3. Zero or more `ExerciseAlias` records for reviewed alternate names.
4. `ExerciseDuplicateCandidate` records for uncertain matches.

The importer is repeatable: replaying the same source/revision must not create duplicate source records or exercises. A later source revision creates an auditable import batch. Importing records does not silently overwrite owner-edited canonical fields; changed fields are shown for review.

## Matching and review

- Normalize whitespace, punctuation, case, and common equipment labels to produce candidate matches.
- Compare available movement details (equipment, target muscles, category, and instruction text) to build match explanations.
- Do not merge solely because display names match or are similar.
- A reviewer must choose `same exercise`, `alias`, `distinct`, or `reject` for uncertain candidates.
- Equipment, unilateral/bilateral form, and materially different movement variants remain separate unless review establishes equivalence.
- Preserve stable app IDs after import; references in programs/workouts never change because source records were merged or corrected.

## Release gate

Catalog data may be released only when the batch's license review is approved, non-image fields pass schema validation, duplicate candidates are resolved or explicitly deferred, provenance is present, and the import summary is recorded. Provide a source notice in product documentation as a conservative attribution practice even where the license does not require it.
