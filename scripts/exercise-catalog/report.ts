import type { DuplicateCandidate, CanonicalExercise, ExerciseSource, ExerciseAlias } from "./normalize.js";
import type { LicenseReviewStatus } from "./licenseGate.js";

export interface ImportReport {
  sourceName: string;
  sourceRevision: string;
  licenseReviewStatus: LicenseReviewStatus;
  status: "completed" | "review_required" | "failed";
  recordsSeen: number;
  recordsImported: number;
  recordsRejected: number;
  duplicateCandidates: number;
  aliases: number;
  changedOwnerFields: number;
  errors: string[];
  notice?: string;
}

export function createReport(input: {
  sourceName: string;
  sourceRevision: string;
  licenseReviewStatus: LicenseReviewStatus;
  recordsSeen: number;
  recordsImported?: number;
  recordsRejected?: number;
  candidates?: DuplicateCandidate[];
  aliases?: ExerciseAlias[];
  changedOwnerFields?: number;
  errors?: string[];
  notice?: string;
}): ImportReport {
  const candidates = input.candidates ?? [];
  const errors = input.errors ?? [];
  return {
    sourceName: input.sourceName,
    sourceRevision: input.sourceRevision,
    licenseReviewStatus: input.licenseReviewStatus,
    status: errors.length ? "failed" : candidates.some((candidate) => candidate.reviewStatus === "pending") ? "review_required" : "completed",
    recordsSeen: input.recordsSeen,
    recordsImported: input.recordsImported ?? 0,
    recordsRejected: input.recordsRejected ?? 0,
    duplicateCandidates: candidates.length,
    aliases: input.aliases?.length ?? 0,
    changedOwnerFields: input.changedOwnerFields ?? 0,
    errors,
    notice: input.notice,
  };
}

export type CatalogState = {
  batches: Array<{ id: string; sourceName: string; sourceRevision: string; report: ImportReport }>;
  exercises: CanonicalExercise[];
  sources: ExerciseSource[];
  aliases: ExerciseAlias[];
  duplicateCandidates: DuplicateCandidate[];
};

export function emptyCatalogState(): CatalogState {
  return { batches: [], exercises: [], sources: [], aliases: [], duplicateCandidates: [] };
}
