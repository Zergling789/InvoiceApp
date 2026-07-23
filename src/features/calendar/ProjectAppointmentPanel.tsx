import { useState, type FormEvent } from "react";
import { CalendarPlus, Clock3, MapPin, Pencil, X } from "lucide-react";

import * as appointmentService from "@/app/calendar/projectAppointmentService";
import type {
  ProjectAppointment,
  ProjectAppointmentType,
} from "@/domain/projects";
import {
  PROJECT_APPOINTMENT_TYPES,
  PROJECT_APPOINTMENT_TYPE_LABELS,
} from "@/domain/projects";
import { AppBadge } from "@/ui/AppBadge";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { useToast } from "@/ui/FeedbackProvider";

type AppointmentDraft = {
  title: string;
  startsAt: string;
  endsAt: string;
  appointmentType: ProjectAppointmentType;
  location: string;
  note: string;
};

const toLocalDateTime = (value: Date | string) => {
  const date = typeof value === "string" ? new Date(value) : value;
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const createInitialDraft = (
  appointmentType: ProjectAppointmentType,
): AppointmentDraft => {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    title: "",
    startsAt: toLocalDateTime(start),
    endsAt: toLocalDateTime(end),
    appointmentType,
    location: "",
    note: "",
  };
};

const formatAppointmentTime = (startsAt: string, endsAt: string) => {
  const starts = new Date(startsAt);
  const ends = new Date(endsAt);
  const sameDay = starts.toDateString() === ends.toDateString();
  const date = new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(starts);
  const startTime = new Intl.DateTimeFormat("de-DE", {
    timeStyle: "short",
  }).format(starts);
  const end = new Intl.DateTimeFormat(
    "de-DE",
    sameDay ? { timeStyle: "short" } : { dateStyle: "medium", timeStyle: "short" },
  ).format(ends);
  return `${date}, ${startTime}–${end}`;
};

type Props = {
  projectId: string;
  appointments: ProjectAppointment[];
  defaultType?: ProjectAppointmentType;
  initialCreateOpen?: boolean;
  onAppointmentsChange: (appointments: ProjectAppointment[]) => void;
  onActivitiesChange: () => Promise<void>;
};

export function ProjectAppointmentPanel({
  projectId,
  appointments,
  defaultType = "other",
  initialCreateOpen = false,
  onAppointmentsChange,
  onActivitiesChange,
}: Props) {
  const toast = useToast();
  const [creating, setCreating] = useState(initialCreateOpen);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => createInitialDraft(defaultType));
  const [busy, setBusy] = useState(false);

  const resetEditor = () => {
    setCreating(false);
    setEditingId(null);
    setDraft(createInitialDraft(defaultType));
  };

  const edit = (appointment: ProjectAppointment) => {
    setCreating(false);
    setEditingId(appointment.id);
    setDraft({
      title: appointment.title,
      startsAt: toLocalDateTime(appointment.startsAt),
      endsAt: toLocalDateTime(appointment.endsAt),
      appointmentType: appointment.appointmentType,
      location: appointment.location ?? "",
      note: appointment.note ?? "",
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const input = {
        title: draft.title,
        startsAt: new Date(draft.startsAt).toISOString(),
        endsAt: new Date(draft.endsAt).toISOString(),
        appointmentType: draft.appointmentType,
        location: draft.location,
        note: draft.note,
      };
      if (editingId) {
        const updated = await appointmentService.updateProjectAppointment(
          editingId,
          input,
        );
        onAppointmentsChange(
          appointments
            .map((appointment) =>
              appointment.id === updated.id ? updated : appointment,
            )
            .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
        );
        toast.success("Termin aktualisiert.");
      } else {
        const created = await appointmentService.createProjectAppointment(
          projectId,
          input,
        );
        onAppointmentsChange(
          [...appointments, created].sort((a, b) =>
            a.startsAt.localeCompare(b.startsAt),
          ),
        );
        toast.success("Termin erstellt.");
      }
      await onActivitiesChange().catch(() => undefined);
      resetEditor();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Termin konnte nicht gespeichert werden.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Projekttermine</h2>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            Besichtigungen, Projektstarts und weitere verbindliche Termine.
          </p>
        </div>
        <AppButton
          onClick={() => {
            setEditingId(null);
            setDraft(createInitialDraft(defaultType));
            setCreating(true);
          }}
        >
          <CalendarPlus size={16} /> Termin erstellen
        </AppButton>
      </div>

      {(creating || editingId) && (
        <AppCard className="p-5">
          <form className="space-y-4" onSubmit={submit}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">
                {editingId ? "Termin bearbeiten" : "Neuer Termin"}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium sm:col-span-2">
                Titel
                <input
                  autoFocus
                  required
                  maxLength={240}
                  className="app-input mt-1 w-full"
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="block text-sm font-medium">
                Beginn
                <input
                  required
                  type="datetime-local"
                  className="app-input mt-1 w-full"
                  value={draft.startsAt}
                  onChange={(event) => {
                    const startsAt = event.target.value;
                    setDraft((current) => {
                      const start = new Date(startsAt).getTime();
                      const currentEnd = new Date(current.endsAt).getTime();
                      return {
                        ...current,
                        startsAt,
                        endsAt:
                          Number.isFinite(start) && currentEnd <= start
                            ? toLocalDateTime(new Date(start + 60 * 60 * 1000))
                            : current.endsAt,
                      };
                    });
                  }}
                />
              </label>
              <label className="block text-sm font-medium">
                Ende
                <input
                  required
                  type="datetime-local"
                  className="app-input mt-1 w-full"
                  value={draft.endsAt}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      endsAt: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="block text-sm font-medium">
                Terminart
                <select
                  className="app-input mt-1 w-full"
                  value={draft.appointmentType}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      appointmentType: event.target.value as ProjectAppointmentType,
                    }))
                  }
                >
                  {PROJECT_APPOINTMENT_TYPES.map((appointmentType) => (
                    <option key={appointmentType} value={appointmentType}>
                      {PROJECT_APPOINTMENT_TYPE_LABELS[appointmentType]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Ort
                <input
                  maxLength={500}
                  className="app-input mt-1 w-full"
                  placeholder="Projektadresse oder Treffpunkt"
                  value={draft.location}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="block text-sm font-medium sm:col-span-2">
                Notiz
                <textarea
                  rows={3}
                  maxLength={5000}
                  className="app-input mt-1 w-full resize-y"
                  value={draft.note}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <AppButton
                type="submit"
                disabled={!draft.title.trim() || busy}
              >
                {editingId ? "Änderungen speichern" : "Termin anlegen"}
              </AppButton>
              <AppButton type="button" variant="ghost" onClick={resetEditor}>
                Abbrechen
              </AppButton>
            </div>
          </form>
        </AppCard>
      )}

      {!appointments.length ? (
        <AppCard className="p-8 text-center">
          <h3 className="font-semibold">Noch keine kommenden Termine</h3>
          <p className="mt-2 text-sm text-[var(--app-muted)]">
            Plane die nächste Besichtigung oder den Projektstart.
          </p>
        </AppCard>
      ) : (
        <ul className="space-y-3">
          {appointments.map((appointment) => (
            <li key={appointment.id}>
              <AppCard className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{appointment.title}</h3>
                      <AppBadge color="blue">
                        {PROJECT_APPOINTMENT_TYPE_LABELS[appointment.appointmentType]}
                      </AppBadge>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-[var(--app-muted)]">
                      <Clock3 size={15} />
                      <span>
                        {formatAppointmentTime(
                          appointment.startsAt,
                          appointment.endsAt,
                        )}
                      </span>
                    </div>
                    {appointment.location && (
                      <a
                        className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[var(--app-primary)] hover:underline"
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appointment.location)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MapPin size={15} /> {appointment.location}
                      </a>
                    )}
                    {appointment.note && (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--app-muted)]">
                        {appointment.note}
                      </p>
                    )}
                  </div>
                  <AppButton
                    variant="ghost"
                    aria-label={`${appointment.title} bearbeiten`}
                    onClick={() => edit(appointment)}
                  >
                    <Pencil size={16} /> Bearbeiten
                  </AppButton>
                </div>
              </AppCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
