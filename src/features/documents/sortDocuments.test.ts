import { describe, expect, it } from "vitest";

import { sortDocumentsNewestFirst } from "@/features/documents/sortDocuments";

describe("sortDocumentsNewestFirst", () => {
  it("uses the creation timestamp when documents have the same document date", () => {
    const rows = [
      { id: "older", date: "2026-07-14", createdAt: "2026-07-14T08:00:00Z" },
      { id: "newer", date: "2026-07-14", createdAt: "2026-07-14T12:00:00Z" },
    ];

    expect(sortDocumentsNewestFirst(rows).map((row) => row.id)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("falls back to the document date for existing records without createdAt", () => {
    const rows = [
      { id: "older", date: "2026-07-13" },
      { id: "newer", date: "2026-07-14" },
    ];

    expect(sortDocumentsNewestFirst(rows).map((row) => row.id)).toEqual([
      "newer",
      "older",
    ]);
  });
});
