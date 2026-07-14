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

test.describe.serial("RLS tenant isolation", () => {
  test.skip(!hasE2eSupabaseEnv, "Dedicated Supabase E2E credentials are not configured.");

  let owner: TestUser;
  let attacker: TestUser;
  let ownerClientId: string;

  test.beforeAll(async () => {
    owner = await createTestUser();
    attacker = await createTestUser();
    ownerClientId = crypto.randomUUID();
    const { error } = await admin.from("clients").insert({
      id: ownerClientId,
      user_id: owner.id,
      company_name: "Vertraulicher Kunde GmbH",
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  });

  test.afterAll(async () => {
    if (owner?.id) await deleteTestUser(owner.id);
    if (attacker?.id) await deleteTestUser(attacker.id);
  });

  test("another user cannot read, change or delete an owned customer", async () => {
    const attackerClient = await createAuthenticatedClient(attacker);

    const read = await attackerClient.from("clients").select("id").eq("id", ownerClientId);
    expect(read.error).toBeNull();
    expect(read.data).toEqual([]);

    const update = await attackerClient
      .from("clients")
      .update({ company_name: "Übernommen" })
      .eq("id", ownerClientId)
      .select("id");
    expect(update.error).toBeNull();
    expect(update.data).toEqual([]);

    const deletion = await attackerClient
      .from("clients")
      .delete()
      .eq("id", ownerClientId)
      .select("id");
    expect(deletion.error).toBeNull();
    expect(deletion.data).toEqual([]);
  });

  test("another user cannot insert a customer for the owner", async () => {
    const attackerClient = await createAuthenticatedClient(attacker);
    const result = await attackerClient.from("clients").insert({
      id: crypto.randomUUID(),
      user_id: owner.id,
      company_name: "Gefälschter Datensatz",
      updated_at: new Date().toISOString(),
    });

    expect(result.error).not.toBeNull();
  });

  test("owner still has normal access to the same record", async () => {
    const ownerClient = await createAuthenticatedClient(owner);
    const result = await ownerClient
      .from("clients")
      .select("id,company_name")
      .eq("id", ownerClientId)
      .single();

    expect(result.error).toBeNull();
    expect(result.data?.company_name).toBe("Vertraulicher Kunde GmbH");
  });
});
