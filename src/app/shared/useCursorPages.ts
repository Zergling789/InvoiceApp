import { useCallback, useEffect, useRef, useState } from "react";

import type {
  CursorPage,
  CursorPageOptions,
  DocumentCursor,
} from "@/db/cursorPagination";

type CursorPageLoader<T> = (options: CursorPageOptions) => Promise<CursorPage<T>>;

const appendUnique = <T extends { id: string }>(current: T[], next: T[]) => {
  const knownIds = new Set(current.map((item) => item.id));
  return [...current, ...next.filter((item) => !knownIds.has(item.id))];
};

export function useCursorPages<T extends { id: string }>(
  loadPage: CursorPageLoader<T>,
  pageSize = 24,
) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<DocumentCursor | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const generationRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const refresh = useCallback(async () => {
    const generation = ++generationRef.current;
    loadingMoreRef.current = false;
    setLoading(true);
    setLoadingMore(false);
    setError(null);
    setLoadMoreError(null);
    try {
      const page = await loadPage({ pageSize });
      if (generation !== generationRef.current) return;
      setItems(page.items);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (caught) {
      if (generation !== generationRef.current) return;
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      if (generation === generationRef.current) setLoading(false);
    }
  }, [loadPage, pageSize]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || !cursor) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(null);
    const generation = generationRef.current;
    try {
      const page = await loadPage({ cursor, pageSize });
      if (generation !== generationRef.current) return;
      setItems((current) => appendUnique(current, page.items));
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (caught) {
      if (generation === generationRef.current) {
        setLoadMoreError(caught instanceof Error ? caught.message : String(caught));
      }
    } finally {
      loadingMoreRef.current = false;
      if (generation === generationRef.current) setLoadingMore(false);
    }
  }, [cursor, hasMore, loadPage, pageSize]);

  useEffect(() => {
    void refresh();
    return () => {
      generationRef.current += 1;
    };
  }, [refresh]);

  return {
    items,
    loading,
    loadingMore,
    error,
    loadMoreError,
    hasMore,
    refresh,
    loadMore,
  };
}
