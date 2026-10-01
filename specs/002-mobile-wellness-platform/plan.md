# Implementation Plan: Fitness Applied Mobile Wellness Platform

**Branch**: `002-mobile-wellness-platform` | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-mobile-wellness-platform/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Deliver a consumer-only iOS/Android wellness app that consumes versioned Fitness-Applied content and logic, stores authenticated user data in a separate app backend, and works offline after initial synchronization. Fitness-Applied remains the canonical source for programs, calculators, recipes, shopping-list templates, and trophies; this app owns identity, user records, sync, analytics, private photos, and release operations.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 6; React 19; React Native 0.86; Expo SDK 57 baseline, upgraded as required by current store SDK policies

**Primary Dependencies**: Expo/EAS, Supabase Auth/Postgres/Storage/Edge Functions, SQLite-backed local persistence, versioned Fitness-Applied API, accessibility and file-export libraries

**Storage**: App-owned Supabase for accounts and user data; local SQLite for offline content and sync queue; private object storage for photos; Fitness-Applied service for canonical content

**Testing**: Vitest and TypeScript checks; API contract tests; Supabase RLS/storage/deletion tests; device acceptance tests on iOS and Android; offline/retry/idempotency tests; accessibility checks

**Target Platform**: iOS and Android first; web and shared website authentication later

**Project Type**: Consumer mobile application with separate content service integration

**Performance Goals**: Launch cached content and an active workout within 5 seconds on representative devices; generate a shopping-list file within 30 seconds; avoid blocking UI during local calculations and sync

**Constraints**: Full offline use after authentication; last-known-good content; append-only user events; idempotent sync; private photos; no service secrets in the app; no medical claims; English launch with localization-ready schemas; no monetization at launch

**Scale/Scope**: Three free programs, six calculators, recipes, printable shopping lists, trophies, workouts, measurements, photos, and dashboards for an initial consumer launch

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Product identity: PASS with revised scope; the app is a standalone cross-platform product and Fitness-Applied is an explicitly separated content service.
- Program governance: PASS; authoring remains owner-controlled in Fitness-Applied and no creator marketplace ships in v1.
- Commerce: PASS WITH DEFERRED SCOPE; future product and entitlement tiers remain modeled, while purchases, affiliates, and donations are explicitly out of v1.
- Privacy/security: PASS pending design; app-owned user data, private photos, deletion, export, RLS, and secret boundaries are release gates.
- Cross-platform delivery: PASS; iOS and Android are launch targets, web is later.
- Wellness/legal: PASS; calculators and nutrition content must be informational, approximate where applicable, and make no medical claims.
- Offline/data integrity: PASS WITH RISK; full offline sync requires conflict-safe event IDs, retries, and end-to-end acceptance tests.

## Project Structure

### Documentation (this feature)

```text
specs/002-mobile-wellness-platform/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
apps/mobile/
├── App.tsx
├── src/
│   ├── auth/
│   ├── components/
│   ├── domain/
│   ├── features/
│   │   ├── content/
│   │   ├── programs/
│   │   ├── workouts/
│   │   ├── analytics/
│   │   ├── nutrition/
│   │   ├── trophies/
│   │   └── settings/
│   ├── local/
│   ├── services/
│   └── __tests__/
├── app.json
└── eas.json
supabase/
├── migrations/
├── functions/
└── tests/
packages/
└── fitness-applied-contracts/
specs/002-mobile-wellness-platform/contracts/
```

**Structure Decision**: Keep the existing Expo app as the consumer client, add an app-owned Supabase boundary for identity and user data, and isolate Fitness-Applied integration behind versioned contracts and repositories. Fitness-Applied authoring remains outside this repository. A small contracts package prevents API payload drift without importing server implementation or credentials.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Full offline store and sync queue | Gym/kitchen use requires offline writes and reliable later synchronization | AsyncStorage-only persistence cannot provide queryable records, migrations, or idempotent replay |
| Separate content-service contract | Fitness-Applied must serve both website and app without coupling its server implementation to this client | Directly importing server code would expose platform assumptions and create release coupling |
