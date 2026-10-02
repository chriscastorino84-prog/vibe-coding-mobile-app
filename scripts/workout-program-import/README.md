# Workout program import

This importer converts the Kaggle `uihyunk/crossfit-wods-2019-2025` CSV into the
content-program shape consumed by the app's program mapper. Each source row is
preserved as a draft program with its WOD text and men's/women's settings.

The source WOD field is free-form prose. The importer intentionally does not
invent exercise IDs, sets, or reps from ambiguous text. It stores the complete
prescription in one WOD exercise so every source workout is retained. Exported
records are categorized as `WOD` and marked as free marketplace content after
the explicit license approval flag is supplied.

## Usage

Download the dataset with Kaggle:

```python
import kagglehub
path = kagglehub.dataset_download("uihyunk/crossfit-wods-2019-2025")
print(path)
```

Then run:

```powershell
npm install
npm run export -- --input C:\path\to\wods.csv --catalog C:\path\to\exercises-kaggle-text.json --output C:\path\to\crossfit-wods-program-export.json --license-approved --reviewer "name" --reviewed-at "YYYY-MM-DD"

The optional catalog argument resolves exercise mentions to stable `exerciseId`
values and includes the catalog instructions in each generated exercise
snapshot. Generated exercises also declare their timer mode and tracking inputs
so the mobile WOD runtime can support online and offline sessions without
inferring behavior from display text.

The importer uses the shared `@fitness-applied/tools` WOD conversion engine.
Generated exercise records also carry structured `rounds`, `sets`,
`repetitions`, `timeCapSeconds`, interval/work/rest durations, movement
segments, and conversion warnings. Warnings are retained for review instead
of silently converting ambiguous prose into a false prescription.
```

The generated programs are categorized as `WOD`, marked
`marketplace.status: published`, and configured as free content. The launch
manifest records the approved source revision and expected count. Only pass
`--license-approved` after redistribution of both the Kaggle database and the
collected CrossFit content has been reviewed.
