# Research: Reusable Workout Program Authoring

**Branch**: `001-workout-program-authoring`

## Decisions

### App-hosted exercise catalog populated by imports

**Decision**: Store the searchable exercise catalog in the app's own managed database. Import a limited number of vetted external datasets as source material; normalize records, identify duplicate candidates and aliases, and retain source/license provenance. Do not query public datasets at runtime. Exclude upstream images.

**Rationale**: The product needs a stable exercise list that owners can distribute with programs without relying on a third-party service's uptime or schema. Bulk import meets the owner's stated goal of not manually creating every exercise, while source review and aliasing reduce duplication and preserve traceability.

**Candidate first source**: `yuhonas/free-exercise-db` advertises 800+ exercises and provides structured JSON fields such as name, equipment, level, muscle groups, category, and instructions. Its repository includes an Unlicense. The upstream `wrkout/exercises.json` repository also uses an Unlicense and is identified as the source of the yuhonas restructured dataset. Use at most one of these as the first import; ingesting both as independent catalogs would duplicate source content.

The Unlicense grants broad permissions to copy, modify, publish, distribute, sublicense, and sell the work, with no attribution requirement in its text. Even so, preserve attribution/provenance as a product practice and review the actual records and repository notices before distribution; a dataset license cannot independently verify every contributor's authority over contributed prose. Do not ingest exercise images: the upstream contribution documentation warns that exercise images were scraped and are not available for commercial-project use.

**Normalization and duplicate review**:

- Keep the external record's source identifier, source name, source version/revision, and license/provenance metadata.
- Map source fields into a canonical exercise record; retain the original source payload or an auditable import snapshot only as allowed by its terms.
- Generate likely-duplicate candidates using normalized names, equipment, target muscles, movement category, and instruction similarity; do not merge records on name similarity alone.
- Preserve variant distinctions (for example, equipment or unilateral/bilateral variants) and represent aliases separately from canonical exercise identity.
- Make uncertain matches reviewable; merge, alias, or retain as distinct with a recorded decision.
- Allow the owner/team to correct imported records, but never rewrite exercise references in published program versions or workout history when the active catalog entry is edited or retired.

**Alternatives considered**:

- Manually author the entire catalog: rejected because the owner explicitly does not want to construct the list by hand.
- Query one or more public exercise APIs at runtime: rejected because app behavior would depend on external uptime, rate limits, schema changes, and external distribution/availability decisions.
- Scrape as many databases as possible: rejected because many sources overlap, quality varies, data licenses may not authorize redistribution, and merging semantic exercise variants requires human review.
- Import multiple sources immediately: deferred. Add a second source only to address demonstrated catalog gaps after its license, quality, overlap, and provenance have been reviewed.
- wger: not selected as an initial import source. Its API offers structured exercise records, but the server software's AGPL license is not itself a grant to redistribute each exercise record. Per-record source/license metadata requires a separate content-rights audit before importing.

**References**:

- [yuhonas/free-exercise-db README](https://github.com/yuhonas/free-exercise-db)
- [yuhonas/free-exercise-db Unlicense](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md)
- [yuhonas exercise schema](https://github.com/yuhonas/free-exercise-db/blob/main/schema.json)
- [wrkout/exercises.json repository](https://github.com/wrkout/exercises.json)
- [wrkout/exercises.json Unlicense](https://github.com/wrkout/exercises.json/blob/master/LICENSE.md)
- [wrkout contribution guide (including image-rights warning)](https://github.com/wrkout/exercises.json/blob/master/CONTRIBUTING.md)
- [wger API documentation](https://wger.readthedocs.io/en/latest/api/api.html)
- [wger repository license](https://github.com/wger-project/wger/blob/master/LICENSE.txt)
- [wger exercise license information migration](https://github.com/wger-project/wger/blob/master/wger/exercises/migrations/0024_license_information.py)

### Application data storage and access

**Decision**: Use the project's constitution baseline: Expo React Native/Web client and a managed Supabase Postgres database for catalog, program definitions/versions, enrollments, workout results, and body measurements; use Supabase Storage for optional progress photos, protected by authenticated authorization. Use database row-level security (RLS) for user-owned records and narrowly scoped owner/team authoring operations. Keep source datasets as a one-time or repeatable import input; do not fetch them from the app client.

**Rationale**: The repository currently has one Expo app in `apps/mobile`, seed programs in TypeScript, and local AsyncStorage persistence for workout sessions, trophy records, and photo checkpoints. It has no server/database package and no test scripts in `apps/mobile/package.json`. The constitution already recommends Supabase and explicitly requires private-by-default photos, encryption in transit/at rest, account deletion, and owner/team-only authoring. A relational database supports stable canonical exercise IDs, provenance, immutable published program versions, and relationships between user-owned training records.

Treat existing AsyncStorage content as local prototype state, not the production source of truth. The implementation plan must introduce migration and graceful upgrade decisions rather than silently discard local workout data. Do not store progress-photo binary content as a public database URL; use private object storage and policy-controlled access.

**Alternatives considered**:

- Continue storing the program catalog and user history as TypeScript/AsyncStorage: rejected for shared, owner-authored content, published program distribution, cross-device persistence, and owner/user separation.
- Store only a bundled JSON catalog: useful for a static offline prototype but rejected as the production catalog because owner corrections and newly imported exercises require an app release.
- Self-host and operate a custom API/database: not selected because it conflicts with the constitution's lean Supabase baseline without a demonstrated blocker.

**References**:

- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Expo app package manifest](../../apps/mobile/package.json)
- [Current application persistence and seed data](../../apps/mobile/App.tsx)

### Strength estimates and RPE/RIR conversion

**Decision**: Preserve Lander as the required estimated-1RM method and the Zourdos resistance-training-specific RPE scale as a research reference, but label results as estimates and do not claim the cited work validates an exact, universal reps/RPE-to-%1RM table. Use the same user's latest qualifying set to update their estimate only for the affected exercise. Store the method and input values used so historical calculations can be audited and recalculated deliberately.

**Lander formula specified by the product**:

`estimated 1RM = (100 × load) / (101.3 - 2.67123 × reps)`

The denominator is non-positive at approximately 38 reps, which is a mathematical failure boundary, not an evidence-supported validity range. In this plan, constrain calculated estimates to a documented low-rep range (proposed maximum 10 reps) and reject invalid loads, rep counts, or denominators. The 10-rep bound is a conservative product guard informed by general prediction-equation research, not a threshold validated specifically for Lander.

**Product decision**: Use the final discovery set's actual recorded load and reps as-is for the Lander calculation, do not require users to reach failure, and label the result an approximate estimate. This is an intentional compromise: Lander conventionally uses repetitions performed to failure, so a submaximal set may yield a biased estimate. Do not infer failure reps from RPE/RIR on the `%1RM` path; the product decision explicitly excludes effort scores from those weight calculations.

Zourdos et al. studied squatters using RPE as a resistance-training-specific scale connected to reps in reserve, with anchors including RPE 10 = 0 RIR and RPE 9 = 1 RIR. It is not a comprehensive validation of an RPE/RIR-to-%1RM table. The commonly cited table is from Helms et al.; that article says some cells are estimates and warns it reflects trained squatters and individual variation. Consequently:

- Keep the programmer's `RPE` or `RIR` setting as the effort metric and map it using the selected documented conversion table; do not present every conversion as a directly measured physiological fact.
- Do not treat low-effort or fractional subjective RIR as precise. Explain estimated values and retain the user-entered observation.
- On `RPE`/`RIR` paths, derive an effort-aware estimate from a qualifying set using a documented conversion, and update that user's exercise-specific remaining loads when the two-consecutive-workout polarity rule is met.
- On `%1RM` paths, do not use effort ratings in the load prescription calculation, consistent with the user's instruction.
- Keep rounding and minimum load increment as a per-exercise/equipment concern; do not silently alter the estimated strength value.

**Alternatives considered**:

- Treating Lander output as a precise, measured 1RM: rejected because it is an equation-based estimate with prediction error.
- Treating Zourdos 2016 as validating a complete reps × RPE/RIR conversion chart: rejected because the study's scope does not establish that claim.
- Feeding `completed reps + reported RIR` directly into Lander as an exact rep-to-failure count: not selected as a fact; this is a heuristic that compounds RIR subjectivity with equation error.
- Choosing a different equation or a direct 1RM test: deferred because the feature explicitly names Lander; planning retains the requested equation and records its limitations.

**References**:

- [Zourdos et al. (2016), DOI 10.1519/JSC.0000000000001049](https://doi.org/10.1519/JSC.0000000000001049)
- [Helms et al. (2016), RPE scale and RPE chart discussion, DOI 10.1519/SSC.0000000000000218](https://doi.org/10.1519/SSC.0000000000000218)
- [LeSuer et al. (1997), accuracy of 1RM prediction equations](https://www.ovid.com/jnls/nsca-jscr/abstract/00124278-199711000-00001~the-accuracy-of-prediction-equations-for-estimating-1-rm)
- [Reynolds et al. (2006), prediction equations and repetition range, DOI 10.1519/00124278-200608000-00020](https://doi.org/10.1519/00124278-200608000-00020)
- [Halperin et al., review/preprint on repetitions in reserve prediction](https://doi.org/10.31236/osf.io/x256f)

## Remaining Risks and Plan Assumptions

1. **Lander discovery estimate limitation**: The owner has decided not to require failure and to use the final set's recorded reps as-is. This is not the conventional Lander input; surface the result as approximate and retain the calculation provenance. Obtain qualified exercise-science review before releasing weight recommendations.
2. **Progression source details**: The free-exercise-db license is permissive as stated in the repository, but preserve source provenance and recheck notices and the actual imported content before each release.
3. **Catalog deduplication**: Similarity scores should create review candidates, not autonomously merge semantically different variants.
4. **Automatic load adjustment**: The spec establishes trigger polarity and the use of recent set data but not a numeric rounding increment or explicit cap/floor. Keep adjustment factors, unit conversion, bounds, and idempotent event handling in the calculation contract and require explicit tests before implementation.
5. **Existing local records**: A future account/cloud migration must not silently lose AsyncStorage workout history or local photo references. Legacy data may require user sign-in, import, or an explicit reset path.
