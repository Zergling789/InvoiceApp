import { useCallback, useEffect, useState } from "react";
import type { Project } from "@/domain/types";
import * as projectService from "./projectService";
import { useCursorPages } from "@/app/shared/useCursorPages";
import type { ProjectPageOptions } from "@/db/projectsDb";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await projectService.listProjects();
      setProjects(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { projects, loading, error, refresh };
}

export function useProjectPages(
  filters: Pick<ProjectPageOptions, "search" | "status" | "matchingClientIds">,
) {
  const { search = "", status = "all", matchingClientIds = [] } = filters;
  const clientIdsKey = matchingClientIds.join(",");
  const loadPage = useCallback(
    (options: Parameters<typeof projectService.listProjectsPage>[0]) =>
      projectService.listProjectsPage({
        ...options,
        search,
        status,
        matchingClientIds: clientIdsKey ? clientIdsKey.split(",") : [],
      }),
    [clientIdsKey, search, status],
  );
  const pages = useCursorPages(loadPage);
  return { ...pages, projects: pages.items };
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
