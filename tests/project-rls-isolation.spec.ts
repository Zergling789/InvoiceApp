import crypto from "node:crypto";
import { expect, test } from "playwright/test";

import {
  admin,
  createAuthenticatedClient,
  createTestUser,
  deleteTestUser,
  hasE2eSupabaseEnv,
  type TestUser,
} from "./helpers/supabaseAdmin";

test.describe.serial("project organization isolation", () => {
  test.skip(!hasE2eSupabaseEnv, "Dedicated Supabase E2E credentials are not configured.");

  let owner: TestUser;
  let attacker: TestUser;
  let ownerCustomerId: string;
  let attackerCustomerId: string;
  let ownerProjectId: string;
  let ownerTaskId: string;
  let ownerAppointmentId: string;

  test.beforeAll(async () => {
    owner = await createTestUser();
    attacker = await createTestUser();
    ownerCustomerId = crypto.randomUUID();
    attackerCustomerId = crypto.randomUUID();
    const { error } = await admin.from("clients").insert([
      { id: ownerCustomerId, user_id: owner.id, company_name: "Owner Kunde", updated_at: new Date().toISOString() },
      { id: attackerCustomerId, user_id: attacker.id, company_name: "Attacker Kunde", updated_at: new Date().toISOString() },
    ]);
    if (error) throw error;
    const ownerClient = await createAuthenticatedClient(owner);
    const creation = await ownerClient.rpc("create_project", {
      p_organization_id: owner.id,
      p_project: { title: "Terrasse Owner", customerId: ownerCustomerId, phase: "inquiry", priority: "normal" },
    });
    if (creation.error || !creation.data?.id) throw creation.error ?? new Error("Project was not created");
    ownerProjectId = creation.data.id;
  });

  test.afterAll(async () => {
    if (owner?.id) await deleteTestUser(owner.id);
    if (attacker?.id) await deleteTestUser(attacker.id);
  });

  test("another organization cannot read projects or activities", async () => {
    const attackerClient = await createAuthenticatedClient(attacker);
    expect((await attackerClient.from("projects").select("id").eq("id", ownerProjectId)).data).toEqual([]);
    expect((await attackerClient.from("project_activities").select("id").eq("project_id", ownerProjectId)).data).toEqual([]);
  });

  test("task mutations are organization-scoped and activity events are idempotent", async () => {
    const ownerClient = await createAuthenticatedClient(owner);
    const attackerClient = await createAuthenticatedClient(attacker);
    const creation = await ownerClient.rpc("create_project_task", {
      p_project_id: ownerProjectId,
      p_task: { title: "Materialliste prüfen", priority: "high" },
    });
    expect(creation.error).toBeNull();
    ownerTaskId = creation.data?.id;
    expect(ownerTaskId).toBeTruthy();

    expect(
      (await attackerClient.from("project_tasks").select("id").eq("id", ownerTaskId)).data,
    ).toEqual([]);
    expect(
      (
        await attackerClient.rpc("update_project_task", {
          p_task_id: ownerTaskId,
          p_patch: { status: "completed" },
        })
      ).error,
    ).not.toBeNull();

    const directInsert = await ownerClient.from("project_tasks").insert({
      organization_id: owner.id,
      project_id: ownerProjectId,
      title: "Direkter Schreibversuch",
      created_by: owner.id,
    });
    expect(directInsert.error).not.toBeNull();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const completion = await ownerClient.rpc("update_project_task", {
        p_task_id: ownerTaskId,
        p_patch: { status: "completed" },
      });
      expect(completion.error).toBeNull();
    }

    const activities = await ownerClient
      .from("project_activities")
      .select("id")
      .eq("event_key", `task:${ownerTaskId}:completed`);
    expect(activities.error).toBeNull();
    expect(activities.data).toHaveLength(1);
  });

  test("appointment mutations are organization-scoped and direct writes are blocked", async () => {
    const ownerClient = await createAuthenticatedClient(owner);
    const attackerClient = await createAuthenticatedClient(attacker);
    const creation = await ownerClient.rpc("create_project_appointment", {
      p_project_id: ownerProjectId,
      p_appointment: {
        title: "Besichtigung",
        startsAt: "2026-08-01T08:00:00.000Z",
        endsAt: "2026-08-01T09:00:00.000Z",
        appointmentType: "site_visit",
      },
    });
    expect(creation.error).toBeNull();
    ownerAppointmentId = creation.data?.id;
    expect(ownerAppointmentId).toBeTruthy();

    expect(
      (
        await attackerClient
          .from("project_appointments")
          .select("id")
          .eq("id", ownerAppointmentId)
      ).data,
    ).toEqual([]);
    expect(
      (
        await attackerClient.rpc("update_project_appointment", {
          p_appointment_id: ownerAppointmentId,
          p_patch: { title: "Fremder Termin" },
        })
      ).error,
    ).not.toBeNull();

    const directInsert = await ownerClient.from("project_appointments").insert({
      organization_id: owner.id,
      project_id: ownerProjectId,
      title: "Direkter Schreibversuch",
      starts_at: "2026-08-02T08:00:00.000Z",
      ends_at: "2026-08-02T09:00:00.000Z",
      created_by: owner.id,
    });
    expect(directInsert.error).not.toBeNull();

    const invalidType = await ownerClient.rpc("update_project_appointment", {
      p_appointment_id: ownerAppointmentId,
      p_patch: { appointmentType: "made_up" },
    });
    expect(invalidType.error).not.toBeNull();
  });

  test("a foreign customer cannot be assigned to a project", async () => {
    const attackerClient = await createAuthenticatedClient(attacker);
    const result = await attackerClient.rpc("create_project", {
      p_organization_id: attacker.id,
      p_project: { title: "Fremder Kunde", customerId: ownerCustomerId, phase: "inquiry", priority: "normal" },
    });
    expect(result.error).not.toBeNull();
  });

  test("foreign projects cannot be linked to offers or invoices", async () => {
    const attackerClient = await createAuthenticatedClient(attacker);
    const offer = await attackerClient.from("offers").insert({
      id: crypto.randomUUID(),
      user_id: attacker.id,
      client_id: attackerCustomerId,
      project_id: ownerProjectId,
      number: "AN-X",
    });
    expect(offer.error).not.toBeNull();

    const invoice = await attackerClient.from("invoices").insert({
      id: crypto.randomUUID(),
      user_id: attacker.id,
      client_id: attackerCustomerId,
      project_id: ownerProjectId,
      due_date: "2026-08-31",
    });
    expect(invoice.error).not.toBeNull();
  });

  test("invalid phases are rejected", async () => {
    const ownerClient = await createAuthenticatedClient(owner);
    const result = await ownerClient.rpc("create_project", {
      p_organization_id: owner.id,
      p_project: { title: "Ungültig", phase: "made_up", priority: "normal" },
    });
    expect(result.error).not.toBeNull();
  });
});
