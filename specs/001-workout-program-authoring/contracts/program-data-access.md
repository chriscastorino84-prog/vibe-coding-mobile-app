# Program Data Access and Privacy Contract

## Roles

- **Program user**: reads published program versions; reads/writes only their enrollment, workout, set results, measurements, strength estimates, user-specific adjustments, and private photos.
- **Program writer/platform staff**: creates and edits draft content, reviews catalog imports, and publishes immutable program versions.
- **Unauthenticated visitor**: may only view information explicitly designated public in the product's program preview; no access to private user records.

## Program lifecycle

- Program schedule data is grouped by immutable published version.
- Enrolling pins the user to the selected published version.
- Program edits are made in a draft and published as a new version.
- Existing enrollments remain pinned unless the user explicitly chooses a supported migration flow.
- Per-user automatic adjustments apply only to that enrollment and do not mutate the shared version or other users' prescriptions.

## Authorization and data boundaries

- Require authenticated identity for user progress data.
- Enforce row-level authorization at the data service, not only in UI navigation.
- A user cannot read or mutate another user's enrollment, workouts, body measurements, strength estimates, adjustment history, or photos.
- Staff-only catalog import and program-publish permissions must not be granted to ordinary program users.
- Progress photos use private object storage and short-lived authorized access; public bucket access is not allowed by default.
- User deletion removes the user's progress records and photo objects; shared exercise catalog and published program content are not deleted as part of an individual account deletion.

## Progression calculation record

Every estimate and future-load adjustment must retain the source set, inputs, calculation method/version, output estimate, and adjustment event. Replaying a workout-save operation must not create a duplicate adjustment event. A set result captures the prescription active when that workout occurred, even if later workouts revise future weights.

## Error behavior

- A failed save or calculation must be surfaced as an error and must not be presented as a successful workout completion.
- Retry must not duplicate a workout, set result, or adjustment.
- If photo storage fails, workout and measurement saves remain usable and the photo failure is reported separately.
- If catalog source/license review is absent, import/publication is blocked rather than silently accepted.
