# Research: Fitness Applied Mobile Wellness Platform

## Decisions

### Versioned Fitness-Applied content service

**Decision**: Fitness-Applied is the canonical source for published program packages, calculators, recipes, shopping-list templates, and trophy definitions. The app consumes versioned contracts through an app backend proxy/cache.

**Rationale**: One source prevents web/mobile logic drift and allows content updates without a binary release. A proxy keeps service credentials off the client and lets the app preserve last-known-good content offline.

**Alternatives considered**: Bundled JSON was rejected because corrections require app releases. Direct client calls were rejected because credentials, rate limits, and API changes would be harder to control. Importing copies into the app backend was rejected as the primary model because it creates content drift.

### Full offline operation

**Decision**: Use a local structured database and an append-only sync queue. Server mutations use client-generated operation IDs and are idempotent. Append-only workout, measurement, trophy, and photo events are not last-write-wins; editable preferences and cache metadata may use limited last-write-wins.

**Rationale**: Fitness use occurs in weak-connectivity environments. AsyncStorage is not sufficient for indexed queries, migrations, conflict handling, or durable queues.

### Separate app identity and user backend

**Decision**: The mobile app has its own authenticated accounts and user-data backend. The public website remains account-free at launch; shared website login is later.

**Rationale**: This preserves the app’s user-data boundary while allowing Fitness-Applied to remain a free public resource.

### Store-ready wellness scope

**Decision**: Launch as a general wellness and fitness product. Do not use HealthKit/Health Connect, ad tracking, or medical claims in v1.

**Rationale**: Manual measurements and private app records meet the stated goals with less permission, policy, and validation risk.

### Future monetization model

**Decision**: Model future free, single-cycle, and unlimited entitlements, but defer payment and affiliate transactions. A single-cycle entitlement represents one completed run; completed runs remain readable.

**Rationale**: The data model remains extensible without adding billing complexity before the free product is stable.

### Recipes and shopping lists

**Decision**: Recipes are offline-readable informational content. Shopping lists are Fitness-Applied-designed templates rendered into printable files that users can save/share locally; they are not app-editable lists in v1.

**Rationale**: This matches the requested graphic output and keeps content design centralized.

### Release operations

**Decision**: Use reproducible Expo/EAS development, preview, and production profiles; separate staging and production backends; run RLS, deletion, offline, accessibility, and device acceptance tests before submission.

**Rationale**: Store releases require repeatable signed builds, privacy disclosures, and evidence that sensitive data boundaries work.

## Open integration prerequisite

Before implementation of the Fitness-Applied adapter, inspect that repository and pin its API contract/version, deployment URL, authentication mechanism, content licensing, and compatibility tests. Do not infer server routes from this repository.
