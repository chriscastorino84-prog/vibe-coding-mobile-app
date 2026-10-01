# Tasks: Fitness Applied Mobile Wellness Platform

**Input**: Design documents from `specs/002-mobile-wellness-platform/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

## Dependencies and execution order

1. Setup and foundational tasks.
2. US1 authentication and app shell.
3. US2 content contract, synchronization, and offline cache.
4. US3 programs, workouts, cycles, and measurements.
5. US4 calculators, recipes, and shopping-list export.
6. US5 analytics, trophies, and photos.
7. US6 privacy, export, deletion, accessibility, and store release.

US2 depends on US1 authentication. US3-US5 depend on US2 content and sync foundations. US6 depends on all user-facing flows.

## Phase 1: Setup

**Purpose**: Establish mobile release, shared contract, test, and environment foundations.

- [X] T001 Create staging/production environment documentation and secret-boundary rules in `apps/mobile/README.md` and `apps/mobile/.env.example`.
- [X] T002 Add Expo/EAS development, preview, and production profiles with stable iOS/Android identifiers in `apps/mobile/eas.json` and `apps/mobile/app.json`.
- [X] T003 [P] Add SQLite/local persistence dependencies and test scripts in `apps/mobile/package.json`, `apps/mobile/package-lock.json`, and `apps/mobile/vitest.config.ts`.
- [X] T004 [P] Create versioned Fitness-Applied contract package structure and shared schemas in `packages/fitness-applied-contracts/package.json` and `packages/fitness-applied-contracts/src/index.ts`.
- [X] T005 [P] Add app-store privacy, wellness disclaimer, accessibility, and release-check documentation in `apps/mobile/README.md` and `specs/002-mobile-wellness-platform/quickstart.md`.

## Phase 2: Foundational

**Purpose**: Establish app-owned identity, database security, local storage, sync primitives, and content access boundaries.

- [ ] T006 Create app-owned user, consent, content-cache, sync-operation, entitlement, and deletion-audit schema with the data-model invariants in `supabase/migrations/0020_app_foundation.sql`.
- [ ] T007 Create workout, measurement, trophy, photo, and program-cycle tables with user ownership, append-only event identifiers, and completed-cycle read-only constraints in `supabase/migrations/0021_user_records.sql`.
- [ ] T008 Add RLS, private photo storage policies, deletion cleanup, and scoped server-function permissions in `supabase/migrations/0022_app_security.sql`.
- [ ] T009 [P] Configure Supabase Auth providers for email/password, Apple, and Google and add typed client/session handling in `apps/mobile/src/auth/authClient.ts` and `apps/mobile/src/auth/authSession.ts`.
- [ ] T010 [P] Implement typed domain entities and validation for content packages, cycles, workouts, measurements, trophies, photos, entitlements, and sync operations in `apps/mobile/src/domain/types.ts` and `apps/mobile/src/domain/validation.ts`.
- [ ] T011 [P] Implement local SQLite migrations, repositories, and cache metadata in `apps/mobile/src/local/database.ts`, `apps/mobile/src/local/migrations.ts`, and `apps/mobile/src/local/repositories.ts`.
- [ ] T012 Implement sync envelopes, operation state transitions, retry/backoff, idempotency, and repair-visible errors in `apps/mobile/src/services/syncQueue.ts`, `apps/mobile/src/services/syncEngine.ts`, and `apps/mobile/src/services/syncEngine.test.ts`.
- [ ] T013 Implement app-backend proxy/client boundaries for authenticated Fitness-Applied content without exposing service credentials in `apps/mobile/src/services/fitnessAppliedContentClient.ts` and `apps/mobile/src/services/contentCacheRepository.ts`.
- [ ] T014 Add RLS, storage, content-cache, sync, and account-isolation integration tests in `supabase/tests/app_security.test.sql` and `apps/mobile/src/__tests__/foundation.test.ts`.

## Phase 3: User Story 1 - Create an account and start the free app (Priority: P1)

**Goal**: Provide a reliable authenticated consumer app shell.

**Independent Test**: A user can sign up/sign in with each supported method, restore a session, see the free app home, and use cached content after losing connectivity.

### Tests

- [ ] T015 [P] [US1] Test email, Apple, Google, session restore, sign-out, and connectivity-state transitions in `apps/mobile/src/auth/authSession.test.ts`.

### Implementation

- [ ] T016 [US1] Build sign-in, sign-up, verification, password-reset, and provider-auth screens in `apps/mobile/src/features/auth/AuthScreen.tsx` and `apps/mobile/src/features/auth/PasswordResetScreen.tsx`.
- [ ] T017 [US1] Build authenticated session gate, onboarding, wellness disclaimer, and sync-status shell in `apps/mobile/src/App.tsx` and `apps/mobile/src/features/app/AppShell.tsx`.
- [ ] T018 [US1] Implement settings actions for sign-out and session recovery in `apps/mobile/src/features/settings/AccountSettingsScreen.tsx`.
- [ ] T019 [US1] Add user consent recording and first-run privacy/terms presentation in `apps/mobile/src/auth/consentRepository.ts` and `apps/mobile/src/features/auth/ConsentScreen.tsx`.

## Phase 4: User Story 2 - Use published Fitness-Applied content offline (Priority: P1)

**Goal**: Synchronize and use versioned programs, calculators, recipes, shopping lists, and trophies offline.

**Independent Test**: After synchronization, all launch content remains usable offline and last-known-good status is visible when the content service is unavailable.

### Tests

- [ ] T020 [P] [US2] Add Fitness-Applied package schema and compatibility contract tests in `packages/fitness-applied-contracts/src/contentPackage.test.ts` and `apps/mobile/src/services/fitnessAppliedContentClient.test.ts`.
- [ ] T021 [P] [US2] Test content cache version pinning, hash validation, rollback, and last-known-good behavior in `apps/mobile/src/services/contentCacheRepository.test.ts`.

### Implementation

- [ ] T022 [US2] Implement package fetch, compatibility validation, hash verification, and protected proxy calls in `apps/mobile/src/services/fitnessAppliedContentClient.ts`.
- [ ] T023 [US2] Implement content synchronization, package pinning, cache eviction, and visible sync state in `apps/mobile/src/services/contentSyncService.ts` and `apps/mobile/src/features/content/ContentSyncStatus.tsx`.
- [ ] T024 [US2] Implement app navigation for programs, tools, recipes, shopping lists, trophies, and settings in `apps/mobile/src/navigation/AppNavigator.tsx`.
- [ ] T025 [US2] Add stale-content, unavailable-service, malformed-package, and retry UI states in `apps/mobile/src/components/ContentSyncBanner.tsx` and `apps/mobile/src/components/AsyncStateView.tsx`.

## Phase 5: User Story 3 - Complete and track a program cycle (Priority: P1)

**Goal**: Let users preview, complete, synchronize, lock, and restart program cycles.

**Independent Test**: A user can complete an offline workout, synchronize it once, complete a cycle, reopen it read-only, and start an independent second cycle.

### Tests

- [ ] T026 [P] [US3] Test program package mapping, schedule preview, cycle state transitions, and read-only completion in `apps/mobile/src/domain/programCycle.test.ts`.
- [ ] T027 [P] [US3] Test offline workout saves, repeated sync submissions, prescribed/performed values, and measurement association in `apps/mobile/src/features/workouts/workoutSync.test.ts`.

### Implementation

- [ ] T028 [US3] Implement program package repository, full/week/day preview models, and exact content-version pinning in `apps/mobile/src/features/programs/programRepository.ts` and `apps/mobile/src/features/programs/programPreview.ts`.
- [ ] T029 [US3] Build program library, program detail, cycle start, and cycle history screens in `apps/mobile/src/features/programs/ProgramLibraryScreen.tsx`, `ProgramDetailScreen.tsx`, and `ProgramCycleHistoryScreen.tsx`.
- [ ] T030 [US3] Implement workout schedule, set-entry, completion, offline-save, and sync-retry flows in `apps/mobile/src/features/workouts/ActiveWorkoutScreen.tsx`, `workoutRepository.ts`, and `workoutCompletion.ts`.
- [ ] T031 [US3] Implement cycle completion locking and independent restart behavior in `apps/mobile/src/features/programs/programCycleService.ts`.
- [ ] T032 [US3] Add manual bodyweight and body-composition inputs to workout completion in `apps/mobile/src/features/workouts/WorkoutMeasurementsForm.tsx`.

## Phase 6: User Story 4 - Use calculators and nutrition resources (Priority: P1)

**Goal**: Provide all requested offline tools, recipes, and printable shopping-list output.

**Independent Test**: A user can run all six calculators offline, read recipes, and save/share a printable shopping-list file.

### Tests

- [ ] T033 [P] [US4] Test calculator input validation, method/version display, limitations, and Fitness-Applied result mapping in `apps/mobile/src/features/tools/calculatorService.test.ts`.
- [ ] T034 [P] [US4] Test recipe rendering and shopping-list document generation on iOS, Android, and web-compatible test targets in `apps/mobile/src/features/nutrition/shoppingListExport.test.ts`.

### Implementation

- [ ] T035 [US4] Build calculator registry and validation-driven tool screens for BMI, BMR, heart-rate, RPE-to-1RM, RIR-to-1RM, and 1RM in `apps/mobile/src/features/tools/calculatorService.ts` and `apps/mobile/src/features/tools/CalculatorScreen.tsx`.
- [ ] T036 [US4] Build offline recipe index/detail screens with approximate-nutrition and wellness disclaimers in `apps/mobile/src/features/nutrition/RecipeLibraryScreen.tsx` and `RecipeDetailScreen.tsx`.
- [ ] T037 [US4] Implement Fitness-Applied shopping-list template rendering and printable file save/share flow in `apps/mobile/src/features/nutrition/shoppingListExport.ts` and `ShoppingListScreen.tsx`.

## Phase 7: User Story 5 - Review progress, trophies, and photos (Priority: P1)

**Goal**: Provide private progress records and interactive program/exercise dashboards.

**Independent Test**: A user can see selected-exercise trends, body metrics, trophy/photo highlights, and complete history pages.

### Tests

- [ ] T038 [P] [US5] Test selected-exercise projected/actual series, body metric baselines, empty states, and completed-cycle filtering in `apps/mobile/src/features/analytics/analyticsModel.test.ts`.
- [ ] T039 [P] [US5] Test program/general trophy rule versions, idempotent unlocks, and private photo metadata in `apps/mobile/src/features/trophies/trophyService.test.ts` and `apps/mobile/src/features/photos/photoRepository.test.ts`.

### Implementation

- [ ] T040 [US5] Implement selected-exercise, program, bodyweight, and composition analytics models in `apps/mobile/src/features/analytics/analyticsModel.ts`.
- [ ] T041 [US5] Build interactive dashboard, program analytics selection, and empty-state views in `apps/mobile/src/features/analytics/ProgressDashboardScreen.tsx`.
- [ ] T042 [US5] Implement versioned program-specific and general trophy evaluation and persistence in `apps/mobile/src/features/trophies/trophyService.ts` and `TrophyRepository.ts`.
- [ ] T043 [US5] Build trophy showcase/full history screens and program-card links in `apps/mobile/src/features/trophies/TrophyShowcase.tsx`, `TrophyHistoryScreen.tsx`, and `apps/mobile/src/features/programs/ProgramCard.tsx`.
- [ ] T044 [US5] Implement optional photo capture, private upload, local queueing, signed retrieval, deletion, and progression history in `apps/mobile/src/features/photos/photoRepository.ts`, `ProgressPhotoPrompt.tsx`, and `PhotoProgressionScreen.tsx`.
- [ ] T045 [US5] Add program-card photo highlights and links to the full photo progression in `apps/mobile/src/features/programs/ProgramCard.tsx`.

## Phase 8: User Story 6 - Control account data and privacy (Priority: P1)

**Goal**: Complete store-critical account controls, privacy, export, and deletion.

**Independent Test**: A user can export supported records and permanently delete their account and private data in-app.

### Tests

- [ ] T046 [P] [US6] Test export contents, deletion idempotency, pending-operation cancellation, private-photo removal, and user isolation in `apps/mobile/src/features/settings/accountLifecycle.test.ts` and `supabase/tests/account_lifecycle.test.sql`.
- [ ] T047 [P] [US6] Run accessibility checks for labels, text scaling, contrast, targets, charts, and reduced motion in `apps/mobile/src/__tests__/accessibility.test.ts`.

### Implementation

- [ ] T048 [US6] Implement supported-data export generation and local save/share in `apps/mobile/src/features/settings/dataExportService.ts` and `DataExportScreen.tsx`.
- [ ] T049 [US6] Implement re-authentication, deletion confirmation, server deletion job, local wipe, and sign-out in `apps/mobile/src/features/settings/accountDeletionService.ts` and `DeleteAccountScreen.tsx`.
- [ ] T050 [US6] Add privacy policy, terms, support, wellness disclaimers, data controls, and photo-sharing explanations in `apps/mobile/src/features/settings/LegalAndPrivacyScreen.tsx`.
- [ ] T051 [US6] Apply accessibility labels, dynamic sizing, contrast tokens, touch targets, and reduced-motion chart behavior across `apps/mobile/src/components/` and `apps/mobile/src/features/`.

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T052 [P] Add staging/production Fitness-Applied contract fixtures and one complete offline acceptance fixture in `packages/fitness-applied-contracts/fixtures/` and `apps/mobile/src/__tests__/fixtures/`.
- [ ] T053 [P] Add crash/error monitoring without advertising or behavior tracking and document privacy disclosures in `apps/mobile/src/services/telemetry.ts` and `apps/mobile/README.md`.
- [ ] T054 [P] Add localization-ready message/content keys and English locale resources in `apps/mobile/src/localization/`.
- [ ] T055 Add future free/single-cycle/unlimited entitlement schema and repository tests without enabling payments in `supabase/migrations/0023_future_entitlements.sql` and `apps/mobile/src/services/entitlementRepository.ts`.
- [ ] T056 Run typecheck, unit tests, contract tests, Supabase security tests, and offline sync tests; record outcomes in `specs/002-mobile-wellness-platform/quickstart.md`.
- [ ] T057 Build iOS and Android preview/production artifacts with EAS, verify store metadata/permissions/secrets, and record release sign-off in `apps/mobile/eas.json`, `apps/mobile/app.json`, and `specs/002-mobile-wellness-platform/quickstart.md`.

## Parallel execution examples

- Setup: T003, T004, and T005 can run in parallel after T001/T002.
- Foundation: T009, T010, and T011 can run in parallel; T012-T014 follow their interfaces.
- US2: T020 and T021 can run in parallel before T022-T025.
- US3: T026 and T027 can run in parallel before T028-T032.
- US4: T033 and T034 can run in parallel before T035-T037.
- US5: T038 and T039 can run in parallel before T040-T045.
- US6: T046 and T047 can run in parallel before T048-T051.

## MVP scope

The minimum app-store candidate is the foundational layer plus US1-US4: authenticated app shell, synchronized/offline content, the three programs with workout tracking, six calculators, recipes, and printable shopping lists. US5 and US6 remain release-critical for the stated product promise and must be completed before public submission; they are not optional post-launch enhancements.
