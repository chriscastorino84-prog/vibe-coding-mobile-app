# Tasks: Reusable Workout Program Authoring

**Input**: Design documents from `specs/001-workout-program-authoring/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Organization**: Tasks are grouped by user story. Each story can be implemented and validated as an increment after shared infrastructure is complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can be performed in parallel with other marked tasks after its dependencies are complete.
- **[Story]**: User story label maps to `spec.md`.
- Every task includes the exact primary file path(s) to create or update.

## Phase 1: Setup

**Purpose**: Establish the feature's app-side test and backend migration layout.

- [ ] T001 Add a TypeScript unit-test runner, test scripts, and `apps/mobile/src/__tests__/` conventions in `apps/mobile/package.json` and `apps/mobile/vitest.config.ts`.
- [ ] T002 Initialize Supabase local project configuration and migration/seed directories in `supabase/config.toml`, `supabase/migrations/`, and `supabase/seed/README.md`.
- [ ] T003 [P] Add ignored local Supabase and app environment files, plus documented variable names and safe local setup, in `.gitignore`, `apps/mobile/.env.example`, and `apps/mobile/README.md`.
- [ ] T004 [P] Create catalog import tool entrypoint, dependency manifest, and operator instructions in `scripts/exercise-catalog/import.ts`, `scripts/exercise-catalog/package.json`, and `scripts/exercise-catalog/README.md`.

## Phase 2: Foundational

**Purpose**: Shared database, authentication, authorization, client access, and domain primitives. These block all user stories.

- [ ] T005 Create foundational user-profile/staff-role, exercise-catalog, source-provenance, alias, import-batch, and duplicate-candidate schema with the data-model constraints and uniqueness rules from `data-model.md` in `supabase/migrations/0001_catalog_and_roles.sql`.
- [ ] T006 Add least-privilege RLS policies for catalog reads, staff-only catalog/import changes, and private user-owned rows; add policy tests in `supabase/migrations/0002_catalog_and_user_rls.sql` and `apps/mobile/src/__tests__/database/catalog-rls.test.ts`.
- [ ] T007 [P] Configure a typed Supabase client that requires the public project URL and anon/publishable key and reports missing configuration explicitly in `apps/mobile/src/services/supabase.ts` and `apps/mobile/src/services/supabase.test.ts`.
- [ ] T008 [P] Define normalized domain types and database row mappings for exercises, programs, enrollments, workouts, measurements, and photos in `apps/mobile/src/domain/types.ts`.
- [ ] T009 Implement shared repository error mapping and explicit retry-safe result types for database and storage operations in `apps/mobile/src/services/repositoryResult.ts` and `apps/mobile/src/services/repositoryResult.test.ts`.
- [ ] T010 Add local-vs-cloud persistence boundary and preserve current AsyncStorage data behind an explicit migration/export path; do not silently clear legacy keys in `apps/mobile/src/services/legacyWorkoutMigration.ts` and `apps/mobile/src/__tests__/legacyWorkoutMigration.test.ts`.

## Phase 3: User Story 1 - Author and publish a reusable program (Priority: P1)

**Goal**: Populate and maintain an app-hosted exercise catalog through bulk imports, then let authorized platform staff author, revise, and publish versioned programs without coding schedules.

**Independent Test**: Import an approved source revision without images, review duplicate candidates, author a program from catalog exercises, generate and edit week/day rows, publish it, and verify publishing a later version leaves the original immutable.

### Tests for User Story 1

- [ ] T011 [P] [US1] Test source normalization, repeatable imports, duplicate-candidate generation, alias handling, missing optional fields, and unapproved-license rejection in `scripts/exercise-catalog/import.test.ts`.
- [ ] T012 [P] [US1] Test schedule generation, validation of weeks/days/sets/reps, row overrides, draft edits, and immutable program publication in `apps/mobile/src/domain/programAuthoring.test.ts`.

### Implementation for User Story 1

- [ ] T013 [US1] Implement a source adapter for the approved text-only yuhonas dataset, retaining source record IDs and excluding all image fields and binaries in `scripts/exercise-catalog/sources/yuhonas.ts`.
- [ ] T014 [US1] Implement catalog normalization and duplicate-candidate scoring without automatic merges; require explicit source license approval and preserve provenance in `scripts/exercise-catalog/normalize.ts` and `scripts/exercise-catalog/licenseGate.ts`.
- [ ] T015 [US1] Implement idempotent catalog batch import and review-state reporting without overwriting owner-corrected canonical fields in `scripts/exercise-catalog/import.ts` and `scripts/exercise-catalog/report.ts`.
- [ ] T016 [US1] Create program, immutable program-version, schedule-row, and purchase-product linkage schema; enforce that published versions are immutable and each enrollment-compatible program version belongs to its program in `supabase/migrations/0003_program_authoring.sql`.
- [ ] T017 [US1] Add staff-only RLS and database functions for draft creation/editing, schedule-row edits, validation, and publishing a new version without mutating an existing published version in `supabase/migrations/0004_program_authoring_rls.sql`.
- [ ] T018 [P] [US1] Implement staff-authorized repositories for catalog search, import review, program drafts, schedule rows, and publishing in `apps/mobile/src/services/catalogRepository.ts` and `apps/mobile/src/services/programAuthoringRepository.ts`.
- [ ] T019 [US1] Implement typed schedule generation from setup defaults with row-level overrides and actionable validation errors in `apps/mobile/src/domain/programSchedule.ts`.
- [ ] T020 [US1] Build searchable exercise selection and progression/setup form for exercise, `%1RM`/`RPE`/`RIR`/`STD`, numeric progression, weeks, training days, writer-selected sets, and reps in `apps/mobile/src/screens/ProgramAuthoringSetupScreen.tsx`.
- [ ] T021 [US1] Build week/day grouped table editor with independently editable schedule rows, save-draft, and publish actions in `apps/mobile/src/screens/ProgramScheduleEditorScreen.tsx`.
- [ ] T022 [US1] Add protected writer navigation and user-facing import-review surface for license status, normalized records, aliases, and duplicate candidates in `apps/mobile/App.tsx` and `apps/mobile/src/screens/ExerciseCatalogReviewScreen.tsx`.
- [ ] T023 [US1] Link the current purchasable program product to its latest published version while preserving the shared product model in `apps/mobile/src/services/programCatalogRepository.ts` and `supabase/migrations/0005_program_product_link.sql`.

## Phase 4: User Story 2 - Preview a personalized program (Priority: P1)

**Goal**: Let enrolled users preview a full published schedule before discovery and see appropriate user-specific load prescriptions after discovery.

**Independent Test**: Enroll in an immutable program version, inspect full/week/day views, record the final discovery set per exercise, and verify the expected estimates and subsequent personalized load display without requiring failure.

### Tests for User Story 2

- [ ] T024 [P] [US2] Test Lander estimate inputs, approximate labeling metadata, invalid denominators, load/reps boundaries, and effort-independent `%1RM` calculations in `apps/mobile/src/domain/strengthEstimate.test.ts`.
- [ ] T025 [P] [US2] Test RPE/RIR conversion mapping and source/version provenance, including documented uncertainty, in `apps/mobile/src/domain/effortConversion.test.ts`.
- [ ] T026 [P] [US2] Test enrollment version pinning and consistent full/week/day schedule projections before and after discovery in `apps/mobile/src/domain/programPreview.test.ts`.

### Implementation for User Story 2

- [ ] T027 [US2] Create enrollment, strength-estimate, and estimate-input provenance schema; preserve estimate history and constrain Lander reps to the documented supported range in `supabase/migrations/0006_enrollment_and_estimates.sql`.
- [ ] T028 [US2] Add user-only enrollment read/write RLS and immutable-version read access in `supabase/migrations/0007_enrollment_rls.sql`.
- [ ] T029 [US2] Implement Lander approximate estimate calculation from the final discovery set's actual load and reps, without requiring failure or using RPE/RIR on the `%1RM` path, in `apps/mobile/src/domain/strengthEstimate.ts`.
- [ ] T030 [US2] Implement versioned effort-to-percentage conversion tables and expose outputs as estimates with method provenance in `apps/mobile/src/domain/effortConversion.ts`.
- [ ] T031 [P] [US2] Implement enrollment, program-version, estimate, and effective-prescription read repositories in `apps/mobile/src/services/programEnrollmentRepository.ts` and `apps/mobile/src/services/prescriptionRepository.ts`.
- [ ] T032 [US2] Build enrollment flow and pre-/post-discovery full-program, week, and day preview views with consistent schedule values and clearly labeled estimated loads in `apps/mobile/src/screens/ProgramPreviewScreen.tsx`.
- [ ] T033 [US2] Build non-`STD` discovery set entry for actual load, completed reps, and programmed effort scale; save per-exercise estimates from the final set and keep its first-week prescribed load fields empty in `apps/mobile/src/screens/StrengthDiscoveryScreen.tsx`.
- [ ] T034 [US2] Wire published-program selection, enrollment, discovery completion, and preview routes into app navigation in `apps/mobile/App.tsx`.

## Phase 5: User Story 3 - Record workouts and adapt prescriptions (Priority: P1)

**Goal**: Record workout set results, flag exercise mismatches, and apply reversible, enrollment-specific future-load adjustments after consecutive same-polarity workouts.

**Independent Test**: Complete two consecutive workouts with same-polarity flags on one exercise; verify its remaining weights change only for that user's enrollment, the source version is untouched, effort differences affect RPE/RIR but not `%1RM`, and later qualifying opposite-polarity results can adjust in the other direction.

### Tests for User Story 3

- [ ] T035 [P] [US3] Test set tonnage, rep/effort mismatches, polarity, RPE 10/RIR 0 auto-recording on missed reps, and `%1RM` effort-independence in `apps/mobile/src/domain/workoutFlags.test.ts`.
- [ ] T036 [P] [US3] Test consecutive-workout triggers, exercise-specific overlay changes, up/down re-adjustment, history snapshots, and idempotent retries in `apps/mobile/src/domain/prescriptionAdjustments.test.ts`.

### Implementation for User Story 3

- [ ] T037 [US3] Create workout, workout-exercise, set-result, and append-only adjustment-event schema with unique set order and prescription snapshots in `supabase/migrations/0008_workouts_and_adjustments.sql`.
- [ ] T038 [US3] Add user-scoped workout write/read and enrollment-scoped adjustment RLS; make workout completion plus adjustment trigger atomic and retry-safe in `supabase/migrations/0009_workout_rls_and_completion.sql`.
- [ ] T039 [US3] Implement typed set-performance comparison and flag polarity from prescribed/actual reps, effective load tonnage, and the programmed effort scale in `apps/mobile/src/domain/workoutFlags.ts`.
- [ ] T040 [US3] Implement idempotent consecutive-workout adjustment events that re-estimate only the flagged exercise's remaining prescription in the user's enrollment and preserve the source version in `apps/mobile/src/domain/prescriptionAdjustments.ts`.
- [ ] T041 [P] [US3] Implement workout and set-result repositories that save prescription snapshots, actual inputs, and flags with actionable errors in `apps/mobile/src/services/workoutRepository.ts`.
- [ ] T042 [US3] Build workout UI with completed-rep and programmed RPE/RIR inputs per set, discovery-only load entry, auto-recorded maximum effort for missed reps, and clear save/error states in `apps/mobile/src/screens/ActiveWorkoutScreen.tsx`.
- [ ] T043 [US3] Integrate session completion and updated future prescriptions into enrollment and program screens in `apps/mobile/App.tsx` and `apps/mobile/src/screens/ProgramPreviewScreen.tsx`.

## Phase 6: User Story 4 - Review performance and body-composition trends (Priority: P2)

**Goal**: Visualize exercise projections against actual performance and collect workout-linked body measurements and private optional photos.

**Independent Test**: After discovery and workout completion, inspect projected and actual lines for one exercise, record bodyweight/body composition for workouts, verify measurement trends and point comparisons, and confirm progress-photo access is private.

### Tests for User Story 4

- [ ] T044 [P] [US4] Test selected-exercise projection/actual series, empty history, baseline comparisons, and workout-linked measurement validation in `apps/mobile/src/domain/progressDashboard.test.ts`.
- [ ] T045 [P] [US4] Test private-photo authorization and account-deletion cleanup behavior in `apps/mobile/src/__tests__/database/progress-photo-rls.test.ts`.

### Implementation for User Story 4

- [ ] T046 [US4] Create workout body-measurement and anthropometric-measurement schema with positive bodyweight and 0–100 composition constraints in `supabase/migrations/0010_measurements.sql`.
- [ ] T047 [US4] Add owner-scoped measurement RLS and private progress-photo metadata/storage policies with explicit opt-in sharing in `supabase/migrations/0011_measurement_photo_privacy.sql`.
- [ ] T048 [US4] Implement measurement and private photo repositories with separate upload failure handling and account-deletion cleanup in `apps/mobile/src/services/measurementRepository.ts` and `apps/mobile/src/services/progressPhotoRepository.ts`.
- [ ] T049 [US4] Implement selected-exercise projected/actual time series and measurement baseline comparisons in `apps/mobile/src/domain/progressDashboard.ts`.
- [ ] T050 [US4] Build exercise performance dashboard, bodyweight/body-composition graph, and collection-point comparison details in `apps/mobile/src/screens/ProgramProgressDashboardScreen.tsx`.
- [ ] T051 [US4] Add selectable bodyweight and body-composition inputs to workout completion and optional progress-photo capture to the workout flow in `apps/mobile/src/screens/ActiveWorkoutScreen.tsx` and `apps/mobile/src/screens/ProgressPhotoPromptScreen.tsx`.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validate integrated behavior, secure boundaries, migration safety, and operational readiness across all stories.

- [ ] T052 [P] Add controlled local-development fixtures and an idempotent seed path for one published program and sample users in `supabase/seed/feature-fixtures.sql`.
- [ ] T053 [P] Update app and catalog-import operator documentation with environment setup, import/review/release steps, and no-service-role-key client policy in `apps/mobile/README.md` and `scripts/exercise-catalog/README.md`.
- [ ] T054 Verify local AsyncStorage workouts/photos are exportable or migratable before account/cloud cutover and document any unsupported records without silently deleting them in `apps/mobile/src/services/legacyWorkoutMigration.ts`.
- [ ] T055 Run end-to-end acceptance scenarios in `specs/001-workout-program-authoring/quickstart.md` on web and at least one mobile target; fix failures and update verified results in `specs/001-workout-program-authoring/quickstart.md`.
- [ ] T056 Confirm RLS, staff permissions, private storage, user deletion, and client-secret boundaries with the isolated Supabase security checks in `supabase/tests/feature_security.test.sql`.
- [ ] T057 Run typecheck, unit tests, migration validation, and Expo web startup; record commands and outcomes in `specs/001-workout-program-authoring/quickstart.md`.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; T001–T004 can start immediately (T003/T004 are parallelizable after paths are created).
- **Foundational (Phase 2)**: Depends on setup; all user stories depend on T005–T010.
- **US1 (Phase 3)**: Depends on foundation; delivers the catalog and authoring/publishing flow.
- **US2 (Phase 4)**: Depends on US1 program publication and schema; consumes its published versions.
- **US3 (Phase 5)**: Depends on US2 enrollment/discovery estimate types; workout logging/adjustment writes reuse those records.
- **US4 (Phase 6)**: Depends on US3 workouts and estimates for graph series and workout-linked measurements.
- **Polish (Phase 7)**: Depends on all selected stories.

### User Story Dependencies

- **US1 (P1)**: Starts after foundation; no dependency on another story.
- **US2 (P1)**: Requires US1's immutable published program/version records and catalog. Its independent preview/discovery journey depends on a published program being available.
- **US3 (P1)**: Requires US2's enrollment and discovery-estimate domain model.
- **US4 (P2)**: Requires completed workout and strength-estimate records from US2/US3.

### Parallel Opportunities

- Setup tasks T003 and T004 can run in parallel after the paths are established.
- In foundation, T007 and T008 can run in parallel; T006 policy tests depend on T005 schema.
- In US1, T011/T012 tests can be authored in parallel. After schema T016/T017 and import normalization T014 are available, catalog and authoring UI tasks touching distinct files can proceed in parallel.
- In US2, T024–T026 are independent domain tests. Calculation modules T029 and T030 are separate and can be developed in parallel after T027/T028.
- In US3, T035 and T036 are parallel tests; workout flagging and adjustment calculation modules are separate after shared schema.
- In US4, dashboard-domain work can proceed alongside photo policy/repository work after the workout schema is available.
- Cross-story parallel development is limited: strict story dependencies above avoid starting downstream UI against unstable version/enrollment/workout contracts.

## Parallel Example: User Story 1

```text
After foundational types and schema are agreed:
Task: T011 catalog-import test suite in scripts/exercise-catalog/import.test.ts
Task: T012 authoring/schedule test suite in apps/mobile/src/domain/programAuthoring.test.ts

After importer normalization is implemented:
Task: T015 idempotent import runner and report in scripts/exercise-catalog/import.ts and scripts/exercise-catalog/report.ts

After program authoring schema is migrated:
Task: T018 staff catalog/program repositories in apps/mobile/src/services/
Task: T019 schedule generation in apps/mobile/src/domain/programSchedule.ts
```

## Implementation Strategy

### MVP First

For the smallest independently demonstrable release, complete **Setup + Foundational + User Story 1**, then validate catalog import, staff-only authoring, schedule editing, and immutable publication independently. A real customer-ready adaptive training experience additionally requires US2 and US3; do not represent US1 alone as delivering personalized prescriptions. Prior to displaying load recommendations, obtain qualified review of the approximate Lander discovery policy.

### Incremental Delivery

1. Setup and foundation establish secure cloud persistence, roles, and test harness.
2. US1 delivers an imported app-hosted exercise catalog and staff-authored immutable program versions.
3. US2 adds enrollment, discovery, and full/week/day personalized previews.
4. US3 adds set tracking and automatically adjusted user-specific future prescriptions.
5. US4 adds exercise and body-measurement dashboards plus optional private photos.
6. Polish verifies privacy/deletion, legacy-data handling, and cross-platform app operation.

## Notes

- Tests are included because the feature specifies formula, progression, authorization, import, and automatic-adjustment acceptance behavior; those behaviors need deterministic verification.
- Every task has an exact target path and valid checklist formatting.
- Do not add a service-role key to the Expo client. Public client configuration uses only the Supabase project URL and anon/publishable key; authorization is enforced in RLS.
- Do not import images from exercise datasets.
