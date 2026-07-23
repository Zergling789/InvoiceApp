import { useMemo, useState, type FormEvent } from "react";
import { Check, Pencil, Plus, RotateCcw, X } from "lucide-react";

import * as projectTaskService from "@/app/tasks/projectTaskService";
import type { ProjectTask, ProjectTaskStatus } from "@/domain/projects";
import {
  PROJECT_PRIORITIES,
  PROJECT_PRIORITY_LABELS,
  PROJECT_TASK_STATUS_LABELS,
} from "@/domain/projects";
import type { ProjectTaskAssignee } from "@/db/projectTasksDb";
import { AppBadge } from "@/ui/AppBadge";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { useToast } from "@/ui/FeedbackProvider";

type TaskDraft = {
  title: string;
  description: string;
  priority: ProjectTask["priority"];
  dueAt: string;
  assignedUserId: string;
};

const emptyDraft: TaskDraft = {
  title: "",
  description: "",
  priority: "normal",
  dueAt: "",
  assignedUserId: "",
};

const toLocalDateTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Ohne Fälligkeit";

const statusTone = (status: ProjectTaskStatus) => {
  if (status === "completed") return "green" as const;
  if (status === "in_progress") return "blue" as const;
  return "gray" as const;
};

type Props = {
  projectId: string;
  tasks: ProjectTask[];
  assignees: ProjectTaskAssignee[];
  onTasksChange: (tasks: ProjectTask[]) => void;
  onActivitiesChange: () => Promise<void>;
};

export function ProjectTaskPanel({
  projectId,
  tasks,
  assignees,
  onTasksChange,
  onActivitiesChange,
}: Props) {
  const toast = useToast();
  const [showCompleted, setShowCompleted] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [busyId, setBusyId] = useState<string | null>(null);

  const visibleTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          showCompleted || (task.status !== "completed" && task.status !== "cancelled"),
      ),
    [showCompleted, tasks],
  );
  const assigneeNames = useMemo(
    () => new Map(assignees.map((entry) => [entry.userId, entry.displayName])),
    [assignees],
  );

  const resetEditor = () => {
    setCreating(false);
    setEditingId(null);
    setDraft(emptyDraft);
  };

  const replaceTask = (updated: ProjectTask) => {
    onTasksChange(tasks.map((task) => (task.id === updated.id ? updated : task)));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusyId(editingId ?? "create");
    try {
      const input = {
        title: draft.title,
        description: draft.description,
        priority: draft.priority,
        dueAt: draft.dueAt ? new Date(draft.dueAt).toISOString() : null,
        assignedUserId: draft.assignedUserId || null,
      };
      if (editingId) {
        const updated = await projectTaskService.updateProjectTask(editingId, input);
        replaceTask(updated);
        toast.success("Aufgabe aktualisiert.");
      } else {
        const created = await projectTaskService.createProjectTask(projectId, {
          ...input,
          dueAt: input.dueAt ?? undefined,
          assignedUserId: input.assignedUserId ?? undefined,
        });
        onTasksChange([created, ...tasks]);
        await onActivitiesChange().catch(() => undefined);
        toast.success("Aufgabe erstellt.");
      }
      resetEditor();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Aufgabe konnte nicht gespeichert werden.");
    } finally {
      setBusyId(null);
    }
  };

  const edit = (task: ProjectTask) => {
    setCreating(false);
    setEditingId(task.id);
    setDraft({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      dueAt: toLocalDateTime(task.dueAt),
      assignedUserId: task.assignedUserId ?? "",
    });
  };

  const updateStatus = async (task: ProjectTask, status: ProjectTaskStatus) => {
    setBusyId(task.id);
    try {
      const updated = await projectTaskService.updateProjectTask(task.id, { status });
      replaceTask(updated);
      if (status === "completed") {
        await onActivitiesChange().catch(() => undefined);
      }
      toast.success(status === "completed" ? "Aufgabe erledigt." : "Aufgabenstatus aktualisiert.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Aufgabe konnte nicht aktualisiert werden.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Projektaufgaben</h2>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            Kleine, konkrete Arbeitsschritte für dieses Projekt.
          </p>
        </div>
        <AppButton
          onClick={() => {
            setEditingId(null);
            setDraft(emptyDraft);
            setCreating(true);
          }}
        >
          <Plus size={16} /> Aufgabe erstellen
        </AppButton>
      </div>

      {(creating || editingId) && (
        <AppCard className="p-5">
          <form className="space-y-4" onSubmit={submit}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">
                {editingId ? "Aufgabe bearbeiten" : "Neue Aufgabe"}
              </h3>
              <button
                type="button"
                className="rounded-full p-2 text-[var(--app-muted)] hover:bg-black/5"
                aria-label="Editor schließen"
                onClick={resetEditor}
              >
                <X size={18} />
              </button>
            </div>
            <label className="block text-sm font-medium">
              Titel
              <input
                autoFocus
                required
                maxLength={240}
                className="app-input mt-1 w-full"
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              />
            </label>
            <label className="block text-sm font-medium">
              Beschreibung
              <textarea
                maxLength={5000}
                rows={3}
                className="app-input mt-1 w-full resize-y"
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-sm font-medium">
                Priorität
                <select
                  className="app-input mt-1 w-full"
                  value={draft.priority}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      priority: event.target.value as ProjectTask["priority"],
                    }))
                  }
                >
                  {PROJECT_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {PROJECT_PRIORITY_LABELS[priority]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Fällig am
                <input
                  type="datetime-local"
                  className="app-input mt-1 w-full"
                  value={draft.dueAt}
                  onChange={(event) => setDraft((current) => ({ ...current, dueAt: event.target.value }))}
                />
              </label>
              <label className="block text-sm font-medium">
                Zuständig
                <select
                  className="app-input mt-1 w-full"
                  value={draft.assignedUserId}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, assignedUserId: event.target.value }))
                  }
                >
                  <option value="">Nicht zugewiesen</option>
                  {assignees.map((assignee) => (
                    <option key={assignee.userId} value={assignee.userId}>
                      {assignee.displayName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <AppButton type="submit" disabled={!draft.title.trim() || busyId != null}>
                {editingId ? "Änderungen speichern" : "Aufgabe anlegen"}
              </AppButton>
              <AppButton type="button" variant="ghost" onClick={resetEditor}>
                Abbrechen
              </AppButton>
            </div>
          </form>
        </AppCard>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-[var(--app-muted)]">
          {tasks.filter((task) => task.status === "open" || task.status === "in_progress").length} offen
        </span>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(event) => setShowCompleted(event.target.checked)}
          />
          Erledigte anzeigen
        </label>
      </div>

      {!visibleTasks.length ? (
        <AppCard className="p-8 text-center">
          <h3 className="font-semibold">Noch keine offenen Aufgaben</h3>
          <p className="mt-2 text-sm text-[var(--app-muted)]">
            Lege den nächsten konkreten Arbeitsschritt für dieses Projekt an.
          </p>
        </AppCard>
      ) : (
        <ul className="space-y-3">
          {visibleTasks.map((task) => {
            const overdue =
              task.dueAt &&
              task.status !== "completed" &&
              task.status !== "cancelled" &&
              new Date(task.dueAt) < new Date();
            return (
              <li key={task.id}>
                <AppCard className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={task.status === "completed" ? "font-semibold line-through opacity-70" : "font-semibold"}>
                          {task.title}
                        </h3>
                        <AppBadge color={statusTone(task.status)}>
                          {PROJECT_TASK_STATUS_LABELS[task.status]}
                        </AppBadge>
                        {overdue && <AppBadge color="red">Überfällig</AppBadge>}
                        {(task.priority === "high" || task.priority === "urgent") && (
                          <AppBadge color={task.priority === "urgent" ? "red" : "yellow"}>
                            {PROJECT_PRIORITY_LABELS[task.priority]}
                          </AppBadge>
                        )}
                      </div>
                      {task.description && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--app-muted)]">
                          {task.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--app-muted)]">
                        <span>{formatDate(task.dueAt)}</span>
                        <span>
                          {task.assignedUserId
                            ? assigneeNames.get(task.assignedUserId) ?? "Teammitglied"
                            : "Nicht zugewiesen"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {task.status === "open" && (
                        <AppButton
                          variant="secondary"
                          disabled={busyId === task.id}
                          onClick={() => void updateStatus(task, "in_progress")}
                        >
                          Starten
                        </AppButton>
                      )}
                      {(task.status === "open" || task.status === "in_progress") && (
                        <AppButton
                          disabled={busyId === task.id}
                          onClick={() => void updateStatus(task, "completed")}
                        >
                          <Check size={16} /> Erledigen
                        </AppButton>
                      )}
                      {(task.status === "completed" || task.status === "cancelled") && (
                        <AppButton
                          variant="secondary"
                          disabled={busyId === task.id}
                          onClick={() => void updateStatus(task, "open")}
                        >
                          <RotateCcw size={16} /> Wieder öffnen
                        </AppButton>
                      )}
                      <AppButton
                        variant="ghost"
                        disabled={busyId === task.id}
                        aria-label={`${task.title} bearbeiten`}
                        onClick={() => edit(task)}
                      >
                        <Pencil size={16} /> Bearbeiten
                      </AppButton>
                    </div>
                  </div>
                </AppCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
