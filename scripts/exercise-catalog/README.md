# Exercise catalog import

This tool imports approved, text-only exercise datasets into the app-owned catalog. It does not fetch exercise data at runtime and does not import exercise images.

## Safety and licensing

- Review source terms and populate `licenseGate.ts` with an explicit approval before importing.
- Keep source repository, revision, license, and record identifiers in the import output.
- Never pass a Supabase service-role key to the Expo app. Import tooling may use a restricted, local operator credential; do not commit it.
- Exercise text and instructions must be reviewed for redistribution rights. Exclude image references and files.

## Development

Install tool dependencies with `npm install` in this directory. Run `npm test` for importer tests. The importer accepts a source fixture or downloaded dataset path, writes a normalized JSON report, and does not mutate the hosted catalog unless a separately configured staff import action is used.

The yuhonas source adapter is limited to `exercises.json` text fields. Duplicate similarity creates review candidates; it never merges exercises automatically.
