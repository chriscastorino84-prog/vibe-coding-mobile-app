import { describe, expect, it } from "vitest";
import { importCatalogBatch } from "./import.js";
import { assertLicenseApproved } from "./licenseGate.js";
import { normalizeRecord } from "./normalize.js";
import { readYuhonasRecords } from "./sources/yuhonas.js";

const license = { licenseName: "Unlicense", licenseUrl: "https://unlicense.org/", attributionText: "yuhonas/free-exercise-db", review: { status: "approved" as const, approved: true, reviewer: "owner", reviewedAt: "2026-09-27" } };
const config = { sourceName: "yuhonas", sourceRevision: "abc123", repositoryUrl: "https://github.com/yuhonas/free-exercise-db", licenseName: "Unlicense" };

describe("exercise catalog import", () => {
  it("maps text fields and excludes image fields", () => {
    const [record] = readYuhonasRecords([{ id: "1", name: "  Bench  Press ", equipment: ["Body Only"], instructions: [" Lie down. "], images: ["secret.jpg"] }], config);
    expect(record).toMatchObject({ sourceRecordId: "1", displayName: "Bench  Press", equipment: ["Body Only"], description: "Lie down." });
    expect(record).not.toHaveProperty("images");
  });

  it("normalizes deterministic fields and preserves missing optional data", () => {
    const result = normalizeRecord({ ...readYuhonasRecords([{ id: "1", name: "Bench! Press", equipment: ["Body Only", "body only"] }], config)[0] });
    expect(result.canonical.normalizedName).toBe("bench press");
    expect(result.canonical.equipment).toEqual(["bodyweight"]);
    expect(result.canonical.description).toBeUndefined();
  });

  it("fails closed without explicit license approval", () => {
    expect(() => assertLicenseApproved({ licenseName: "Unlicense", review: { status: "pending", approved: false } })).toThrow(/explicit approval/i);
  });

  it("is repeatable, retains provenance, and creates candidates without merging", () => {
    const records = readYuhonasRecords([
      { id: "1", name: "Bench Press", equipment: ["barbell"] },
      { id: "2", name: "Bench Press", equipment: ["dumbbell"], aliases: ["Chest press"] },
    ], config);
    const first = importCatalogBatch({ records, license });
    const replay = importCatalogBatch({ records, license, state: first.state });
    expect(replay.report).toEqual(first.report);
    expect(replay.state.exercises).toHaveLength(2);
    expect(first.state.sources).toHaveLength(2);
    expect(first.state.duplicateCandidates).toHaveLength(1);
    expect(first.state.aliases[0].alias).toBe("Chest press");
  });

  it("does not overwrite owner-corrected fields", () => {
    const records = readYuhonasRecords([{ id: "1", name: "Bench Press" }], config);
    const first = importCatalogBatch({ records, license });
    first.state.exercises[0].description = "Owner wording";
    first.state.exercises[0].ownerEditedFields = ["description"];
    const changed = importCatalogBatch({ records: [{ ...records[0], description: "Imported wording" }], license: { ...license, review: { ...license.review, reviewedAt: "2026-09-28" } }, state: { ...first.state, batches: [] } });
    expect(changed.state.exercises[0].description).toBe("Owner wording");
    expect(changed.report.changedOwnerFields).toBe(1);
  });
});
