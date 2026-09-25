# Implementation Plan: Phase 2 — App Foundation and Proof-of-Concept

**Branch**: `[###-app-foundation]` | **Date**: 2026-09-24 | **Spec**: [spec-001-core-loop-purchase-to-first-card-state.md](spec-001-core-loop-purchase-to-first-card-state.md)

**Input**: Feature specification and confirmed product direction for app-first proof-of-concept MVP.

## Summary

Build the first working version of the mobile app as a standalone product, independent from the founder's website and future content repositories. This phase focuses on proving the core loop: a user can browse a program locker, open a standalone program, complete a workout or routine, and immediately see the dashboard and card state update. The app remains intentionally lean and does not build the future resource repositories, content APIs, or website migration stack yet.

The product direction is a catalog-first app with individually selectable programs, including a warm-up program, a macro-cycle program, and a cool-down program, all treated as standalone entries in the app. The proof-of-concept remains free and demo-oriented, with the long-term website and resource infrastructure planned as separate repositories that can be integrated later when the app is established and validated.

## Technical Context

**Language/Version**: TypeScript, React Native with Expo SDK 51+ (or current stable supported release in project setup)

**Primary Dependencies**: Expo, React Native, Supabase JS SDK, React Query, Zustand or lightweight app state management, date-fns, charting library for tonnage and delta graphs

**Storage**: Supabase Postgres for app data, Supabase Storage for private-by-default photos, Realtime for dashboard and card updates

**Testing**: Vitest or Jest for unit logic, React Native Testing Library for UI flows, integration tests around workout completion, tonnage calculations, and trophy unlock thresholds

**Target Platform**: iOS and Android mobile-first; web preview optional during validation

**Project Type**: Mobile app with backend/data services

**Performance Goals**: Workout completion updates within ~1 second to the UI; dashboard render under ~2 seconds for small data sets; app startup and navigation remain smooth on mid-range mobile hardware

**Constraints**: Lean scope, free access for v1, stand-alone programs instead of a single forced macro-cycle path, no full commerce enforcement, no external resource repos as required dependencies, no website-based content dependency, no offline logging, and no advanced long-term compliance tooling in this phase

**Scale/Scope**: Small app footprint, one free proof-of-concept catalog concept, three standalone program types in the seed model, and architecture ready for future API-based content without redesign

## Constitution Check

*GATE: Must pass before Phase 2 execution. Re-check before Phase 3 work.*

- Article I.1: Cross-platform mobile/web app requirement is satisfied by the mobile-first Expo approach with path to web support later.
- Article I.2: The app remains independent from the founder website and does not assume shared user records or purchase history.
- Article I.3: Data-driven progress visualization remains the core requirement; dashboard and program card are first-class surfaces.
- Article I.4: The app supports a catalog-first architecture with multiple product types and future expansion, while staying lean in v1.
- Article II.1: The Program remains the product unit, and the app architecture supports multiple standalone programs rather than a single rigid macro-cycle path.
- Article II.2: No coaching layer is created; the app remains self-directed training content.
- Article II.3: Workout completion triggers and zero-default rules are implemented as first-class behaviors.
- Article II.4: Program card remains a first-class object with stats, graph, photo slot, and trophy state.
- Article III.2: Program schema supports metadata, schedule, strength calculation, trophy conditions, and future expansion.
- Article IV.1/IV.2: Licensing and affiliate support remain deferred, but the model does not foreclose them.
- Article V.2: A product-type-agnostic content or catalog layer is still planned, even though this phase focuses on app-first MVP functionality and deferred external repos.
- Article VI.1: Privacy and encrypted storage standards are respected, especially for photo storage and user account isolation.
- Article VII.1/7.2: Expo + Supabase remains the recommended stack and aligns with the platform profile.
- Article VIII.1: Budget and scope remain intentionally lean and incremental.

## Project Structure

### Documentation (this feature)

```text
.specify/memory/
├── constitution.md
├── spec-001-core-loop-purchase-to-first-card-state.md
├── plan-001-core-loop-purchase-to-first-card-state.md
├── phase-3-draft.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
```

### Source Code (repository root)

```text
apps/
├── mobile/
│   ├── app/
│   ├── components/
│   ├── screens/
│   ├── services/
│   ├── stores/
│   └── tests/
├── web/                 # deferred; optional preview only
│   └── ...
└── shared/
    ├── types/
    ├── lib/
    ├── utils/
    └── validation/

supabase/
├── migrations/
├── seed/
├── functions/
└── sql/

packages/
├── program-engine/
├── analytics/
└── ui/

scripts/
├── setup/
├── seed-data/
└── validation/
```

**Structure Decision**: This phase uses a mobile-first app structure with a shared analytics layer and a Supabase-backed persistence model. A web app and external content repos are intentionally deferred because the current proof-of-concept is defined by the app experience, not by website or content infrastructure.

## Research Findings

### 1. The app should act like a program locker, not a website clone
The user experience is strongest when the home screen behaves like a collection of open, purchased, and in-progress programs. This reduces friction and allows warm-up, macro-cycle, and cool-down programs to live independently without forcing a single app entry path.

### 2. Standalone catalog programs reduce user friction
Each routine should be independently selectable and have its own description page and start flow. This matches the product goal of allowing users to open a warm-up or cool-down directly without entering the broader macro-cycle program.

### 3. The completion event must drive the whole app state
Dashboard values, program card updates, and trophy unlocks should all derive from the same completion event. This keeps the app deterministic and avoids UI drift between cards and dashboard analytics.

### 4. Free access in v1 should be explicit and app-native
The proof-of-concept remains free and should not rely on a real checkout flow. This keeps the app focused on the user loop instead of premature commerce infrastructure.

### 5. The future resource architecture should stay out of the MVP boundary
Website content and resource repositories should remain separate from the app build until the app is validated. The app should be designed so future API-based resource integration is possible without forcing a redesign.

## Data Model

### Core Entities

- **User**: account owner with minimal profile metadata and preferences
- **Program**: a standalone catalog program with metadata, routine type, access state, and status
- **ProgramEnrollment**: user enrollment or access record for a program
- **WorkoutTemplate**: program-defined session content for a routine
- **WorkoutLog**: user-completed instance of a program session
- **AnalyticsRecord**: derived metrics such as tonnage, delta, and graph points
- **MetricDefinition**: graphable exercise or anthropometric metric with a stable unit
- **MetricObservation**: timestamped value for one metric from a completed workout or measurement entry
- **TrophyDefinition**: unlock condition for a program-level trophy
- **TrophyUnlock**: user-specific trophy status when earned
- **CardState**: render state for the program card including stats, graph, and trophy visibility
- **PhotoAsset**: private-by-default user photo reference
- **ResourceItem**: future resource data model reserved for later content repo integration, not required in this phase

### Data Relationships

- One user can have many program enrollments
- One program can have many workout templates
- One program can have many workout logs
- One program can have many trophy definitions
- One user can have many trophy unlocks
- One program can have one card state per user
- Future resource items are separate from program state and remain out of scope in Phase 2

### Required Behaviors

- Default missing numeric values to zero at completion time
- Write one completion event that updates all downstream surfaces
- Persist graph points in sequence order for analytics and UI stability
- Keep exercise performance and anthropometric observations as separate, unit-aware chronological series
- Treat missing optional anthropometric fields as absent observations, not zero values
- Hide trophy states until earned
- Keep private-by-default photo storage and user privacy boundaries in place
- Keep the app ready for API-based resource data without website coupling

## Execution Plan

### Phase 2.1 — App Shell & Navigation
- Create the mobile-first app shell and route structure
- Add a locker screen, program detail screen, and workout completion flow
- Add app-level state for current user, active program, and completion pipeline
- Establish a clean return-to-locker flow after routine completion

### Phase 2.2 — Program Locker and Standalone Programs
- Build the locker-style home screen with program cards
- Add seed programs for warm-up, macro-cycle, and cool-down
- Model each as a standalone program with its own start flow
- Allow direct navigation to each program without requiring the macro-cycle route

### Phase 2.3 — Routine Completion Flow
- Build the workout or routine logging UI for the first proof-of-concept program loop
- Support exercise entry, set entry, and completion actions
- Default missing values to zero on completion
- Trigger a single completion event that updates all downstream surfaces

### Phase 2.4 — Dashboard + Analytics Foundation
- Create a shared analytics layer for tonnage, exercise performance, anthropometric observations, and graph points
- Send real data into the dashboard from the completion event
- Keep every metric as a unit-aware time series so future points and additional measurements can be added without redesign

### Phase 2.5 — Program Card + Trophy State
- Implement the card UI with stats, graph, and photo slot
- Keep the trophy hidden until earned and then unlock it on completion
- Ensure the same completion event drives dashboard and card updates

### Phase 2.6 — Data Persistence & Privacy
- Set up Supabase schema for the app’s core entities
- Add row-level isolation for user data
- Maintain private-by-default storage and account boundaries
- Prepare a clean future integration layer for external resource APIs without hard-coding them

### Phase 2.7 — Testing & Validation
- Unit test tonnage math and zero-default behavior
- Test the locker and program flow in UI-level validation
- Verify the completion pipeline updates dashboard and card state
- Validate the proof-of-concept loop works end-to-end without website dependency

## Risks and Mitigations

### Risk: Overbuilding the future content platform too early
**Mitigation**: Keep all website and resource repo ambitions explicitly deferred. The app should be built to support future API integration, not locked to the website.

### Risk: The app becomes a website clone instead of a true product surface
**Mitigation**: Keep the home experience a locker of programs and optimize for standalone program entry, not website navigation patterns.

### Risk: Analytics and trophy logic drift apart
**Mitigation**: Use one completion event and one shared analytics path to update app state and card/trophy surfaces.

### Risk: Data quality suffers when values are missing
**Mitigation**: Enforce zero-default behaviors centrally during completion and validate with tests before shipping.

## Open Questions to Carry Forward into Phase 3

- How much of the app’s program logic should be seeded as static content vs. data-driven configuration?
- Should the Resources locker be a placeholder screen in Phase 2 or a real low-fidelity implementation?
- Do we want a lightweight admin/data management flow in Phase 3 or only app polish and validation?
- What is the minimum viable external API contract we want to prepare for future integrations?

## Complexity Tracking

This Phase 2 plan stays within the constitution and the lean MVP constraints. No major constitutional conflicts are introduced, and the scope remains focused on validating the app proof-of-concept before building separate repository ecosystems.
