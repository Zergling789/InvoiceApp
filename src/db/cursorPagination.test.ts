import { describe, expect, it } from "vitest";

import {
  buildDescendingCursorFilter,
  buildIlikeAnyFilter,
  buildInFilter,
  createCursorPage,
  normalizePageSize,
} from "@/db/cursorPagination";

describe("cursor pagination", () => {
  it("builds a stable descending cursor from timestamp and id", () => {
    expect(
      buildDescendingCursorFilter({
        createdAt: "2026-07-18T10:15:30.000Z",
        id: "offer-42",
      }),
    ).toBe(
      'created_at.lt."2026-07-18T10:15:30.000Z",and(created_at.eq."2026-07-18T10:15:30.000Z",id.lt."offer-42")',
    );
  });

  it("returns one page plus a cursor only when another row exists", () => {
    const page = createCursorPage(
      [
        { id: "3", created_at: "2026-07-18T12:00:00.000Z" },
        { id: "2", created_at: "2026-07-18T11:00:00.000Z" },
        { id: "1", created_at: "2026-07-18T10:00:00.000Z" },
      ],
      2,
      (row) => row.id,
    );

    expect(page).toEqual({
      items: ["3", "2"],
      hasMore: true,
      nextCursor: { createdAt: "2026-07-18T11:00:00.000Z", id: "2" },
    });
  });

  it("keeps page sizes within the supported bounds", () => {
    expect(normalizePageSize(0)).toBe(1);
    expect(normalizePageSize(500)).toBe(100);
    expect(normalizePageSize()).toBe(24);
  });

  it("escapes user search values before composing PostgREST filters", () => {
    expect(buildIlikeAnyFilter(["name", "email"], "  50%_Müller  ")).toBe(
      'name.ilike."%50\\\\%\\\\_Müller%",email.ilike."%50\\\\%\\\\_Müller%"',
    );
    expect(buildInFilter("client_id", ["client-1", "client-2"])).toBe(
      'client_id.in.("client-1","client-2")',
    );
  });
});
