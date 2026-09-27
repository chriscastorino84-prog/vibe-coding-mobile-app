# Quickstart Validation Guide

This guide defines end-to-end acceptance checks for the feature after implementation. It intentionally contains no application implementation code.

## Prerequisites

- Expo app dependencies installed from `apps/mobile/package.json`.
- A configured Supabase development project with the feature migrations applied.
- At least one authorized program-writer account and two separate program-user accounts.
- One approved, text-only exercise-source import batch with source/license provenance and duplicate-review results.
- Unit-test runner and Expo web/iOS/Android run targets configured by implementation.

## Run the app and feature checks

From the repository root:

```powershell
npm --prefix apps/mobile run web
```

Run the targeted automated test commands added during implementation for catalog import, program calculations, database authorization, and schedule/workout flows. Their exact names must be documented by the implementation tasks once the project test setup exists.

## Acceptance scenarios

1. **Catalog import and repeatability**
   - Import a source revision with valid rights metadata and no images.
   - Verify canonical exercise rows, source/license provenance, aliases, and pending duplicate candidates.
   - Replay the same source revision; verify no duplicate source records or exercises are created.
   - Verify an unapproved source or malformed record fails with an actionable error.
   - Verify likely variants are presented for review rather than merged solely by similar name.

2. **Program authoring and versioning**
   - As a writer, create a program setup using each of `%1RM`, `RPE`, `RIR`, and `STD`.
   - Generate the configured weeks and training days; edit individual rows and publish.
   - Publish an updated version; verify a prior enrollment still sees its original version and a new enrollment sees the latest.

3. **Discovery and strength-estimate behavior**
   - For each non-`STD` progression, confirm the first week has no prefilled load selection and captures load, reps, and programmed effort per set.
   - Confirm `%1RM` estimates do not use RPE/RIR and record the Lander method version and input set.
   - Confirm RPE/RIR conversion results identify their method and retain the user's actual effort.
   - Verify invalid zero/negative loads, invalid reps, and an invalid Lander denominator cannot yield a success-shaped estimate.
   - Verify the UI labels strength output as an estimate.

4. **Workout flags and personalized adjustment**
   - Complete a set with fewer reps than prescribed; verify maximum effort is recorded for the programmed scale and the exercise receives a negative flag when tonnage is below prescription.
   - Complete above prescription; verify a positive flag.
   - With RPE/RIR progressions, vary actual effort while keeping reps; verify effort differences flag with correct polarity.
   - With `%1RM`, vary effort only; verify no effort-only flag or weight calculation change.
   - Trigger the same exercise polarity for two consecutive workouts; verify only that user's future exercise prescriptions change, the source version does not, and repeat submission is idempotent.
   - Trigger the opposite polarity in a later qualifying pair; verify a subsequent upward/downward adjustment is possible.

5. **User access and privacy**
   - Sign in as user A and user B; verify each cannot query or mutate the other's training and measurement data.
   - Verify program user cannot publish a program or import catalog records.
   - Upload and retrieve a progress photo only through private authorized access; verify it is not publicly readable.
   - Delete user A's account; verify user A's workout, measurement, and photo records/objects are removed while shared catalog/program data and user B's records remain.

6. **Dashboard and measurements**
   - Verify projected and actual lines for the selected exercise use that exercise's data.
   - Record bodyweight and body-composition percentage with workouts and inspect both trends.
   - Verify empty history and missing baseline states are explicit, and point inspection shows only available comparisons.

## Expected result

All checks pass on the supported platforms. Import, access control, calculation, workout-save, and deletion checks must be automated where practical; any accepted research limitation or measurement error is documented in the UI and tests.
