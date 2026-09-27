import type { SourceRecord } from "./sources/yuhonas.js";

export interface CanonicalExercise {
  id: string;
  displayName: string;
  normalizedName: string;
  description?: string;
  category?: string;
  primaryMuscleGroups?: string[];
  equipment?: string[];
  movementPattern?: string;
  difficulty?: string;
  ownerEditedFields: string[];
}

export interface ExerciseSource {
  id: string;
  exerciseId: string;
  sourceName: string;
  sourceRecordId: string;
  sourceRecordUrl?: string;
  sourceRevision: string;
  licenseName: string;
  licenseUrl?: string;
  licenseNotice?: string;
  attributionText?: string;
}

export interface ExerciseAlias {
  id: string;
  exerciseId: string;
  alias: string;
  normalizedAlias: string;
  sourceId: string;
}

export interface DuplicateCandidate {
  id: string;
  importBatchId: string;
  candidateSourceRecordId: string;
  matchedExerciseId: string;
  similarityReasons: string[];
  reviewStatus: "pending" | "same_exercise" | "alias" | "distinct" | "rejected";
}

export interface NormalizedRecord {
  canonical: Omit<CanonicalExercise, "id" | "ownerEditedFields">;
  aliases: string[];
  source: Omit<ExerciseSource, "id" | "exerciseId">;
}

const equipmentAliases: Record<string, string> = {
  "body only": "bodyweight",
  "bodyweight only": "bodyweight",
  "e-z curl bar": "ez curl bar",
  "ez bar": "ez curl bar",
};

export function normalizeText(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
}

function list(values?: string[]): string[] | undefined {
  if (!values?.length) return undefined;
  const result = [...new Set(values.map((value) => {
    const normalized = normalizeText(value);
    return equipmentAliases[normalized] ?? normalized;
  }).filter(Boolean))].sort();
  return result.length ? result : undefined;
}

export function normalizeRecord(record: SourceRecord): NormalizedRecord {
  return {
    canonical: {
      displayName: record.displayName.trim().replace(/\s+/g, " "),
      normalizedName: normalizeText(record.displayName),
      description: record.description?.trim() || undefined,
      category: record.category ? normalizeText(record.category) : undefined,
      primaryMuscleGroups: list(record.primaryMuscleGroups),
      equipment: list(record.equipment),
      movementPattern: record.movementPattern ? normalizeText(record.movementPattern) : undefined,
      difficulty: record.difficulty ? normalizeText(record.difficulty) : undefined,
    },
    aliases: [...new Set((record.aliases ?? []).map((alias) => alias.trim()).filter(Boolean))].sort(),
    source: {
      sourceName: record.sourceName,
      sourceRecordId: record.sourceRecordId,
      sourceRecordUrl: record.sourceRecordUrl,
      sourceRevision: record.sourceRevision,
      licenseName: record.licenseName,
      licenseUrl: record.licenseUrl,
      licenseNotice: record.licenseNotice,
      attributionText: record.attributionText,
    },
  };
}

function stableId(prefix: string, value: string): string {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `${prefix}-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function canonicalId(source: NormalizedRecord["source"]): string {
  return stableId("exercise", `${source.sourceName}:${source.sourceRecordId}:${source.sourceRevision}`);
}

export function sourceId(source: NormalizedRecord["source"]): string {
  return stableId("source", `${source.sourceName}:${source.sourceRecordId}:${source.sourceRevision}`);
}

export function aliasId(exerciseId: string, alias: string): string {
  return stableId("alias", `${exerciseId}:${normalizeText(alias)}`);
}

export function findDuplicateReasons(candidate: NormalizedRecord["canonical"], existing: CanonicalExercise): string[] {
  const reasons: string[] = [];
  if (candidate.normalizedName === existing.normalizedName) reasons.push("normalized name");
  if (candidate.equipment?.length && existing.equipment?.length &&
      candidate.equipment.some((value) => existing.equipment?.includes(value))) reasons.push("equipment");
  if (candidate.primaryMuscleGroups?.length && existing.primaryMuscleGroups?.length &&
      candidate.primaryMuscleGroups.some((value) => existing.primaryMuscleGroups?.includes(value))) reasons.push("target muscle");
  if (candidate.category && candidate.category === existing.category) reasons.push("category");
  if (candidate.description && existing.description && normalizeText(candidate.description) === normalizeText(existing.description)) reasons.push("instruction text");
  return reasons;
}
