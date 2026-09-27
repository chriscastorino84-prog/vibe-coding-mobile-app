# Feature Specification: Reusable Workout Program Authoring

**Feature Branch**: `001-workout-program-authoring`

**Created**: 2026-09-27

**Status**: Draft

**Input**: User description: Replace hard-coded workout programs with reusable, owner-authored programs built from an exercise catalog, individualized strength-based progression, workout tracking, and progress dashboards.

## Clarifications

### Session 2026-09-27

- Q: Should the exercise catalog start with a small, curated set of sources whose reuse rights and data quality are verified, rather than collecting as many databases as possible? → A: Start with a small, curated set and add sources only after checking their rights, quality, and overlap.
- Q: Should the discovery workout collect the actual load lifted for each set, in addition to completed reps and RPE/RIR? → A: Discovery records load, reps, and the programmed effort measure for each set; the writer sets the number of sets. When progression is `%1RM`, effort scores are not used to calculate future weight prescriptions.
- Q: What should count as a “high effort” score when a set is below its prescribed tonnage and may receive a negative flag? → A: When a user falls short of the prescribed set performance, the set's effort is automatically recorded at the maximum for its scale: RPE 10 or RIR 0.
- Q: When two consecutive workouts flag the same exercise in the same direction, how should the app calculate that exercise’s new weight prescriptions for the remaining program? → A: Automatically recalculate the user's remaining prescriptions for that exercise as a personalized variation of the original program. This adjustment can decrease or increase future weights when later consecutive workout flags meet the same adjustment criteria.
- Q: If a user completes the prescribed reps but reports an RPE/RIR different from the target, should that set count as a mismatch? → A: Yes. An effort difference can flag the exercise only when RPE/RIR is the programmed metric for calculating that exercise's weight. For RPE/RIR-based prescriptions, load, reps, and actual effort may be converted to a new percentage of maximum strength to recalculate future weights up or down. For `%1RM`-based prescriptions, effort differences do not flag or affect weight calculations.
- Q: How should the discovery workout handle Lander's requirement for reps performed to failure when calculating `%1RM` prescriptions? → A: Use the reps actually recorded for the final discovery set as-is, do not require the user to reach failure, and label the resulting strength value as an approximate estimate.

## User Scenarios & Testing

### User Story 1 - Author and publish a reusable program (Priority: P1)

As a program writer, I want to compose, review, save, and publish a structured program without writing code, so that I can create new programs and refine their schedules independently of the app release cycle.

**Why this priority**: Creating reusable program content is the foundation for all user-facing plans and progression.

**Independent Test**: A program writer can select catalog exercises, set initial progression and schedule values, generate the program schedule, edit its rows, save it, and publish it without changing application code.

**Acceptance Scenarios**:

1. **Given** an available exercise catalog, **When** the writer selects an exercise, progression style, progression value, program duration, training days per week, sets, and reps, **Then** the system accepts the setup and generates rows for the configured weeks and training days.
2. **Given** a generated program, **When** the writer reviews it, **Then** the schedule is grouped by week and day and the writer can edit row-level exercise and prescription values before saving.
3. **Given** a saved program ready for distribution, **When** the writer publishes it, **Then** eligible program users can access the published version and new edits do not silently change a user's already-started program.
4. **Given** incomplete or invalid program setup, **When** the writer attempts to generate or publish it, **Then** the system identifies the fields that need correction and preserves the writer's entered information.

### User Story 2 - Preview a personalized program (Priority: P1)

As a program user, I want to preview the full program and then see the individualized weight prescriptions after completing strength discovery, so that I can understand the plan and prepare for each workout.

**Why this priority**: Users need a clear, trustworthy view of the plan and how their own strength informs prescribed loads.

**Independent Test**: A user can open a program, view its complete schedule before discovery, complete discovery by recording load, reps, and the programmed effort measure for each set, and view prescribed loads in the complete plan, week view, and day view.

**Acceptance Scenarios**:

1. **Given** a user has opened a program but has not completed its discovery workout, **When** they preview it, **Then** they can see the complete schedule and prescribed sets and reps without seeing calculated load prescriptions.
2. **Given** a non-standard progression program with an uncompleted first week, **When** the user views that week, **Then** its planned weight selections are empty for each set.
3. **Given** a user has completed the first discovery workout, **When** they preview the plan, **Then** the system shows individualized load prescriptions wherever the program uses a non-standard progression.
4. **Given** a user views a program, **When** they switch among full-program, week, and day views, **Then** the same schedule and current prescriptions are represented consistently.

### User Story 3 - Record workouts and adapt prescriptions (Priority: P1)

As a program user, I want to record each set and have repeated performance mismatches adjust future prescriptions for that exercise, so that the program responds to my demonstrated performance.

**Why this priority**: Reliable workout logging and individualized adjustment are central to the feature's value.

**Independent Test**: A user can complete a workout, record the set results, see an exercise flagged when a set mismatches its prescription, and verify that two consecutive workouts with the same flag polarity result in revised prescriptions for that exercise for the remainder of the program.

**Acceptance Scenarios**:

1. **Given** a discovery workout, **When** the user completes a set, **Then** they can record the actual load used, completed reps, and the programmed effort measure (RPE or RIR).
2. **Given** a `%1RM`-based prescription, **When** discovery results are used to calculate future weight prescriptions, **Then** the system uses load and reps and does not use the effort score in those calculations.
3. **Given** an active workout, **When** the user completes a set, **Then** they can record completed reps and actual effort using RPE or RIR according to the prescribed method.
4. **Given** one set in an exercise misses its prescribed rep count, **When** the workout is saved, **Then** the exercise is flagged for that workout even if its other sets match.
5. **Given** a set's performed tonnage exceeds its prescribed tonnage, **When** the mismatch is evaluated, **Then** that exercise receives a positive flag for the workout.
6. **Given** RPE or RIR is the programmed weight-calculation metric and actual effort differs from prescribed effort, **When** the workout is saved, **Then** the exercise is flagged; lower RPE or higher RIR than prescribed indicates positive performance, while higher RPE or lower RIR indicates negative performance, and load, reps, and effort may be converted to a new strength percentage for future prescriptions.
7. **Given** RPE or RIR is not the programmed weight-calculation metric, **When** actual effort differs from target, **Then** that difference does not flag the exercise or affect its weight calculations.
8. **Given** the user completes fewer reps than prescribed, **When** the set is recorded, **Then** the effort is automatically recorded at maximum (RPE 10 or RIR 0), and a below-prescription tonnage set receives a negative flag.
9. **Given** the same exercise receives the same flag polarity in two consecutive workouts, **When** the second workout is saved, **Then** the system creates or updates that user's personalized variation of the program by recalculating only that exercise's remaining prescriptions using the latest flagged-set results.
10. **Given** an exercise's future prescriptions were adjusted downward, **When** later consecutive workouts meet the positive adjustment criteria, **Then** the system can adjust the remaining prescriptions upward; adjustments may continue in either direction when the criteria are met.
11. **Given** a workout has been recorded, **When** the user revisits it, **Then** the saved set results and resulting flags remain available.

### User Story 4 - Review performance and body-composition trends (Priority: P2)

As a program user, I want to compare my projected and actual performance and track optional body measurements over time, so that I can assess progress throughout the program.

**Why this priority**: Longitudinal feedback makes the program's individualized progression visible and useful.

**Independent Test**: A user can view a selected exercise's projected and actual performance together, record bodyweight and body-composition percentage at workouts, and view their measurement trends; optional photos remain private unless the user explicitly shares them.

**Acceptance Scenarios**:

1. **Given** the user has completed strength discovery for an exercise, **When** they view its dashboard graph, **Then** projected and actual performance are shown as separate lines for that exercise.
2. **Given** a workout is being recorded, **When** the user supplies bodyweight and body-composition percentage, **Then** those values are associated with that workout and available in their measurement trend views.
3. **Given** the user adds an optional progress photo, **When** it is saved, **Then** it is private by default and can be reviewed with the user's measurement history.
4. **Given** a measurement graph point has associated baseline anthropometric measurements, **When** the user inspects that point, **Then** the comparative measurements are shown for the selected exercise measurement context.

### Edge Cases

- A program setup with zero weeks, zero training days, zero sets, or invalid rep values cannot be generated or published.
- An exercise used in a saved program is later removed from the active catalog; existing program schedules and workout history remain understandable.
- A user's discovery workout is incomplete; future non-standard load prescriptions remain unavailable until sufficient discovery data is recorded.
- A user misses a workout or logs fewer sets than prescribed; the system preserves the actual workout record and does not invent completion data.
- The same exercise appears more than once in a day; each programmed occurrence and its workout results remain distinguishable.
- A repeated flag occurs at the end of a program or on its final scheduled workout; no nonexistent future prescriptions are created.
- An optional photo upload fails or is cancelled; workout and measurement data remain usable without a photo.
- The user has no baseline measurements or no completed workouts; graph views explain the absence of comparative data.
- A previously started program is edited and republished; existing users retain the version they started while new users receive the published version.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST provide program writers with a searchable exercise catalog from which they can select exercises for a program.
- **FR-002**: The system MUST allow authorized platform owners or team members to define a program without writing or changing application code.
- **FR-003**: Program setup MUST capture exercise, progression style (`%1RM`, `RPE`, `RIR`, or `STD`), numeric progression value, total weeks, training days per week, writer-selected set count, and prescribed reps.
- **FR-004**: On confirmation of program setup, the system MUST generate a schedule organized by week and training day using the setup values as defaults.
- **FR-005**: Before saving or publishing, the system MUST allow writers to edit schedule rows independently, including row-level prescription values.
- **FR-006**: The system MUST allow writers to save a program draft, revise it, and publish a version for program users.
- **FR-007**: The system MUST preserve the published version used by a user who has already started a program when a later version is published.
- **FR-008**: The system MUST support full-program, week, and day views for program users.
- **FR-009**: Before discovery is complete, the system MUST show the program plan without individualized load prescriptions; after discovery, it MUST show the user's calculated prescriptions where applicable.
- **FR-010**: For non-`STD` programs, the first program week MUST be a strength-discovery week with no prescribed weight selections. `STD` programs MUST not require this discovery week.
- **FR-011**: The system MUST calculate an approximate estimated one-repetition maximum using the Lander formula, `1RM = 100 × weight / (101.3 - 2.67123 × reps)`, using the actual load and reps recorded for the final discovery set of each exercise. The system MUST NOT require that set to reach failure and MUST label the output as an approximate estimate.
- **FR-012**: The system MUST convert applicable `RPE` and `RIR` prescriptions to estimated percentages of maximum strength using a documented conversion method based on the cited resistance-training-specific RPE research.
- **FR-013**: During discovery, the system MUST collect actual load, completed reps, and the programmed effort measure (RPE or RIR) for every set. In subsequent workouts, it MUST collect completed reps and the programmed effort measure for every set.
- **FR-013a**: For `%1RM`-based prescriptions, the system MUST calculate discovery-based strength estimates from actual load and reps and MUST NOT use effort scores in those weight-prescription calculations.
- **FR-014**: The system MUST flag an exercise for a workout when any set's completed reps differ from prescribed reps. When `RPE` or `RIR` is the programmed weight-calculation metric, effort differing from target MUST also flag the exercise. Lower actual RPE or higher actual RIR than prescribed MUST count as positive performance; higher actual RPE or lower actual RIR MUST count as negative performance. Effort differences MUST NOT flag `%1RM`-based prescriptions.
- **FR-015**: The system MUST flag an exercise positive when a set's performed tonnage (actual load multiplied by completed reps) is greater than its prescribed tonnage.
- **FR-016**: When a user completes fewer reps than prescribed, the system MUST automatically record maximum effort (RPE 10 or RIR 0) for that set. The system MUST flag an exercise negative when a set's performed tonnage is less than prescribed tonnage and the user has fallen short of the prescribed reps.
- **FR-017**: When the same exercise has the same flag polarity in two consecutive workouts, the system MUST automatically create or update a user-specific program variation by recalculating only that exercise's prescriptions for the remaining program using the latest flagged-set results.
- **FR-017a**: The system MUST allow user-specific future prescriptions to be adjusted either downward or upward when subsequent consecutive workout flags meet the corresponding adjustment criteria.
- **FR-017b**: User-specific prescription changes MUST NOT alter the source program or the schedules and results of other users.
- **FR-017c**: For an exercise using `RPE` or `RIR` to calculate weight, the system MUST be able to use actual load, reps, and effort through the programmed effort-to-percentage conversion to re-estimate strength and update remaining weights in either direction. For `%1RM` prescriptions, effort scores MUST NOT be used in weight calculations.
- **FR-018**: The system MUST retain workout set results, flags, and prescription adjustments as part of the user's program history.
- **FR-019**: The system MUST provide a program dashboard with a projected and actual performance comparison for each selected exercise.
- **FR-020**: The system MUST collect user-selected bodyweight and body-composition percentage with every workout and allow users to view their changes over time.
- **FR-021**: The system MUST allow users to add optional progress photos and MUST keep them private by default unless the user explicitly shares them.
- **FR-022**: The system MUST allow a user to inspect graph collection points for available anthropometric values and comparisons against their baseline.
- **FR-023**: The app MUST provide and host its own searchable exercise catalog, populated by importing exercise data from a small, curated set of sources whose reuse rights and data quality have been verified. External datasets are source material for building the app's catalog, not runtime dependencies or remotely queried exercise lists.
- **FR-024**: The catalog import process MUST normalize source records, identify likely duplicates and aliases, and retain source and usage-rights provenance. The platform owner or team MUST be able to review import results and correct catalog records while preserving already-published program and workout references; manual entry of the full exercise catalog is not a prerequisite for launch.
- **FR-025**: The system MUST protect user workout, measurement, and photo data; photos MUST remain private by default, and account history and photos MUST be permanently deletable on user request.

### Key Entities

- **Exercise**: A canonical movement in the app-hosted catalog with a display name, aliases, descriptive attributes, and source and usage-rights provenance where imported.
- **Program**: A platform-authored offering with metadata, lifecycle status, and one or more immutable published versions.
- **Program version**: A revision of a program containing duration, weekly schedule, progression configuration, strength calculation method, and unlock conditions applicable to that version.
- **Program schedule row**: A version-specific exercise occurrence assigned to a week and day with progression style, progression value, sets, reps, and weight prescription rules.
- **Program enrollment**: A user's participation in a specific published program version, including discovery state and individualized prescriptions.
- **Workout and set result**: A scheduled exercise performance and its per-set prescribed values, actual load, completed reps, effort rating, mismatch flag, and any prescription adjustment reference.
- **Strength estimate**: An exercise-specific estimate derived from recorded discovery performance and used to calculate individualized loads.
- **Body measurement**: A user's bodyweight, body-composition percentage, and optional baseline comparisons associated with a workout date.
- **Progress photo**: An optional, user-owned image associated with a workout or measurement point, private by default.
- **Exercise data source**: An external dataset used to populate the app-hosted exercise catalog, with provenance and permitted-use information retained for imported records.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A program writer can create, save, and publish a program with at least one exercise without changing application code.
- **SC-002**: Every generated schedule contains the configured number of weeks and training days, and every generated row can be reviewed and edited before publication.
- **SC-003**: In acceptance testing, all four progression styles can be selected and produce the expected discovery-week behavior and user-facing view; discovery records load, reps, and the programmed effort measure per set.
- **SC-004**: In acceptance testing, a single mismatching set flags its exercise, while two consecutive workouts with the same polarity trigger a future prescription update only for that exercise.
- **SC-005**: A program user can find their full plan, any selected week, and any selected day without differences in the underlying schedule or current prescriptions.
- **SC-006**: A user can see projected and actual performance for a selected exercise after discovery and review recorded bodyweight and body-composition trends.
- **SC-007**: All optional progress photos are private by default, and a user-requested account deletion removes their history and photos permanently.
- **SC-008**: The initial exercise catalog can be populated from verified source datasets, normalized and deduplicated for program writing, and remains available to the app without querying those sources at runtime.

## Assumptions

- Programs are authored by the platform owner or team only; this feature does not introduce a public creator marketplace or third-party program uploads.
- Programs remain discrete purchasable offerings within the existing product model; pricing and checkout changes are outside this feature.
- New and republished program versions do not silently rewrite the version already started by an enrolled user.
- External exercise datasets are used to assemble the app's own hosted catalog, not to provide runtime exercise lookup. The catalog is populated through imports and normalization rather than requiring the owner to manually enter every exercise. Imports will not include images unless separately approved; data may only be imported and distributed when source usage rights permit it.
- The first week of a non-`STD` program is used for strength discovery; users must provide enough performed-load, rep, and effort data to calculate a strength estimate before individualized prescriptions can be shown.
- Outside discovery, actual set load is assumed to equal the prescribed load because workout set entry consists of completed reps and effort; the prescribed load is used when comparing set tonnage.
- User-reported bodyweight and body-composition percentage are collected with each workout; progress photos are optional. No clinical diagnosis or treatment use is intended.
- The Lander formula is `1RM = 100 × weight / (101.3 - 2.67123 × reps)`. Use the final discovery set's recorded reps without requiring failure; because this differs from the formula's reps-to-failure assumption, label the result as an approximate estimate. RPE and RIR conversion research reference: Zourdos MC, Klemp A, Dolan C, et al. "Novel Resistance Training-Specific Rating of Perceived Exertion Scale Measuring Repetitions in Reserve." *J Strength Cond Res.* 2016 Jan;30(1):267-75. doi: 10.1519/JSC.0000000000001049.
- Existing hard-coded programs remain as currently available until a separately approved migration or replacement approach is defined.
