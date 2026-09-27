# Data Model: Reusable Workout Program Authoring

This model describes the logical entities needed for the feature. It does not prescribe concrete column types or migration ordering; those belong in implementation migrations and tasks. Rows representing published content or recorded history are immutable or versioned, while mutable catalog records remain traceable to their sources.

## Catalog entities

### Exercise

Canonical movement selectable by program writers.

- `id`: stable app-owned identity.
- `display_name`: canonical writer/user-facing name; required.
- `description`: optional movement description or instruction.
- `category`: optional normalized movement category.
- `primary_muscle_groups`: optional controlled labels.
- `equipment`: optional normalized equipment labels.
- `movement_pattern`: optional normalized pattern.
- `status`: `active` or `retired`; do not hard-delete exercises referenced by programs or history.
- `created_at`, `updated_at`.

An exercise may have multiple aliases and multiple source records. Similar names do not imply the same movement. Equipment, unilateral/bilateral form, range-of-motion variant, and materially different technique remain distinct exercises unless reviewed otherwise.

### ExerciseAlias

- `id`
- `exercise_id` → `Exercise`
- `alias`
- `normalized_alias`
- Optional source/provenance reference.

The same normalized alias cannot identify two canonical exercises without an explicit disambiguation rule.

### ExerciseSource

One externally sourced record connected to a canonical exercise.

- `id`
- `exercise_id` → `Exercise`
- `source_name`, `source_record_id`, `source_record_url`
- `source_revision` or import batch reference
- `license_name`, `license_url`, `license_text_or_notice`
- `attribution_text`, if applicable
- `imported_at`
- Optional retained source payload, limited to fields the source license permits storing and redistributing.

Unique source identity: (`source_name`, `source_record_id`, `source_revision`).

### ExerciseImportBatch

Auditable bulk ingest and normalization run.

- `id`
- `source_name`, `source_revision`, `license_review_status`
- `started_at`, `completed_at`
- `status`: `pending`, `importing`, `review_required`, `completed`, `failed`
- `records_seen`, `records_imported`, `duplicate_candidates`, `records_rejected`
- `error_summary`, if failed.

### ExerciseDuplicateCandidate

Human-reviewable possible match generated during import.

- `id`
- `import_batch_id` → `ExerciseImportBatch`
- `candidate_source_record_id`
- `matched_exercise_id` → `Exercise`, nullable until matched
- `similarity_reasons` (e.g. normalized name, equipment, muscle, instructions)
- `review_status`: `pending`, `same_exercise`, `alias`, `distinct`, `rejected`
- `reviewed_by`, `reviewed_at`, optional decision note.

Automated similarity is a candidate-generation signal only; it MUST NOT merge distinct exercises without review.

## Program authoring entities

### Program

Owner-authored purchasable program identity.

- `id`
- `name`, `description`, optional goal/marketing metadata.
- `status`: `draft`, `published`, `retired`.
- Current published version reference, if one exists.
- `created_by`, `created_at`, `updated_at`.

In v1, only authorized platform owner/team members may create, edit, or publish programs. No public creator marketplace or third-party uploads.

### ProgramVersion

Immutable published program definition; drafts may be edited before publication.

- `id`, `program_id` → `Program`
- `version_number`
- `status`: `draft`, `published`, `superseded`
- `duration_weeks`
- `training_days_per_week`
- `progression_method`: `%1RM`, `RPE`, `RIR`, or `STD`
- `progression_value`: required numeric value when the method needs it.
- `strength_formula`: versioned identifier, initially `lander-v1`.
- `effort_conversion_method`: versioned identifier for RPE/RIR tables or method.
- `created_by`, `created_at`, optional `published_at`.

Version number is unique within a program. Once published, a version's rows and progression rules cannot be mutated; publish a new version instead.

### ProgramScheduleRow

An exercise occurrence in one week/day of one program version.

- `id`, `program_version_id` → `ProgramVersion`
- `exercise_id` → `Exercise`
- `week_number`, `day_number`, `exercise_order`
- `progression_method`, `progression_value` (row-level override, otherwise inherited from version)
- `sets`
- `reps` or `rep_target_min`/`rep_target_max` according to the supported prescription form
- Optional rest duration, set label, coach cue/focus, and equipment/unit details.
- Optional prescribed percentage when the schedule uses `%1RM`.

Uniqueness: exercise occurrence order within a program version/week/day. Repeated use of the same exercise is allowed as distinct rows.

### ProgramEnrollment

A user-owned enrollment pinned to a published program version.

- `id`, `user_id`, `program_version_id` → `ProgramVersion`
- `status`: `active`, `completed`, `cancelled`
- `started_at`, optional `completed_at`
- `discovery_status`: `not_started`, `in_progress`, `complete`
- Optional immutable snapshot/reference to the user's schedule variant.

An enrollment's program version does not change when a new version is published. User-specific adjustments never update the shared `ProgramVersion`.

### UserProgramAdjustment

Auditable adjustment event/overlay for one enrollment and exercise occurrence scope.

- `id`, `enrollment_id` → `ProgramEnrollment`
- `exercise_id` → `Exercise`
- `trigger_workout_id` → `Workout`
- `trigger_set_result_id` → `WorkoutSetResult`
- `polarity`: `positive` or `negative`
- `previous_estimated_1rm`, `new_estimated_1rm`
- `effective_from_week`, `effective_from_day`
- `calculation_method_version`, `created_at`.

Keep adjustment history append-only. The current prescription is derived from the immutable source schedule plus ordered user adjustment events. Repeated adjustments can increase or decrease future loads. The precise increment/rounding rule is a calculation contract decision and must be tested before implementation.

## Workout and measurement entities

### Workout

- `id`, `enrollment_id` → `ProgramEnrollment`
- Scheduled week/day and program-version reference.
- `status`: `in_progress`, `completed`, `abandoned`
- `started_at`, optional `completed_at`
- Optional notes.

Only one active workout for the same enrollment/day should be allowed unless an explicit repeat-workout action creates a distinct record.

### WorkoutExercise

The performed occurrence of a scheduled exercise.

- `id`, `workout_id` → `Workout`
- `program_schedule_row_id` → `ProgramScheduleRow`
- `exercise_id` → `Exercise`
- `exercise_order`
- `flag_polarity`: nullable, `positive`, `negative`, or `mixed` (if set-level directions conflict).
- Optional adjustment trigger result reference.

### WorkoutSetResult

Set-level prescription snapshot and result; retain what the user was asked to do even if later adjustments change the future plan.

- `id`, `workout_exercise_id` → `WorkoutExercise`
- `set_number`
- `prescribed_load`, `prescribed_reps`, optional `prescribed_effort`
- `actual_load`: required during discovery; for subsequent workouts, record actual load if entered, otherwise effective load defaults to prescribed load.
- `completed_reps`
- `actual_effort_value`, `actual_effort_scale` (`RPE` or `RIR`), or a system-generated maximum value when the user falls short of prescribed reps.
- `tonnage_prescribed`, `tonnage_performed` (derived snapshot or deterministic calculation).
- `mismatch_reasons`, `flag_polarity`: nullable, positive, negative.
- `recorded_at`.

Set number is unique within a workout exercise. Effort scale follows that schedule row. On `%1RM` prescriptions, effort does not participate in load calculation or effort-only mismatch flags. On RPE/RIR prescriptions, an effort deviation can flag and supply polarity. A missed rep target records the scale maximum: RPE 10 or RIR 0.

### StrengthEstimate

- `id`, `enrollment_id` → `ProgramEnrollment`
- `exercise_id` → `Exercise`
- `source_workout_id`, `source_set_result_id`
- `estimated_1rm`
- `load`, `reps_input`, optional `effort_input`
- `method`, `method_version`
- `created_at`.

Estimates are append-only so the app can explain current prescriptions and graph progression. The required Lander calculation uses load and reps; do not include effort in `%1RM` calculations. Research limitations and supported rep bounds are described in `research.md`.

## User anthropometrics and photos

### WorkoutBodyMeasurement

- `id`, `user_id`
- `workout_id` → `Workout`
- `bodyweight_value`, `bodyweight_unit` (`kg` or `lb`)
- `body_composition_percent`
- `recorded_at`.

The app requests selectable bodyweight and body-composition values with each workout; enforce positive bodyweight and a percentage in the range 0–100.

### AnthropometricMeasurement

- `id`, `user_id`, optional `workout_id`
- `metric_key`, `value`, `unit`
- `recorded_at`.

Supports baseline values and later comparative point details without tying measurement series to unrelated exercise graphs.

### ProgressPhoto

- `id`, `user_id`, optional `workout_id` / measurement reference
- Private object-storage key, not a public URL
- `recorded_at`, optional caption.
- Sharing state defaults to `private`; explicit sharing requires a distinct opt-in state.

Photo bytes reside in private object storage; metadata and ownership reside in the database. User deletion removes both metadata and the corresponding object.

## Core relationships

- One `Exercise` can have many aliases and source records, and can occur in many schedule rows.
- One `Program` has ordered `ProgramVersion` records; each version has many schedule rows.
- One user can have many enrollments; an enrollment pins one program version and has workouts, strength estimates, and user-specific adjustment events.
- One workout has workout-exercise occurrences; each occurrence has ordered set results.
- One user workout may have a body measurement and optional progress photos.
- User-level RLS scopes enrollment, workout, measurement, estimate, adjustment, and photo reads/writes to the owning user; authoring/import operations are restricted to authorized platform staff.

## Lifecycle and deletion rules

- Draft program versions are editable; published versions are immutable; later edits create another version.
- Exercises referenced by a published program or historical workout are retired, not deleted.
- Adjustment history and workout set snapshots remain unchanged when future prescriptions are recalculated.
- User account deletion cascades or schedules permanent deletion of owned records and private photo objects, consistent with the product's deletion promise.
- Source license/provenance records remain attached to imported catalog entries through correction and retirement.
