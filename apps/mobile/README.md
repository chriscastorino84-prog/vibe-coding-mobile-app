# Vibe Coding Mobile App

## Local development

1. Install app dependencies with `npm install` from `apps/mobile`.
2. Copy `.env.example` to `.env` and provide the Supabase project URL and public anon/publishable key for a development project.
   Set `EXPO_PUBLIC_CONTENT_API_URL` to the staging Fitness-Applied content API.
3. Never place a Supabase service-role key in the Expo app. Client permissions must be enforced by database row-level security.
4. Start Expo with `npm start`; use `npm run web`, `npm run ios`, or `npm run android` for a target platform.
5. Run `npm test` and `npm run typecheck` before submitting changes.

Cloud-backed feature flows require a configured Supabase project. The app's `.env` file is ignored by Git.

## EAS environments

- `development` is for local development builds and uses the development channel.
- `preview` is for internal device testing and uses the preview channel.
- `production` is reserved for store-submission builds.

Only `EXPO_PUBLIC_*` values belong in the Expo app. Never place Supabase service-role keys,
OAuth client secrets, or content publication credentials in this repository or an app build.
