# Fitness Applied UI redesign implementation tasks

Research basis:

- Apple Human Interface Guidelines: [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) and [Workouts](https://developer.apple.com/design/human-interface-guidelines/workouts)
- Material Design: [Accessible layouts](https://m3.material.io/foundations/accessibility/designing-accessible-layouts) and [Cards accessibility](https://m3.material.io/components/cards/accessibility)
- In-situ fitness UX research emphasizing low-friction logging, immediate feedback, and longitudinal testing: [Frontiers adherence study](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2026.1855668/full) and [fitness app behavior analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC12828317/)

## Product decisions already made

- Active workouts use one set per screen.
- Each set shows prescription context and editable actual weight/reps.
- Each set records actual RPE or RIR, a numeric 1–10 diagnostic, and optional notes.
- Free-program set ads occupy reserved space below the save/progression action.
- Completion uses overview → reflection → private recap.
- Photos and social exports are optional, private by default, and never auto-published.
- The 1–10 diagnostic measures effort.
- Actual RPE/RIR may be skipped. The first skip prompts for confirmation and offers a persistent “keep reminding me” choice.
- Advertising should be regular and consistent without overwhelming the user; exact cadence and formats remain to be validated.
- All photos are eligible for recap export except photos explicitly marked private.
- Batch logging is deferred; focused set-by-set logging is the current default.

## Implemented in this iteration

- [x] Focused active-set layout
- [x] Editable actual weight and reps
- [x] Set notes
- [x] Numeric set-quality validation
- [x] Actual RPE/RIR capture and session mapping
- [x] Reserved set-transition ad slot
- [x] Session overview and reflection prototype
- [x] Private recap preview with selectable safe metrics
- [x] Privacy-safe recap metadata shape
- [x] Unit-aware active-set logging for reps-for-time and timed isometrics
- [x] Carry structured exercise instructions into program previews and active sets

## Exercise instruction implementation plan

The exercise name remains the stable catalog identity. Instruction content is
stored as structured, owner-controlled metadata and travels through the same
catalog and program payload as the exercise reference.

### Dataset rights gate

The [`nyt-dev/exercises-dataset-fitness`](https://github.com/nyt-dev/exercises-dataset-fitness)
repository was reviewed as a possible instruction source. The Kaggle API
metadata for [`omarxadel/fitness-exercises-dataset`](https://www.kaggle.com/datasets/omarxadel/fitness-exercises-dataset)
labels the dataset MIT, but the dataset description does not include a
dataset-specific MIT notice identifying the rights holder for every record.
The supplied MIT text names Mark Otto and Andrew Fong, which appears to be a
software notice rather than a clear grant from the exercise-data rights
holders. The GitHub mirror separately describes its copy as
educational/non-commercial. The Kaggle description also references separately
purchased GIF media.

After a second-source check, the dataset remains rights-unresolved for
commercial redistribution. It is not imported or shipped in Fitness Applied
until the owner provides a dataset-specific license grant covering the
exercise records and instruction text. Images and GIFs remain separately
blocked pending their individual commercial rights and provenance.

1. **Catalog contract and governance**
   - Keep `name`/`displayName` searchable and stable.
   - Store concise, rights-reviewed `instructions` separately.
   - Preserve the source revision and owner-edit history when importing or
     revising instruction text.
2. **Authoring and publishing**
   - Show instructions while selecting an exercise and reviewing generated
     schedule rows.
   - Publish the exercise reference, not a copied name-encoded instruction.
   - Validate length, whitespace, and unsafe/unsupported content before publish.
3. **Runtime delivery**
   - Include instructions in catalog search results and published-program
     exercise joins.
   - Keep missing instructions valid and render no empty placeholder.
   - Use the same field for content-package and relational program paths.
4. **Workout UX**
   - Show instructions below the active exercise name, before prescription.
   - Keep the primary save action and set inputs visually dominant.
   - Support long instructions without truncation or blocking set capture.
5. **Quality and rollout**
   - Add contract, mapping, authoring-preview, and UI tests.
   - Apply the database migration before publishing instruction-dependent
     programs.
   - Validate on a physical device with long text, missing text, and offline
     content.

## Next code-ready tasks

- [ ] Add prescribed-weight resolution from the existing strength-estimate/prescription domain functions; do not add a third formula.
- [ ] Add focused interaction tests for first, middle, and final sets, invalid fields, actual effort, rest transitions, and paid-program ad suppression.
- [ ] Persist set-level actual values, quality, notes, elapsed time, rest time, and AMRAP/timed events through the workout repository.
- [ ] Connect session completion to the existing program snapshot completion path.
- [ ] Add archive dashboard UI for the completed snapshot and generated recap.
- [ ] Add photo picker/library integration with upload, retry, replacement, deletion, and account-cleanup behavior.
- [ ] Extend recap preview with persisted badges, selected photos, and redaction controls.
- [ ] Add focused UI coverage for reps-for-time and timed-isometric set capture.
- [ ] Add explicit export/share through the platform share sheet; never auto-post.
- [ ] Add instruction contract tests for catalog mapping, relational program joins, and missing/long text.
- [ ] Add authoring validation for instruction length, whitespace normalization, and publish readiness.
- [ ] Backfill reviewed catalog instructions into Supabase and verify migration/search indexing.
- [x] Verify the Kaggle dataset declares MIT in its API metadata.
- [x] Perform a second-source rights check against the mirror and dataset provenance.
- [ ] Obtain a dataset-specific written license clarification from the owner before importing text metadata/instructions.
- [ ] Verify separate commercial rights before importing any dataset images or GIFs.

## Requires owner/product approval

- [x] Choose the exact meaning of the 1–10 diagnostic: effort.
- [x] Decide whether actual RPE/RIR is required or optional for a saved set: optional, with first-skip confirmation and persistent reminder choice.
- [ ] Approve the final free-program ad formats, frequency caps, consent copy, and rest-screen full-page behavior. Direction: regular and consistent, not overwhelming.
- [x] Approve which photos are eligible for exported social cards: all except explicitly private photos.
- [x] Decide whether advanced users also receive a batch-logging mode: deferred to a later update.

## Native/platform or release dependent

- [ ] Choose and configure the production ad SDK, ATT/consent behavior, and platform disclosures.
- [ ] Configure camera/photo permissions and verify iOS/Android review requirements.
- [ ] Run in-situ usability tests with representative users while simulating sweat, one-handed use, interruptions, and poor connectivity.
- [ ] Produce production EAS builds after native dependencies or permissions change.
