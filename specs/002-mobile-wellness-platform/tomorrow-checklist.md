# Tomorrow's implementation checklist

## Decisions and access needed from the owner

- [ ] Confirm the public app name and permanent iOS bundle identifier / Android package name.
- [ ] Create or provide access to Apple Developer, Google Play Console, Expo/EAS, Supabase, and Cloudflare accounts.
- [ ] Configure Apple and Google OAuth credentials and redirect URLs.
- [ ] Provide the approved privacy policy, terms, support contact, and wellness disclaimer URLs/text.
- [ ] Approve publishing the first warm-up and cool-down packages to Fitness-Applied staging.
- [ ] Provide the desired cool-down exercise sections, or approve authoring them from a supplied routine.

## Engineering work that can continue without owner input

- [ ] Complete the SQLite repositories and sync engine around the new local database.
- [ ] Add contract tests for published, draft, invalid-hash, and incompatible content packages.
- [ ] Connect app startup to local database migration and last-known-good content loading.
- [ ] Add Supabase authentication screens and session restoration.
- [ ] Add the first published-content staging fixture after publication approval.
- [ ] Replace the hard-coded program source with the Fitness-Applied content repository.
- [ ] Build the warm-up/cool-down offline workout vertical slice.
- [ ] Add physical-device checks for iOS and Android preview builds.

## Release gates

- [ ] No service credentials in mobile builds.
- [ ] Draft content is never returned by the production content API.
- [ ] Offline workout recording and idempotent synchronization pass.
- [ ] Account deletion removes user records, queued operations, and private photos.
- [ ] Accessibility, privacy disclosures, and store metadata are complete.
- [ ] TestFlight and Google Play internal-testing builds pass review.
