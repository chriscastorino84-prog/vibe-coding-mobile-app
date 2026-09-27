export interface YuhonasSourceConfig {
  sourceName: string;
  sourceRevision: string;
  repositoryUrl: string;
  licenseName: string;
  licenseUrl?: string;
  licenseNotice?: string;
  attributionText?: string;
}

export interface SourceRecord {
  sourceName: string;
  sourceRevision: string;
  sourceRecordId: string;
  sourceRecordUrl?: string;
  displayName: string;
  description?: string;
  equipment?: string[];
  category?: string;
  movementPattern?: string;
  primaryMuscleGroups?: string[];
  aliases?: string[];
  difficulty?: string;
  licenseName: string;
  licenseUrl?: string;
  licenseNotice?: string;
  attributionText?: string;
}

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const result = value.trim();
  return result || undefined;
}

function strings(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result = value.filter((item): item is string => typeof item === "string")
    .map((item) => item.trim()).filter(Boolean);
  return result.length ? result : undefined;
}

export function readYuhonasRecords(input: unknown, config: YuhonasSourceConfig): SourceRecord[] {
  if (!Array.isArray(input)) {
    throw new Error("Yuhonas import failed: exercises.json must contain a JSON array of records.");
  }

  return input.map((raw, index) => {
    if (!raw || typeof raw !== "object") {
      throw new Error(`Yuhonas import failed: record ${index + 1} is not an object.`);
    }
    const record = raw as Record<string, unknown>;
    const id = text(record.id) ?? text(record._id);
    const name = text(record.name);
    if (!id) throw new Error(`Yuhonas import failed: record ${index + 1} has no stable id.`);
    if (!name) throw new Error(`Yuhonas import failed: record ${id} has no name.`);

    const instructions = strings(record.instructions);
    return {
      sourceName: config.sourceName,
      sourceRevision: config.sourceRevision,
      sourceRecordId: id,
      sourceRecordUrl: `${config.repositoryUrl.replace(/\/$/, "")}/tree/${encodeURIComponent(id)}`,
      displayName: name,
      description: instructions?.join("\n\n"),
      equipment: strings(record.equipment),
      category: text(record.category),
      movementPattern: text(record.mechanic) ?? text(record.movementPattern),
      primaryMuscleGroups: strings(record.primaryMuscles ?? record.primary_muscles),
      aliases: strings(record.aliases),
      difficulty: text(record.level) ?? text(record.difficulty),
      licenseName: config.licenseName,
      licenseUrl: config.licenseUrl,
      licenseNotice: config.licenseNotice,
      attributionText: config.attributionText,
    };
  });
}
