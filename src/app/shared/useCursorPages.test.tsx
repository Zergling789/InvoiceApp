import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CursorPage } from "@/db/cursorPagination";
import { useCursorPages } from "./useCursorPages";

type Item = { id: string; name: string };

const firstPage: CursorPage<Item> = {
  items: [{ id: "one", name: "Erster Eintrag" }],
  nextCursor: { createdAt: "2026-07-18T10:00:00.000Z", id: "one" },
  hasMore: true,
};

describe("useCursorPages", () => {
  it("loads the first page and appends only new records", async () => {
    const loadPage = vi
      .fn()
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce({
        items: [
          { id: "one", name: "Doppelter Eintrag" },
          { id: "two", name: "Zweiter Eintrag" },
        ],
        nextCursor: null,
        hasMore: false,
      } satisfies CursorPage<Item>);

    const { result } = renderHook(() => useCursorPages(loadPage, 1));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toEqual(firstPage.items);
    await act(async () => result.current.loadMore());

    expect(loadPage).toHaveBeenLastCalledWith({
      cursor: firstPage.nextCursor,
      pageSize: 1,
    });
    expect(result.current.items.map((item) => item.id)).toEqual(["one", "two"]);
    expect(result.current.hasMore).toBe(false);
  });

  it("keeps the current page and exposes a retryable load-more error", async () => {
    const loadPage = vi
      .fn()
      .mockResolvedValueOnce(firstPage)
      .mockRejectedValueOnce(new Error("offline"));

    const { result } = renderHook(() => useCursorPages(loadPage, 1));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => result.current.loadMore());

    expect(result.current.items).toEqual(firstPage.items);
    expect(result.current.loadMoreError).toBe("offline");
    expect(result.current.hasMore).toBe(true);
  });
});
