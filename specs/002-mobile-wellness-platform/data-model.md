# Data Model: Fitness Applied Mobile Wellness Platform

## Content-service entities

- **ContentPackage**: `id`, `version`, `publishedAt`, `locale`, `contentHash`, `minClientVersion`, `status`.
- **ProgramDefinition**: metadata, schedule, progression rules, analytics definitions, trophy references, and cycle rules.
- **CalculatorDefinition**: key, input schema, validation rules, method/version, output metadata, limitations.
- **Recipe**: localized title, ingredients, instructions, approximate nutrition fields, source/version metadata.
- **ShoppingListTemplate**: localized labels, item groups, graphic layout metadata, printable rendering version.
- **TrophyDefinition**: scope (`program` or `general`), rule version, trigger definition, display metadata.

## App-owned entities

- **UserProfile**: user identity, locale, consent timestamps, account state.
- **ProgramCycle**: user, program version, status (`active`, `completed`, `archived`), start/completion timestamps.
- **Workout**: cycle, scheduled workout, started/completed timestamps, sync metadata.
- **SetResult**: workout, exercise occurrence, prescribed values, performed values, calculation/flag metadata.
- **Measurement**: workout, bodyweight, body-composition percentage, recorded timestamp.
- **ProgressPhoto**: workout/cycle, private object key, capture timestamp, share state.
- **EarnedTrophy**: user, trophy definition version, cycle reference when applicable, earned timestamp.
- **SyncOperation**: client operation ID, entity type, payload, state, retry count, last error, timestamps.
- **ContentCacheEntry**: package/version, payload hash, local availability, last validated timestamp.
- **Entitlement**: user, product/program, tier (`free`, `single_cycle`, `unlimited`), status, source, cycle usage.
- **ProgramCycleSnapshot**: completed enrollment, pinned program version, completion timestamp, selected dashboard configuration, and immutable user-visible summary metrics.
- **ProgramCycleSnapshotMetric**: one metric value belonging to a user-owned program snapshot.
- **ProgramAnalyticsDefinition**: programmer-selected metric, audience, display label, unit, and aggregation behavior.
- **ProgramAggregateMetric**: coach-facing aggregate metric with participant count and no user identifier or raw snapshot reference.

## Invariants

- Published content packages are immutable.
- Completed cycles are read-only.
- Every completed enrollment creates one archive snapshot, including one-day programs.
- Coaches can query aggregate program metrics only; user snapshots and anthropometric details remain user-owned.
- Leaderboard participation is separate from aggregate analytics and requires explicit user opt-in.
- User records are isolated by authenticated user ID.
- Photo objects are private by default.
- Sync operations are idempotent by client operation ID.
- Append-only records are never resolved by overwriting another device’s event.
- Calculator results retain method/version metadata.
- Future entitlement records do not unlock paid access until a verified purchase system exists.
