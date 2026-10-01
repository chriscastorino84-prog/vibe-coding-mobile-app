---
name: fitness-workout-flow-design
description: Design and validate Fitness Applied's focused set-by-set workout experience, including prescriptions, effort diagnostics, rest, interruptions, and completion review.
---

# Fitness workout-flow design

Use this skill for changes to the active workout route, set capture, timers,
rest, AMRAP/timed workouts, workout completion, or session reflection.

## Design contract

The active workout is a sequence:

`prepare → active set → save set → rest or next set → exercise transition → session overview → reflection → private recap`

The user must always know:

- what exercise they are doing
- which set they are on
- what the program prescribed
- what they actually recorded
- what action is available next

## Active set rules

- One active set is primary; do not show a competing full-workout table during
  set capture.
- Show prescribed weight/reps and programmed RPE/RIR as read-only context.
- Let users edit actual weight and reps without overwriting the prescription.
- Collect actual RPE or RIR using an explicit scale selected by the program.
- If adding a numeric quality diagnostic, define its direction and meaning. Do
  not label a score “quality” if it actually measures effort or adherence.
- Let users add short set notes without making notes required for normal flow.
- Save must be a large, clearly named action and must not be confused with
  ending the workout.

## Transitions and safety

- After save, show the next set or an explicit rest state.
- Rest must state remaining time, what resumes next, and any permitted skip path.
- Final-set completion must not start an unnecessary rest timer.
- Back, interruption, app suspension, and abandoned-workout states must preserve
  already saved set data and make unsaved data clear.
- AMRAP/timed behavior must not use generic standard-set labels.

## Completion review

- Show a session overview before final persistence.
- Provide a private reflection step that can be skipped when appropriate.
- Photo capture/library access is optional and must have a clear privacy boundary.
- Generate recaps from persisted facts, not optimistic UI state.
- Keep export/share explicit and reversible; never auto-publish.

## Validation evidence

Test at least:

- first set, middle set, final set
- invalid or missing weight/reps
- prescribed value edited by the user
- target RPE/RIR versus actual effort
- rest and skipped rest
- AMRAP duplicate taps and timed-set completion
- interruption after a saved set
- completion overview, reflection, and cancel/back paths
- free-program ad placement versus paid-program suppression
