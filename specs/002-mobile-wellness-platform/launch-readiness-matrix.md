# Launch readiness matrix

This matrix separates work that can be completed in the repository from work
that requires the founder's external accounts, approvals, or deployed
environments.

## Founder-owned actions

These cannot be completed by a repository-only agent:

- Create or confirm Expo/EAS, Apple Developer, and Google Play Console accounts.
- Confirm permanent store identifiers, app name, support URL, privacy policy URL,
  terms URL, and account-deletion URL.
- Create staging and production Supabase projects and configure billing,
  redirect URLs, email delivery, Apple OAuth, and Google OAuth.
- Deploy Supabase migrations, storage policies, and the account-deletion
  function using server-only secrets.
- Confirm the legal approval, attribution, and publication authorization for the
  Kaggle/CrossFit WOD content.
- Publish the reviewed Fitness-Applied content package and provide its immutable
  package hash and version.
- Create store listings, privacy nutrition labels, Google Play Data Safety
  declarations, screenshots, age rating, and reviewer notes.
- Test preview and production builds on physical iOS and Android devices and
  approve store submissions.

## Agent-executable now

These can be completed with the current repository and local dependencies:

- Build the requirements-to-release inventory and keep task status current.
- Add local typecheck, unit-test, contract-test, and release-preflight commands.
- Add contract fixtures and tests for WOD category, marketplace metadata,
  attribution, and deterministic importer output.
- Improve the Kaggle exporter and validate a pinned CSV locally.
- Complete app-side content mapping, category filtering, cache behavior, and
  user-visible error states.
- Complete app-side auth/session screens, workout flows, calculators,
  analytics, export, deletion orchestration, and accessibility fixes where the
  required backend contract already exists.
- Add release documentation, rollback procedures, acceptance checklists, and
  post-launch support procedures.

## Gated after founder actions

These require the external actions above before they can be completed or
verified:

- T006-T008: staging Supabase migrations, providers, RLS, storage, and deletion
  integration tests.
- T020-T025: publishing and verifying the WOD package against the real content
  service.
- T049-T054: physical-device acceptance, store metadata, production
  configuration, signed builds, and release sign-off.
- Final production smoke tests that depend on real Auth, content API, storage,
  and deletion deployments.

## Recommended order

1. Complete agent-executable local work in T001-T005, T009-T011, T012-T016,
   T017-T019, T021, T023-T024, T026-T044, and T045-T048.
2. Founder completes external setup and approvals for T006-T008.
3. Agent and founder jointly run T020-T025 against staging.
4. Founder supplies store assets and URLs; agent prepares T051-T055.
5. Run T049-T054 on physical devices and submit only after T054 is signed.

## Current baseline

The repository has existing uncommitted work across the mobile app, Supabase
migrations, program authoring, and WOD importer. Review those changes before
marking any implementation task complete; this matrix does not assume that
uncommitted code has passed release validation.
