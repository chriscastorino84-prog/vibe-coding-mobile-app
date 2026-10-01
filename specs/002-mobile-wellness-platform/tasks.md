# Tasks: Fitness Applied Mobile Wellness Platform Launch

**Input**: Design documents from `specs/002-mobile-wellness-platform/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Scope**: Remaining work required to move the existing Expo/Supabase app, Fitness-Applied content service, and Kaggle WOD catalog toward an iOS/Android launch and public marketplace.

## Current baseline

The repository already contains the Expo app shell, Supabase program/content foundations, local SQLite and sync primitives, Fitness-Applied contract validation, program authoring support, marketplace fields, and the Kaggle WOD exporter. Tasks marked as remaining below close the gaps needed for a release candidate; they do not recreate completed groundwork.

## Work ownership

See [launch-readiness-matrix.md](./launch-readiness-matrix.md) for the full
split. In short:

- **Founder-owned**: external accounts, legal/content approval, deployed
  Supabase services, store metadata/assets, physical-device acceptance, and
  final release approval.
- **Agent-executable now**: repository code, tests, fixtures, local validation,
  documentation, and app-side work that does not require production secrets.
- **Gated**: staging/production verification and publication tasks that depend on
  the founder-owned actions being complete.

## Dependencies and execution order

1. Phase 1 release setup and Phase 2 backend/security gates.
2. US1 authentication and app-shell release blockers.
3. US2 content synchronization and WOD marketplace publication.
4. US3 workout/cycle completion.
5. US4 calculators, recipes, and shopping-list export.
6. US5 progress, trophies, analytics, and photos.
7. US6 privacy, export, deletion, accessibility, and support.
8. Final release hardening, store submission, and post-launch operations.

US1 must be production-ready before external acceptance testing. US2 must be production-ready before launch content can be reviewed. US3-US5 can proceed in parallel after the content and sync contracts are stable. US6 and final release tasks depend on all user-facing flows.

## Phase 1: Setup and launch inventory

**Purpose**: Establish a single, auditable definition of launch scope and the environments needed to ship.

- [X] T001 [P] Inventory implemented, partial, and missing requirements against `specs/002-mobile-wellness-platform/spec.md` in `specs/002-mobile-wellness-platform/launch-readiness-matrix.md`.
- [ ] T002 [P] Confirm permanent iOS bundle identifier, Android application ID, app display name, icons, splash assets, and supported SDK versions in `apps/mobile/app.json`.
- [ ] T003 [P] Document staging and production Supabase projects, Fitness-Applied content API endpoints, EAS environments, and secret ownership in `apps/mobile/README.md` and `apps/mobile/.env.example`.
- [X] T004 [P] Add deterministic release commands for typecheck, unit tests, contract tests, Supabase checks, and Expo preflight in `apps/mobile/package.json` and `apps/mobile/scripts/release-preflight.mjs`.
- [X] T005 Create a launch content manifest listing the three core programs, calculators, recipes, shopping lists, trophies, and WOD catalog revision in `packages/fitness-applied-contracts/fixtures/launch-content-manifest.json`.

## Phase 2: Foundational production and security gates

**Purpose**: Complete blocking infrastructure before broad user-story work.

- [ ] T006 Apply every pending Supabase migration to a disposable staging project and record the migration order and rollback notes in `specs/002-mobile-wellness-platform/quickstart.md`.
- [ ] T007 [P] Configure Supabase Auth email verification, password reset, Apple, and Google providers and verify redirect URLs in the staging project and `apps/mobile/src/auth/authClient.ts`.
- [ ] T008 [P] Add staging database/RLS/storage integration coverage for user isolation, private photos, sync idempotency, completed-cycle immutability, and account deletion in `supabase/tests/app_security.test.sql`.
- [ ] T009 [P] Add explicit production error reporting and user-visible failure states for content, sync, auth, and deletion operations in `apps/mobile/src/services/telemetry.ts` and `apps/mobile/src/services/repositoryResult.ts`.
- [X] T010 Verify no service-role keys, private API credentials, or staging secrets are embedded in the Expo bundle and document the check in `apps/mobile/scripts/release-preflight.mjs`.
- [X] T011 Run the mobile typecheck and complete unit-test baseline; record failures as linked backlog items rather than suppressing them in `apps/mobile/package.json` and `apps/mobile/README.md`.

## Phase 3: User Story 1 - Create an account and start the free app (Priority: P1)

**Goal**: Make account creation, session restoration, consent, and the authenticated app shell reliable on real devices.

**Independent Test**: A tester can create accounts with email, Apple, and Google; restore a session on a second device; sign out; reset a password; and see the authenticated home screen.

### Tests

- [ ] T012 [P] [US1] Add auth journey tests for email verification, provider callbacks, session restore, sign-out, password reset, and offline session behavior in `apps/mobile/src/auth/authSession.test.ts`.
- [ ] T013 [P] [US1] Add a device acceptance checklist for first launch, consent, auth errors, loading states, and session recovery in `specs/002-mobile-wellness-platform/quickstart.md`.

### Implementation

- [ ] T014 [US1] Finish sign-in, sign-up, verification, provider-auth, and password-reset screens using the actual app navigation structure in `apps/mobile/src/screens/AuthScreen.tsx`, `apps/mobile/src/screens/PasswordResetScreen.tsx`, and `apps/mobile/App.tsx`.
- [ ] T015 [US1] Finish session gating, first-run consent, wellness disclaimer, and offline/authenticated shell states in `apps/mobile/src/auth/SessionGate.tsx`, `apps/mobile/src/screens/ConsentScreen.tsx`, and `apps/mobile/src/auth/AppShell.tsx`.
- [ ] T016 [US1] Add robust user-facing recovery for expired sessions, unavailable providers, malformed callbacks, and connectivity changes in `apps/mobile/src/auth/authSession.ts` and `apps/mobile/src/components/AsyncStateView.tsx`.

## Phase 4: User Story 2 - Use published content offline and publish WOD marketplace content (Priority: P1)

**Goal**: Ship a verified, immutable launch content package and make all approved Kaggle WODs discoverable under the WOD category.

**Independent Test**: A tester can synchronize the launch package, open every launch program and WOD offline, see the last-known-good version, and browse WOD records with category `WOD` and marketplace status `published`.

### Tests

- [X] T017 [P] [US2] Add content-package contract fixtures for launch programs, WOD category metadata, marketplace status, attribution, and schema compatibility in `packages/fitness-applied-contracts/src/contentPackage.test.ts` and `packages/fitness-applied-contracts/fixtures/`.
- [X] T018 [P] [US2] Add importer regression tests for all CSV columns, quoted commas, deterministic IDs, duplicate source rows, empty WOD rejection, and explicit license approval in `scripts/workout-program-import/export.test.ts`.
- [ ] T019 [P] [US2] Add synchronization tests for hash validation, version pinning, rollback, cache eviction, unavailable API, and last-known-good display in `apps/mobile/src/services/contentSyncService.test.ts` and `apps/mobile/src/services/contentPackageValidation.test.ts`.

### Implementation

- [ ] T020 [US2] Run the approved Kaggle exporter against the pinned CSV revision and store the reproducible command, record count, reviewer, date, and attribution in `scripts/workout-program-import/README.md` and `specs/002-mobile-wellness-platform/launch-content-manifest.json`.
- [ ] T021 [US2] Add a reviewed-content ingestion step that validates the generated WOD package against the shared contract before it can be uploaded to the Fitness-Applied content service in `scripts/workout-program-import/export.ts` and `packages/fitness-applied-contracts/src/index.ts`.
- [ ] T022 [US2] Publish the WOD records as free `category: "WOD"` marketplace content without changing source attribution or license metadata in the Fitness-Applied content package fixture and its publishing workflow.
- [ ] T023 [US2] Finish package synchronization, package pinning, cache persistence, retry state, and visible last-sync status in `apps/mobile/src/services/contentSyncService.ts`, `apps/mobile/src/local/contentCacheRepository.ts`, and `apps/mobile/src/screens/HomeScreen.tsx`.
- [ ] T024 [US2] Add marketplace category filtering and WOD presentation without breaking existing program mapping in `apps/mobile/src/services/fitnessAppliedProgramMapping.ts`, `apps/mobile/src/types.ts`, and `apps/mobile/src/components/ProgramCard.tsx`.
- [ ] T025 [US2] Verify the published staging package from a clean app install, then record content hash, version, record count, and rollback package in `specs/002-mobile-wellness-platform/quickstart.md`.

## Phase 5: User Story 3 - Complete and track a program cycle (Priority: P1)

**Goal**: Make preview, workout logging, offline save, sync, completion locking, and independent restart production-ready.

**Independent Test**: A tester can start a program, complete and reconnect an offline workout exactly once, finish a cycle, reopen it read-only, and start a second cycle.

### Tests

- [ ] T026 [P] [US3] Add schedule and cycle-state tests for version pinning, prescribed values, completion locking, and independent restart in `apps/mobile/src/domain/programSchedule.test.ts` and `apps/mobile/src/services/fitnessAppliedProgramRepository.test.ts`.
- [ ] T027 [P] [US3] Add offline workout integration tests for append-only set results, measurements, retries, duplicate operation IDs, and reconnect behavior in `apps/mobile/src/services/syncEngine.test.ts` and `apps/mobile/src/local/workoutRepository.test.ts`.

### Implementation

- [ ] T028 [US3] Finish program library, detail, schedule preview, cycle start, and cycle history flows using the existing screens and repositories in `apps/mobile/src/screens/ProgramGarageScreen.tsx`, `apps/mobile/src/screens/ProgramDetailScreen.tsx`, `apps/mobile/src/screens/ProgramLockerScreen.tsx`, and `apps/mobile/src/services/fitnessAppliedProgramRepository.ts`.
- [ ] T029 [US3] Finish active workout set entry, zero-value handling, measurement capture, completion, abandonment, and offline persistence in `apps/mobile/src/screens/WorkoutScreen.tsx`, `apps/mobile/src/local/workoutRepository.ts`, and `apps/mobile/src/domain/validation.ts`.
- [ ] T030 [US3] Finish cycle completion snapshots, immutable read-only history, and independent restart behavior in `apps/mobile/src/services/programSnapshotRepository.ts`, `apps/mobile/src/services/fitnessAppliedProgramRepository.ts`, and `apps/mobile/src/screens/ProgramLockerScreen.tsx`.

## Phase 6: User Story 4 - Use calculators and nutrition resources (Priority: P1)

**Goal**: Make all launch tools usable offline with transparent validation, approximation, method metadata, recipes, and shopping-list export.

**Independent Test**: A tester can run all six calculators with valid and invalid inputs offline, read recipes, and create/share a printable shopping-list file.

- [ ] T031 [P] [US4] Add valid, invalid, boundary, method-version, and limitation tests for all six calculator definitions in `apps/mobile/src/features/tools/*.test.ts` and `packages/fitness-applied-contracts/fixtures/`.
- [ ] T032 [P] [US4] Add offline recipe and shopping-list fixture tests, including empty lists, duplicate ingredients, units, file creation, and share cancellation in `apps/mobile/src/features/nutrition/` and `apps/mobile/src/features/settings/dataExportService.test.ts`.
- [ ] T033 [US4] Finish calculator screens and ensure every estimate displays method/version, uncertainty or limitations, and actionable validation errors in `apps/mobile/src/features/tools/` and `apps/mobile/src/domain/`.
- [ ] T034 [US4] Finish recipe browsing, recipe approximation disclaimers, shopping-list generation, local save, and native share/export behavior in `apps/mobile/src/features/nutrition/` and `apps/mobile/src/features/shoppingList/`.

## Phase 7: User Story 5 - Review progress, trophies, analytics, and photos (Priority: P1)

**Goal**: Deliver the differentiating progress card with correct empty states, private photos, trophies, and cycle analytics.

**Independent Test**: A tester with workout and measurement history can filter one exercise, view trends and trophy highlights, add a private photo, and open complete histories; a new user sees useful empty states.

- [ ] T035 [P] [US5] Add analytics tests for selected-exercise filtering, projected/actual performance, bodyweight/composition baselines, empty states, and snapshot metrics in `apps/mobile/src/components/MetricChart.test.tsx`, `apps/mobile/src/services/programSnapshotRepository.test.ts`, and `apps/mobile/src/features/analytics/`.
- [ ] T036 [P] [US5] Add trophy and photo privacy tests for award rules, private storage access, cancellation, deletion, and cycle-card highlights in `apps/mobile/src/features/trophies/`, `apps/mobile/src/features/analytics/`, and `supabase/tests/app_security.test.sql`.
- [ ] T037 [US5] Finish live program-card dashboard faces, progress graphs, trophy highlights, photo highlights, and no-data explanations in `apps/mobile/src/components/ProgramCard.tsx`, `apps/mobile/src/components/MetricChart.tsx`, and `apps/mobile/src/screens/DashboardScreen.tsx`.
- [ ] T038 [US5] Finish photo capture/upload/share-state handling with private-by-default storage and non-blocking cancellation in `apps/mobile/src/features/analytics/`, `apps/mobile/src/services/`, and `supabase/migrations/`.

## Phase 8: User Story 6 - Control account data and privacy (Priority: P1)

**Goal**: Make privacy, export, deletion, accessibility, and legal disclosures ready for store review.

**Independent Test**: A tester can export supported records, cancel an optional photo, sign out, re-authenticate, permanently delete the account, and verify that cloud/local records and private photos are removed.

- [ ] T039 [P] [US6] Add export-contract tests covering workouts, measurements, cycles, trophies, photos metadata, consent, and empty accounts in `apps/mobile/src/features/settings/dataExportService.test.ts`.
- [ ] T040 [P] [US6] Add end-to-end deletion verification for cloud rows, storage objects, local databases, queued operations, and session invalidation in `apps/mobile/src/features/settings/accountDeletionService.test.ts` and `supabase/tests/account_deletion.test.sql`.
- [ ] T041 [US6] Finish re-authentication, deletion confirmation, server deletion function deployment configuration, local wipe, and sign-out in `apps/mobile/src/features/settings/accountDeletionService.ts`, `apps/mobile/src/screens/AccountSettingsScreen.tsx`, and `supabase/functions/delete-account/index.ts`.
- [ ] T042 [US6] Finish usable data export and account/privacy controls in `apps/mobile/src/features/settings/dataExportService.ts` and `apps/mobile/src/screens/AccountSettingsScreen.tsx`.
- [ ] T043 [US6] Add public privacy policy, terms, support URL, wellness disclaimers, photo-sharing explanation, and store data-deletion URL in `apps/mobile/src/screens/`, `apps/mobile/README.md`, and release metadata.
- [ ] T044 [US6] Run VoiceOver/TalkBack, dynamic text, contrast, touch-target, keyboard/focus, and reduced-motion checks and fix findings in `apps/mobile/src/components/`, `apps/mobile/src/screens/`, and `apps/mobile/src/theme/`.

## Phase 9: Release hardening and marketplace launch

**Purpose**: Validate the complete product from clean environments and submit only after all launch gates pass.

- [ ] T045 [P] Add staging and production content-package fixtures plus one complete offline acceptance fixture in `packages/fitness-applied-contracts/fixtures/` and `apps/mobile/src/__tests__/fixtures/`.
- [ ] T046 [P] Add localization-ready message/content keys and English resources for auth, sync, workout, privacy, errors, and marketplace labels in `apps/mobile/src/localization/`.
- [ ] T047 [P] Add crash/error monitoring that excludes advertising and behavior tracking, then document data collection and retention in `apps/mobile/src/services/telemetry.ts` and `apps/mobile/README.md`.
- [ ] T048 Run the full typecheck, unit, contract, RLS, storage, deletion, and offline suites from a clean checkout and resolve every failure in the affected source files.
- [ ] T049 Build iOS and Android preview artifacts from staging with `eas build --profile preview --platform all`, install them on physical devices, and record results in `specs/002-mobile-wellness-platform/quickstart.md`.
- [ ] T050 Run the complete quickstart scenarios on both platforms, including auth, offline content, WOD browsing, workouts, calculators, export, analytics, privacy, deletion, and accessibility in `specs/002-mobile-wellness-platform/quickstart.md`.
- [ ] T051 [P] Prepare App Store and Google Play metadata, screenshots, age rating, privacy nutrition labels/Data Safety, support URL, account-deletion URL, and reviewer notes in `apps/mobile/store/` and `apps/mobile/README.md`.
- [ ] T052 Verify production Supabase migrations, Auth providers, storage policies, Edge Functions, content API package hash, WOD count, and environment variables in `apps/mobile/scripts/release-preflight.mjs`.
- [ ] T053 Create signed production builds with `eas build --profile production --platform all`, upload them to TestFlight and Google Play internal testing, and complete smoke tests before public submission.
- [ ] T054 Record founder sign-off for content rights, WOD attribution, security/RLS, privacy/deletion, accessibility, analytics disclaimers, and release rollback in `specs/002-mobile-wellness-platform/launch-signoff.md`.
- [ ] T055 Define post-launch monitoring, support triage, content rollback, WOD correction, crash response, and first-week review cadence in `apps/mobile/README.md` and `specs/002-mobile-wellness-platform/launch-operations.md`.

## Independent test criteria by user story

- **US1**: Auth provider journeys, session restore, consent, sign-out, and password reset pass on iOS and Android.
- **US2**: A clean install synchronizes a signed package, opens all content offline, shows last-known-good status, and lists published free WOD records under `WOD`.
- **US3**: Offline workout completion synchronizes exactly once, preserves prescribed/performed values, locks completed cycles, and supports a second cycle.
- **US4**: All six calculators reject invalid input, expose method metadata, and recipes/shopping-list export work offline.
- **US5**: Dashboard metrics are correctly scoped, empty states are understandable, trophies render, and photos remain private by default.
- **US6**: Export, re-authenticated deletion, local wipe, private-photo removal, disclosures, and accessibility checks pass.

## Parallel execution examples

After T006-T011 are complete:

```text
US1: T012-T016
US2: T017-T025
US3: T026-T030
US4: T031-T034
US5: T035-T038
```

Within the release phase, T045-T047 and T051 can run in parallel with the final acceptance work. T048-T054 remain sequential gates because each depends on the preceding validated environment or artifact.

## Implementation strategy

### MVP launch slice

1. Complete T001-T011.
2. Complete US1 and US2, including the signed launch content package and WOD marketplace publication.
3. Complete the minimum US3 workout loop and US6 privacy/deletion gates.
4. Run T048-T050 on physical iOS and Android devices.

Do not submit the app until the MVP slice passes; US4 and US5 are launch requirements from the product specification and must be completed before public release even if they are developed in parallel with US3.

### Bulk completion sequence

1. Use separate workstreams for US1, US2, US3, US4, and US5 after foundational gates.
2. Keep WOD export reproducible from the pinned Kaggle CSV; never hand-edit generated IDs or silently replace source text.
3. Merge each workstream only after its independent test criteria pass.
4. Execute US6 and the release phase against a clean checkout, staging project, and physical devices.
5. Publish only the content package whose hash and record counts are captured in the launch manifest.
