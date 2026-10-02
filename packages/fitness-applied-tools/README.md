# Fitness Applied tools

This package is the shared source of truth for shippable Fitness Applied
calculation and workout-conversion logic. Website and mobile consumers should
use these typed functions rather than maintaining separate formulas or WOD
parsers.

## Included tools

- `calculateBmr`: Mifflin-St Jeor basal metabolic rate estimate with explicit
  units, method version, inputs, validation, and limitations.
- `calculateHrZones`: shipped HR Zone calculator using Tanaka or age-based
  maximum heart rate, with optional heart-rate-reserve zones.
- `parseWod`: converts a WOD prescription into columnar program-engine inputs:
  workout type, time cap, rounds, sets, repetitions, intervals, work/rest
  durations, movements, tracking inputs, and review warnings.

The conversion engine fails closed on an empty prescription and emits warnings
when a workout type is recognized but a required timing or prescription value
is not explicit. It does not invent exercise IDs; catalog matching remains an
explicit importer concern.

The mobile app re-exports the HR calculator from its existing tools service,
while the workout program importer feeds `parseWod` output into generated
program records. Backend infrastructure and Supabase services remain in the
repository; `apps/mobile` remains the iOS and Android app surface.
