import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assertLicenseApproved, type LicenseMetadata } from "./licenseGate.js";
import { aliasId, canonicalId, findDuplicateReasons, normalizeRecord, sourceId, type CanonicalExercise, type DuplicateCandidate } from "./normalize.js";
import { createReport, emptyCatalogState, type CatalogState, type ImportReport } from "./report.js";
import type { SourceRecord } from "./sources/yuhonas.js";

export interface ImportRequest {
  records: SourceRecord[];
  license: LicenseMetadata;
  state?: CatalogState;
  importBatchId?: string;
}

export interface ImportResult {
  state: CatalogState;
  report: ImportReport;
}

export function importCatalogBatch(request: ImportRequest): ImportResult {
  const first = request.records[0];
  if (!first) throw new Error("Import failed: the source contained no records.");
  assertLicenseApproved(request.license);
  const state = structuredClone(request.state ?? emptyCatalogState());
  const sourceName = first.sourceName;
  const sourceRevision = first.sourceRevision;
  const prior = state.batches.find((batch) => batch.sourceName === sourceName && batch.sourceRevision === sourceRevision);
  if (prior) return { state, report: prior.report };
  if (request.records.some((record) => record.sourceName !== sourceName || record.sourceRevision !== sourceRevision)) {
    throw new Error("Import failed: every record in a batch must use the same sourceName and sourceRevision.");
  }

  const batchId = request.importBatchId ?? `batch-${sourceName}-${sourceRevision}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  const candidates: DuplicateCandidate[] = [];
  let changedOwnerFields = 0;
  const aliases = [];
  for (const record of request.records) {
    const normalized = normalizeRecord(record);
    const priorSource = state.sources.find((source) =>
      source.sourceName === normalized.source.sourceName &&
      source.sourceRecordId === normalized.source.sourceRecordId &&
      source.sourceRevision === normalized.source.sourceRevision);
    const existing = priorSource ? state.exercises.find((exercise) => exercise.id === priorSource.exerciseId) : undefined;
    const id = canonicalId(normalized.source);
    const matches = state.exercises.filter((exercise) => exercise.id !== existing?.id)
      .map((exercise) => ({ exercise, reasons: findDuplicateReasons(normalized.canonical, exercise) }))
      .filter((match) => match.reasons.length);
    for (const match of matches) {
      candidates.push({
        id: `duplicate-${batchId}-${record.sourceRecordId}`,
        importBatchId: batchId,
        candidateSourceRecordId: record.sourceRecordId,
        matchedExerciseId: match.exercise.id,
        similarityReasons: match.reasons,
        reviewStatus: "pending",
      });
    }
    const canonical: CanonicalExercise = existing ?? { ...normalized.canonical, id, ownerEditedFields: [] };
    if (!existing) state.exercises.push(canonical);
    else for (const field of Object.keys(normalized.canonical) as Array<keyof typeof normalized.canonical>) {
      if (canonical.ownerEditedFields.includes(field)) {
        if (JSON.stringify(canonical[field]) !== JSON.stringify(normalized.canonical[field])) changedOwnerFields++;
      } else if (canonical[field] === undefined && normalized.canonical[field] !== undefined) {
        Object.assign(canonical, { [field]: normalized.canonical[field] });
      }
    }
    const sid = sourceId(normalized.source);
    state.sources.push({ ...normalized.source, id: sid, exerciseId: canonical.id });
    for (const alias of normalized.aliases) {
      const item = { id: aliasId(canonical.id, alias), exerciseId: canonical.id, alias, normalizedAlias: normalizeRecord({ ...record, displayName: alias }).canonical.normalizedName, sourceId: sid };
      if (!state.aliases.some((candidate) => candidate.id === item.id)) { state.aliases.push(item); aliases.push(item); }
    }
  }
  state.duplicateCandidates.push(...candidates);
  const report = createReport({
    sourceName, sourceRevision, licenseReviewStatus: request.license.review.status,
    recordsSeen: request.records.length, recordsImported: request.records.length,
    candidates, aliases, changedOwnerFields, notice: request.license.attributionText,
  });
  state.batches.push({ id: batchId, sourceName, sourceRevision, report });
  return { state, report };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const value = (name: string): string | undefined => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
  const inputPath = value("--input");
  const outputPath = value("--output") ?? "exercise-catalog-report.json";
  if (!inputPath) throw new Error("Import failed: --input <exercises.json> is required. Use --help for the expected arguments.");
  const payload = JSON.parse(await readFile(resolve(inputPath), "utf8")) as { records: SourceRecord[]; license: LicenseMetadata; state?: CatalogState };
  const result = importCatalogBatch(payload);
  await writeFile(resolve(outputPath), JSON.stringify(result, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(result.report, null, 2));
}

if (process.argv[1]?.endsWith("import.ts")) main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Import failed: unknown error.");
  process.exitCode = 1;
});
