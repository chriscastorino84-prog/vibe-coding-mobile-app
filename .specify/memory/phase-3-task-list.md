# Phase 3 Task List: App Build Execution

**Status**: Ready to execute
**Date**: 2026-09-24

## Execution Strategy

This task list is the working implementation list derived directly from the Phase 3 backlog. It is ordered to reduce rework and establish the foundation before polishing the app.

## Priority Order

### 1. App Foundation

#### Task 1.1 — Set up Expo app structure
- Create project structure for mobile app, shared logic, and app state
- Confirm TypeScript and required dependencies are installed
- Acceptance: the app runs locally with a basic shell

#### Task 1.2 — Build app shell and navigation
- Add main navigator and route structure
- Create screens for locker, program detail, routine flow, dashboard, and card view
- Acceptance: app can navigate across core screens

#### Task 1.3 — Build app state layer
- Create state for current user, active program, active session, and completion flow
- Acceptance: the app can manage the active program state without ad hoc logic

#### Task 1.4 — Create loading and empty states
- Add base loading screen and empty state patterns
- Acceptance: app handles baseline empty states without crashing

### 2. Program Locker

#### Task 2.1 — Build Program Locker screen
- Create card-grid layout for programs
- Add placeholder or seeded program cards
- Acceptance: user sees a clear locker home screen

#### Task 2.2 — Create reusable program card component
- Include title, category, status, and CTA metadata
- Acceptance: program card is reusable across the app

#### Task 2.3 — Seed standalone program data
- Add warm-up, macro-cycle, and cool-down program entries
- Acceptance: the app has at least three visible program options

### 3. Standalone Program Flow

#### Task 3.1 — Build program detail screen
- Add program description and CTA area
- Acceptance: each program has a dedicated detail page

#### Task 3.2 — Add start flow for each standalone program
- Connect detail page CTA to program session flow
- Acceptance: user can start a selected program directly

#### Task 3.3 — Create back navigation to locker
- Add clear navigation back to home/locker after leaving a program
- Acceptance: app flow is easy to understand and recover from

### 4. Routine Completion Flow

#### Task 4.1 — Build routine/workout form
- Add exercise and set entry fields
- Acceptance: user can enter workout data in a clear and usable form

#### Task 4.2 — Add complete action
- Add completion button and success state
- Acceptance: user can finish the routine reliably

#### Task 4.3 — Default missing values to zero
- Add logic to convert unset numeric values to zero at completion time
- Acceptance: no null-based workout values remain in completion logic

#### Task 4.4 — Trigger completion pipeline
- Save the workout and trigger dependent app updates
- Acceptance: completion creates a single event path for downstream updates

#### Task 4.5 — Return user to locker after completion
- Ensure the completion flow closes the session and sends user back to the locker
- Acceptance: user returns to the home screen after finishing a program

### 5. Analytics and Dashboard

#### Task 5.1 — Create tonnage utility
- Build a shared function for calculating tonnage
- Acceptance: tonnage logic is centralized

#### Task 5.2 — Create dashboard data aggregation layer
- Convert workout data into graph-ready data points
- Acceptance: dashboard can consume structured workout history without UI hacks

#### Task 5.3 — Update dashboard after completion
- Connect completion event to dashboard update flow
- Acceptance: dashboard immediately reflects the user’s latest workout data

#### Task 5.4 — Validate multi-point graph behavior
- Ensure future points can be added without redesign
- Acceptance: graph structure supports more than one workout point

#### Task 5.5 — Track exercise performance series
- Emit one graphable performance point for every logged exercise
- Acceptance: the dashboard can distinguish exercise series by stable metric ID

#### Task 5.6 — Track anthropometric series
- Capture optional body measurements with units and recorded timestamps
- Acceptance: body measurements graph chronologically without creating false zero values

#### Task 5.7 — Preserve metric unit integrity
- Keep incompatible units in separate series or convert them before comparison
- Acceptance: graph data never compares raw values with mismatched units

### 6. Program Card and Trophy State

#### Task 6.1 — Build reusable program card UI
- Add stats area, graph area, and photo slot
- Acceptance: card reads as a single program surface

#### Task 6.2 — Build separate trophy garage
- Keep trophy status out of program tiles
- List earned trophies in a dedicated garage surface
- Acceptance: earned trophy state reflects real user progress

#### Task 6.3 — Connect card state to completion pipeline
- Use the same session source for trophy unlock rules and dashboard updates
- Acceptance: trophy rules can expand without changing program card UI

### 7. QA and Validation

#### Task 7.1 — Validate completion loop end-to-end
- Run through locker → program → complete → dashboard/card update
- Acceptance: the proof-of-concept loop works in sequence

#### Task 7.2 — Validate default-zero handling
- Test missing fields on completion
- Acceptance: user inputs without values do not break the data model

#### Task 7.3 — Validate empty/loading/error states
- Review major app states for polish and stability
- Acceptance: app remains understandable and functional under incomplete conditions

#### Task 7.4 — Run founder demo validation pass
- Check the app for product coherence and clarity
- Acceptance: the app is convincing enough for pilot/demo use

### 8. Architecture and Future Readiness

#### Task 8.1 — Keep app data model clean and future-ready
- Ensure program and workout data are organized for future extension
- Acceptance: app data is not tightly coupled to current website patterns

#### Task 8.2 — Document the future API contract boundary
- Capture how external content repos will integrate later
- Acceptance: future work does not require redesign of the app shell

#### Task 8.3 — Keep the Resources locker concept intentionally lightweight
- Leave it as a placeholder or simple shell unless needed for validation
- Acceptance: future resource work remains separate from the main build

## Recommended Current Sprint Slice

If the project is starting from zero, the first active slice should be:

1. app shell/navigation
2. program locker
3. standalone program detail flow
4. routine completion flow
5. dashboard data update
6. card/trophy update
7. end-to-end QA pass

This order creates the shortest path to a real proof-of-concept app without prematurely adding future repository work.

## Definition of Done for the task list

The task list is complete when the app can demonstrate the proof-of-concept loop from start to finish, the core app states are stable, and the app is strong enough for founder validation without any dependency on website or resource repos.
