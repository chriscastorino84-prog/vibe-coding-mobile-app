# Phase 3 Backlog: App Polish, Pilot Validation, and Founder Demo Readiness

**Status**: Ready for execution
**Date**: 2026-09-24

## Purpose

This backlog converts the approved Phase 3 direction into an execution-ready list of work. It is organized by priority so the team can move from the proof-of-concept app toward a polished, pilot-ready experience without drifting into future website or resource repo work.

## Backlog Priorities

### P0 — Must complete before pilot/demo validation

1. Build app shell and navigation
   - Create the core app structure and route flow
   - Ensure the app can move cleanly between locker, program detail, workout flow, dashboard, and card views
   - Acceptance: the app has a stable navigation flow and no broken core route paths

2. Build Program Locker
   - Create the home screen with card-grid layout for programs
   - Show seeded program entries for warm-up, macro-cycle, and cool-down
   - Acceptance: user sees a coherent locker and can open a program from it

3. Build standalone program detail flow
   - Add description page and Start CTA for each program
   - Ensure each program works independently of the others
   - Acceptance: user can open any standalone program without entering another program first

4. Build routine/workout completion flow
   - Build the workout entry form and completion action
   - Support exercise and set input for the proof-of-concept session
   - Default incomplete numeric values to zero at completion
   - Acceptance: user can complete a session and finish a core loop flow

5. Implement shared analytics layer
   - Build tonnage calculation utilities
   - Produce dashboard-ready, unit-aware data for tonnage, every exercise, and anthropometric measurements
   - Acceptance: analytics are centralized and reused in the app

6. Update dashboard from completion event
   - Trigger the data update path when a routine is completed
   - Ensure the dashboard displays a real workout point after completion
   - Acceptance: dashboard reflects the completion without manual refresh or custom UI logic

7. Build program card and trophy state
   - Create card UI with stats, graph, and photo slot
   - Hide trophy until earned and reveal it on completion
   - Acceptance: card and trophy states align to real completion data

8. Validate core loop end-to-end
   - Run the main proof-of-concept flow from locker → program → completion → dashboard/card update
   - Acceptance: the MVP loop works reliably and predictably

9. Stabilize empty/loading/error states
   - Handle empty program state, loading states, and error flows
   - Acceptance: app feels stable and understandable even in incomplete states

### P1 — Important for founder/demo readiness

10. Improve visual polish and hierarchy
    - Clean up spacing, typography, buttons, and card structure
    - Acceptance: app feels intentional and product-like rather than rough prototype

11. Improve program start UX
    - Clarify copy and CTA flow for starting a program
    - Acceptance: users understand what happens when they start a routine

12. Refine dashboard presentation
    - Improve metric readability and graph presentation
    - Acceptance: dashboard feels interpretable and motivating

13. Improve program card readability
    - Refine card layout and trophy visibility states
    - Acceptance: card reads clearly and supports the product story

14. Add QA pass for app reliability
    - Test common edge cases and broken paths
    - Acceptance: major user flows are validated before pilot/demo

15. Prepare data model for future API integration
    - Keep data contracts clean and future-ready
    - Acceptance: app data is structured so external content can be supported later without redesign

### P2 — Deferred but planned

16. Build low-fidelity Resources locker placeholder
   - Keep as a placeholder screen or simple content container
   - Acceptance: concept is visible without reworking the current product flow

17. Define future content/API contract
   - Document the basic external data contract for future resource integration
   - Acceptance: future integration path is already understood and not blocked by app design

18. Prepare architecture notes for future repo separation
   - Capture repository boundaries and external dependencies
   - Acceptance: future work can be planned without redesigning the current app

## Dependencies

- App shell and navigation must be built before locker and program flows
- Program data model must exist before workout and dashboard logic
- Completion event pipeline must be established before card and trophy logic are finalized
- QA should happen after the core completion loop is functional

## Definition of Done for the backlog

This backlog is complete when the app has a stable proof-of-concept loop and is demonstrably ready for founder validation. Future resource repos and website content are explicitly deferred and not required for this phase.
