import type {
  ProjectAppointment,
  ProjectAppointmentWithProject,
} from "@/domain/projects";
import type { Database, Json } from "@/lib/supabase.types";
import { supabase } from "@/supabaseClient";

type AppointmentRow = Database["public"]["Tables"]["project_appointments"]["Row"];

const APPOINTMENT_FIELDS =
  "id,organization_id,project_id,customer_id,title,starts_at,ends_at,appointment_type,location,note,created_by,created_at,updated_at" as const;

const toProjectAppointment = (row: AppointmentRow): ProjectAppointment => ({
  id: row.id,
  organizationId: row.organization_id,
  projectId: row.project_id,
  customerId: row.customer_id,
  title: row.title,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  appointmentType: row.appointment_type as ProjectAppointment["appointmentType"],
  location: row.location,
  note: row.note,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export type ProjectAppointmentListOptions = {
  projectId?: string;
  from: string;
  to: string;
  limit?: number;
};

export async function dbListProjectAppointments(
  options: ProjectAppointmentListOptions,
): Promise<ProjectAppointmentWithProject[]> {
  const limit = Math.min(250, Math.max(1, options.limit ?? 100));
  let query = supabase
    .from("project_appointments")
    .select(APPOINTMENT_FIELDS)
    .lt("starts_at", options.to)
    .gt("ends_at", options.from)
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (options.projectId) query = query.eq("project_id", options.projectId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const appointments = (data ?? []).map((row) =>
    toProjectAppointment(row as AppointmentRow),
  );
  const projectIds = [
    ...new Set(
      appointments
        .map((appointment) => appointment.projectId)
        .filter((projectId): projectId is string => Boolean(projectId)),
    ),
  ];
  if (!projectIds.length) return appointments;

  const { data: projects, error: projectError } = await supabase
    .from("projects")
    .select("id,name,project_number")
    .in("id", projectIds);
  if (projectError) throw new Error(projectError.message);
  const projectsById = new Map((projects ?? []).map((project) => [project.id, project]));

  return appointments.map((appointment) => {
    const project = appointment.projectId
      ? projectsById.get(appointment.projectId)
      : undefined;
    return {
      ...appointment,
      projectTitle: project?.name ?? null,
      projectNumber: project?.project_number ?? null,
    };
  });
}

export async function dbCreateProjectAppointment(
  projectId: string,
  input: Record<string, unknown>,
): Promise<ProjectAppointment> {
  const { data, error } = await supabase.rpc("create_project_appointment", {
    p_project_id: projectId,
    p_appointment: input as Json,
  });
  if (error) throw new Error(error.message);
  return toProjectAppointment(data);
}

export async function dbUpdateProjectAppointment(
  appointmentId: string,
  patch: Record<string, unknown>,
): Promise<ProjectAppointment> {
  const { data, error } = await supabase.rpc("update_project_appointment", {
    p_appointment_id: appointmentId,
    p_patch: patch as Json,
  });
  if (error) throw new Error(error.message);
  return toProjectAppointment(data);
}
