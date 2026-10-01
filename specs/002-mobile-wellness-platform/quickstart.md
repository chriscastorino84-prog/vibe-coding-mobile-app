# Quickstart Validation Guide

## Prerequisites

- Staging Fitness-Applied API with a pinned content package containing the three launch programs, six calculators, recipes, shopping-list templates, and trophy definitions.
- Staging app backend with email, Apple, and Google authentication.
- iOS and Android test devices or simulators.
- Separate test accounts for user isolation and deletion tests.

## Validation scenarios

1. **Authentication**: create an account with email, Apple, and Google; restore a session; sign out; reset a password.
2. **Content sync**: download a package, verify its version/hash, reopen it offline, and show last-known-good status when the service is unavailable.
3. **Programs**: start each free program, preview schedules, complete workouts, save offline, reconnect, and verify exactly one server record per operation.
4. **Cycle locking**: complete a cycle, reopen it read-only, verify trophies/photos/analytics, and start an independent second cycle.
5. **Calculators**: run all six tools offline, reject invalid inputs, and display method/version/limitations.
6. **Recipes and shopping list**: read recipes offline and generate/save/share a printable shopping-list file.
7. **Analytics**: verify selected-exercise trends, bodyweight, composition, trophies, and photo highlights; verify empty states.
8. **Privacy**: verify user A cannot access user B’s records or private photos; verify optional photo cancellation does not block workout save.
9. **Deletion/export**: export supported data, delete the account in-app, verify cloud rows and photo objects are removed, and verify pending sync operations are cancelled.
10. **Accessibility**: test VoiceOver/TalkBack, dynamic text, contrast, touch targets, and reduced motion.
11. **Store readiness**: create preview and production builds from clean environments, verify no secret keys are embedded, and complete permission/privacy disclosures.

## Expected result

All scenarios pass on both launch platforms. Any Fitness-Applied API compatibility failure, sync rejection, privacy violation, or unhandled error blocks release.
