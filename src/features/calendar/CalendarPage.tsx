import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import * as appointmentService from "@/app/calendar/projectAppointmentService";
import * as projectService from "@/app/projects/projectService";
import type { ProjectAppointmentWithProject } from "@/domain/projects";
import { PROJECT_APPOINTMENT_TYPE_LABELS } from "@/domain/projects";
import type { Project } from "@/types";
import { LoadErrorCard } from "@/components/LoadErrorCard";
import { AppBadge } from "@/ui/AppBadge";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";

type CalendarView = "week" | "month";

const startOfDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const addDays = (date: Date, amount: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
};

const startOfWeek = (date: Date) => {
  const result = startOfDay(date);
  const mondayOffset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - mondayOffset);
  return result;
};

const startOfMonthGrid = (date: Date) =>
  startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));

const dateKey = (date: Date | string) => {
  const value = typeof date === "string" ? new Date(date) : date;
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
};

const parseAnchor = (value: string | null) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return startOfDay(new Date());
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? startOfDay(new Date()) : parsed;
};

const getRange = (anchor: Date, view: CalendarView) => {
  const from = view === "week" ? startOfWeek(anchor) : startOfMonthGrid(anchor);
  const dayCount = view === "week" ? 7 : 42;
  return {
    from,
    to: addDays(from, dayCount),
    days: Array.from({ length: dayCount }, (_, index) => addDays(from, index)),
  };
};

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("de-DE", { timeStyle: "short" }).format(new Date(value));

export default function CalendarPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const view: CalendarView = searchParams.get("view") === "month" ? "month" : "week";
  const anchorParam = searchParams.get("date");
  const anchor = useMemo(
    () => parseAnchor(anchorParam),
    [anchorParam],
  );
  const range = useMemo(() => getRange(anchor, view), [anchor, view]);
  const [appointments, setAppointments] = useState<ProjectAppointmentWithProject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    void Promise.all([
      appointmentService.listProjectAppointments({
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        limit: 250,
      }),
      projectService.listProjectsPage({
        statuses: ["active"],
        sort: "updated",
        pageSize: 100,
      }),
    ])
      .then(([appointmentData, projectPage]) => {
        if (!active) return;
        setAppointments(appointmentData);
        setProjects(projectPage.items);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [range.from, range.to, reloadToken]);

  const appointmentsByDay = useMemo(() => {
    const result = new Map<string, ProjectAppointmentWithProject[]>();
    appointments.forEach((appointment) => {
      const key = dateKey(appointment.startsAt);
      result.set(key, [...(result.get(key) ?? []), appointment]);
    });
    return result;
  }, [appointments]);

  const updateNavigation = (nextAnchor: Date, nextView = view) => {
    setSearchParams({
      view: nextView,
      date: dateKey(nextAnchor),
    });
  };

  const move = (direction: -1 | 1) => {
    const next = new Date(anchor);
    if (view === "week") next.setDate(next.getDate() + direction * 7);
    else {
      next.setDate(1);
      next.setMonth(next.getMonth() + direction);
    }
    updateNavigation(next);
  };

  const title =
    view === "week"
      ? `${new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(range.from)} – ${new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(addDays(range.to, -1))}`
      : new Intl.DateTimeFormat("de-DE", {
          month: "long",
          year: "numeric",
        }).format(anchor);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="app-eyebrow">Planung</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Kalender</h1>
          <p className="mt-2 text-sm text-[var(--app-muted)]">
            Projekttermine aus einem gemeinsamen, organisationsbezogenen Kalender.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            aria-label="Projekt für neuen Termin"
            className="app-input min-w-[240px]"
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
          >
            <option value="">Projekt auswählen</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.projectNumber ? `${project.projectNumber} · ` : ""}
                {project.name}
              </option>
            ))}
          </select>
          <AppButton
            disabled={!selectedProjectId}
            onClick={() =>
              navigate(
                `/app/projects/${selectedProjectId}?tab=termine&action=new`,
              )
            }
          >
            Termin anlegen
          </AppButton>
        </div>
      </header>

      <div className="flex flex-col gap-3 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-surface-solid)] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <AppButton variant="ghost" aria-label="Vorheriger Zeitraum" onClick={() => move(-1)}>
            <ChevronLeft size={18} />
          </AppButton>
          <AppButton variant="secondary" onClick={() => updateNavigation(new Date())}>
            Heute
          </AppButton>
          <AppButton variant="ghost" aria-label="Nächster Zeitraum" onClick={() => move(1)}>
            <ChevronRight size={18} />
          </AppButton>
          <span className="ml-1 text-sm font-semibold">{title}</span>
        </div>
        <div className="flex gap-2">
          <AppButton
            variant={view === "week" ? "primary" : "secondary"}
            onClick={() => updateNavigation(anchor, "week")}
          >
            Woche
          </AppButton>
          <AppButton
            variant={view === "month" ? "primary" : "secondary"}
            onClick={() => updateNavigation(anchor, "month")}
          >
            Monat
          </AppButton>
        </div>
      </div>

      {loading && (
        <div role="status">
          <AppCard className="p-6 text-sm text-[var(--app-muted)]">
            Termine werden geladen …
          </AppCard>
        </div>
      )}
      {!loading && error && (
        <LoadErrorCard
          title="Kalender konnte nicht geladen werden"
          onRetry={() => setReloadToken((current) => current + 1)}
        />
      )}
      {!loading && !error && appointments.length === 0 && (
        <AppCard className="p-8 text-center">
          <CalendarDays className="mx-auto text-[var(--app-muted)]" size={28} />
          <h2 className="mt-3 font-semibold">Keine Termine in diesem Zeitraum</h2>
          <p className="mt-2 text-sm text-[var(--app-muted)]">
            Wähle oben ein Projekt aus und plane den nächsten Termin.
          </p>
        </AppCard>
      )}

      {!loading && !error && appointments.length > 0 && (
        <>
          <div className="hidden grid-cols-7 overflow-hidden rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-surface-solid)] lg:grid">
            {range.days.map((day) => {
              const dayAppointments = appointmentsByDay.get(dateKey(day)) ?? [];
              const outsideMonth =
                view === "month" && day.getMonth() !== anchor.getMonth();
              return (
                <section
                  key={dateKey(day)}
                  className={`min-h-40 border-b border-r border-[var(--app-border)] p-2 ${outsideMonth ? "bg-black/[0.025] text-[var(--app-muted)]" : ""}`}
                >
                  <h2 className="text-xs font-semibold">
                    {new Intl.DateTimeFormat("de-DE", {
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                    }).format(day)}
                  </h2>
                  <div className="mt-2 space-y-2">
                    {dayAppointments.map((appointment) => (
                      <CalendarAppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        compact
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="space-y-4 lg:hidden">
            {range.days
              .filter((day) => (appointmentsByDay.get(dateKey(day)) ?? []).length > 0)
              .map((day) => (
                <section key={dateKey(day)}>
                  <h2 className="mb-2 text-sm font-semibold">
                    {new Intl.DateTimeFormat("de-DE", {
                      weekday: "long",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }).format(day)}
                  </h2>
                  <div className="space-y-2">
                    {(appointmentsByDay.get(dateKey(day)) ?? []).map((appointment) => (
                      <CalendarAppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                      />
                    ))}
                  </div>
                </section>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

function CalendarAppointmentCard({
  appointment,
  compact = false,
}: {
  appointment: ProjectAppointmentWithProject;
  compact?: boolean;
}) {
  return (
    <Link
      to={
        appointment.projectId
          ? `/app/projects/${appointment.projectId}?tab=termine`
          : "/app/calendar"
      }
      className={`block rounded-xl border border-blue-500/15 bg-blue-500/[0.06] hover:border-blue-500/35 ${compact ? "p-2" : "p-4"}`}
    >
      <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">
        {formatTime(appointment.startsAt)}–{formatTime(appointment.endsAt)}
      </div>
      <div className="mt-1 text-sm font-semibold">{appointment.title}</div>
      {!compact && (
        <>
          <div className="mt-2 flex flex-wrap gap-2">
            <AppBadge color="blue">
              {PROJECT_APPOINTMENT_TYPE_LABELS[appointment.appointmentType]}
            </AppBadge>
            {appointment.projectTitle && (
              <span className="text-xs text-[var(--app-muted)]">
                {appointment.projectTitle}
              </span>
            )}
          </div>
          {appointment.location && (
            <div className="mt-2 flex items-center gap-1 text-xs text-[var(--app-muted)]">
              <MapPin size={13} /> {appointment.location}
            </div>
          )}
        </>
      )}
    </Link>
  );
}
