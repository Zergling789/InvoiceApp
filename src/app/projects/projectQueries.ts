import { useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "@/domain/types";
import * as projectService from "./projectService";
import type { ProjectPageOptions } from "@/db/projectsDb";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await projectService.listProjects());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { projects, loading, error, refresh };
}

export function useProjectPages(filters: Omit<ProjectPageOptions, "page" | "pageSize">) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const generationRef = useRef(0);
  const filtersKey = JSON.stringify(filters);

  const refresh = useCallback(async () => {
    const generation = ++generationRef.current;
    setLoading(true);
    setError(null);
    setLoadMoreError(null);
    try {
      const page = await projectService.listProjectsPage({
        ...filters,
        page: 0,
        pageSize: 24,
      });
      if (generation !== generationRef.current) return;
      setProjects(page.items);
      setNextPage(page.nextPage);
    } catch (caught) {
      if (generation === generationRef.current) {
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    } finally {
      if (generation === generationRef.current) setLoading(false);
    }
  // filtersKey intentionally provides a stable value-based dependency.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  const loadMore = useCallback(async () => {
    if (nextPage == null || loadingMore) return;
    const generation = generationRef.current;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await projectService.listProjectsPage({
        ...filters,
        page: nextPage,
        pageSize: 24,
      });
      if (generation !== generationRef.current) return;
      setProjects((current) => {
        const existing = new Set(current.map((project) => project.id));
        return [...current, ...page.items.filter((project) => !existing.has(project.id))];
      });
      setNextPage(page.nextPage);
    } catch (caught) {
      if (generation === generationRef.current) {
        setLoadMoreError(caught instanceof Error ? caught.message : String(caught));
      }
    } finally {
      if (generation === generationRef.current) setLoadingMore(false);
    }
  // filtersKey intentionally provides a stable value-based dependency.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, loadingMore, nextPage]);

  useEffect(() => {
    void refresh();
    return () => {
      generationRef.current += 1;
    };
  }, [refresh]);

  return {
    projects,
    loading,
    loadingMore,
    error,
    loadMoreError,
    hasMore: nextPage != null,
    refresh,
    loadMore,
  };
}

export function useProjectMetrics() {
  const [metrics, setMetrics] = useState({ activeCount: 0, plannedValue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMetrics(await projectService.getProjectMetrics());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { metrics, loading, error, refresh };
}

export function useCurrentProjectUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void projectService.getCurrentUserId()
      .then((value) => {
        if (active) setUserId(value);
      })
      .catch(() => {
        if (active) setUserId(null);
      });
    return () => {
      active = false;
    };
  }, []);
  return userId;
}
