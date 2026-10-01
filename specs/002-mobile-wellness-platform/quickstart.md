# Quickstart Validation Guide

## Prerequisites

- Staging Fitness-Applied API with a pinned content package containing the three launch programs, six calculators, recipes, shopping-list templates, and trophy definitions.
- Staging app backend with email, Apple, and Google authentication.
- iOS and Android test devices or simulators.
- Separate test accounts for user isolation and deletion tests.

## External setup checklist

The following steps require owner accounts or approval and cannot be completed by local code changes:

1. Create an Expo account and run `npx eas login` from `apps/mobile`.
2. Confirm the permanent identifiers in `apps/mobile/app.json` before the first store build.
3. Create staging and production Supabase projects; apply migrations with the Supabase CLI or dashboard.
4. Configure Supabase email authentication, Apple provider, and Google provider.
5. Set `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `EXPO_PUBLIC_CONTENT_API_URL` as EAS environment variables.
6. Approve and publish the warm-up and cool-down Fitness-Applied packages to staging.
7. Create Apple Developer and Google Play Console app records using the identifiers in `app.json`.
8. Provide a public privacy policy, terms, support URL, and web account-deletion URL.
9. Complete Apple privacy details and Google Play Data Safety/account-deletion declarations.
10. Run `npm run release:preflight`, then create preview builds with `eas build --profile preview --platform all`.

The `supabase/functions/delete-account` function must be deployed with the
Supabase service-role secret held only in the server environment. It must never
be added to an Expo environment variable or mobile build.

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
