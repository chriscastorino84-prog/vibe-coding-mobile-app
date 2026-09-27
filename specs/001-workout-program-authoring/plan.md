# Implementation Plan: Reusable Workout Program Authoring

**Branch**: `001-workout-program-authoring` | **Date**: 2026-09-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-workout-program-authoring/spec.md`

## Summary

Replace hard-coded program schedules with owner/team-authored, versioned program data and a searchable app-owned exercise catalog. Populate the catalog from a small number of rights-reviewed, text-only source datasets through a repeatable import and review process; do not require manual entry of the entire catalog or query third-party datasets at runtime. Use the existing Expo React Native/Web application and the project's constitution baseline of Supabase Postgres/Auth/Storage for shared program, catalog, and user-progress persistence. Generate schedules from writer defaults, allow row-level revision, then publish immutable versions. Enrollments pin a published version and store per-user strength estimates, workout results, and isolated adjustments. Treat Lander and RPE/RIR conversions as estimates with recorded calculation provenance and explicit limitations.

## Technical Context

**Language/Version**: TypeScript 6.0.3; React 19.2.3; React Native 0.86.3; Expo SDK 57 (current app manifest).

**Primary Dependencies**: Expo/React Native/React Native Web; Supabase Postgres, Auth, and private Storage (constitution baseline); SQL migrations; a repeatable TypeScript or Python catalog import/review utility. No root package manifest exists; the only app manifest is `apps/mobile/package.json`.

**Storage**: Supabase Postgres for canonical exercises, source provenance, program definitions/versions, enrollments, workout/set data, strength estimates, measurements, and adjustment events; private Supabase Storage for optional progress photos. AsyncStorage remains a local cache/prototype persistence only and must not become the shared source of truth.

**Testing**: Add a typed unit/integration test setup for domain calculations and import normalization; run PostgreSQL migration/RLS checks against a local or isolated Supabase development project; add UI flow checks for authoring and user workout paths. No test runner or test scripts currently exist in `apps/mobile/package.json`; implementation tasks must establish them before feature tests are added.

**Target Platform**: iOS, Android, and web through the current Expo application; hosted Supabase project and private object storage.

**Project Type**: Cross-platform mobile/web application with managed relational backend and data import tooling.

**Performance Goals**: Target p95 under 500 ms for ordinary authenticated catalog/program reads under the agreed initial launch load, excluding client rendering and network access conditions. Schedule generation and strength recalculation should complete synchronously for one workout without noticeable blocking; measure this in acceptance tests on representative programs.

**Constraints**: Respect the constitution's owner/team-only program authoring, product/versioning model, private-by-default images, account deletion, encryption, and cross-platform delivery. Exercise source data can only be imported if reuse/redistribution terms permit; exclude image files. Preserve current local records through any cloud onboarding/migration path. Keep published versions immutable and RLS-enforce user/staff boundaries. Estimated-strength outputs must be labeled estimates and retain method/input provenance.

**Scale/Scope**: Initial exercise catalog built from at least one verified source, expected to contain hundreds to low-thousands of records; the import design must support repeatable re-imports and growth to additional vetted sources. No reliable concurrent-user or launch-volume target is established; avoid premature multi-service decomposition and validate the database under the product's initial launch load when defined.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Before Phase 0

- **Product identity and platform**: PASS — stays within the standalone cross-platform app and existing Expo codebase.
- **Program and authoring model**: PASS — platform owner/team authors programs; no user creator marketplace or third-party upload/revenue sharing is added.
- **Commerce and product identity**: PASS — program remains the independently purchasable product; catalog/program data remains extensible without replacing the shared product model.
- **Data security and privacy**: PASS — user-owned data is isolated, photos are private by default, and deletion is planned.
- **Maintainability and delivery**: PASS — one managed relational service and staged, repeatable imports suit a lean founder-led implementation.

### After Phase 1 design

- **Versioning and data integrity**: PASS — published program versions are immutable; enrollments pin a version; user adjustments are append-only and isolated to one enrollment.
- **Authorization/privacy**: PASS — user records are scoped by authenticated user with database-enforced row-level policies; staff operations are separate; photo objects are private.
- **Catalog/license governance**: PASS — source revision and license provenance are retained, source approvals gate import, image binaries are excluded, and ambiguous duplicate candidates require review.
- **Strength calculation transparency**: PASS WITH RISK — preserve Lander and the user's selected progression methods, but outputs are approximate estimates; the final recorded reps are used without requiring failure. The conventional formula input differs, so retain provenance and obtain qualified-expert review before releasing weight recommendations as described in [research.md](./research.md).
- **Architecture fit**: PASS — Expo client with Supabase matches the current constitution baseline; no separate backend service is introduced without evidence it is required.

## Project Structure

### Documentation (this feature)

```text
specs/001-workout-program-authoring/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── exercise-catalog-import.md
│   └── program-data-access.md
└── tasks.md                         # generated by /speckit-tasks
```

### Source Code (repository root)

```text
apps/
└── mobile/
    ├── App.tsx                       # current app shell; evolve navigation/state ownership
    ├── src/
    │   ├── components/               # shared cross-platform program/workout UI
    │   ├── data/
    │   │   ├── seedPrograms.ts       # current hard-coded schedules; migrate behind repository adapter
    │   │   └── workoutPrescription.ts # existing prescription parsing to replace/extend with typed rules
    │   ├── screens/                  # authoring flow, program views, workout, dashboard
    │   ├── services/                 # Supabase client and data repositories
    │   ├── domain/                   # validation, schedule generation, estimates, adjustment logic
    │   ├── types.ts                  # migrate legacy types to normalized app/domain types
    │   └── __tests__/                # calculation, repository, and UI-flow tests
    └── package.json                  # app dependencies and test scripts
supabase/
├── migrations/                       # schema, RLS policies, RPCs, indexes
└── seed/                             # development-only staff and fixture content (no private user data)
scripts/
└── exercise-catalog/                 # source-specific parsers, normalization, candidate reports, import runner
```

**Structure Decision**: Extend the existing `apps/mobile` Expo application instead of creating a second frontend or custom API server. Add Supabase migrations as the schema source of truth and a bounded import tool under `scripts/exercise-catalog`. Keep pure domain calculations independent from React Native and database clients so formula and adjustment behavior can be unit-tested deterministically. The staff authoring experience is part of the cross-platform application behind staff authorization; the implementation should prioritize the web layout for tabular editing while retaining a usable mobile writer flow.

## Complexity Tracking

No constitution violations or additional project layers are proposed. A managed database and import runner are required by owner-authored shared programs and bulk catalog ingestion; a bespoke backend service is not justified by current requirements.
