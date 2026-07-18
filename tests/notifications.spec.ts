import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { expect, test } from "playwright/test";

import {
  admin,
  createAuthenticatedClient,
  createClientRecord,
  createTestUser,
  deleteTestUser,
  hasE2eSupabaseEnv,
  type TestUser,
} from "./helpers/supabaseAdmin";

const SUPABASE_URL = process.env.E2E_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.E2E_SUPABASE_ANON_KEY;

test.describe.serial("in-app notifications", () => {
  test.skip(!hasE2eSupabaseEnv, "Dedicated Supabase E2E credentials are not configured.");

  let owner: TestUser;
  let attacker: TestUser;
  let clientId: string;
  let offerId: string;
  let linkId: string;
  let seededNotificationId: string;

  test.beforeAll(async () => {
    owner = await createTestUser();
    attacker = await createTestUser();
    clientId = (await createClientRecord({
      userId: owner.id,
      companyName: "Benachrichtigung Kunde GmbH",
      contactPerson: "Max Mustermann",
      email: "notifications@example.com",
      address: "Testweg 1\n12345 Berlin",
    })).id;

    const updatedAt = new Date().toISOString();
    const { data: offer, error: offerError } = await admin
      .from("offers")
      .insert({
        user_id: owner.id,
        client_id: clientId,
        number: "ANG-NOTIFY-1",
        date: new Date().toISOString().slice(0, 10),
        valid_until: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        positions: [{ id: crypto.randomUUID(), description: "Montage", quantity: 1, unit: "Std", price: 100 }],
        vat_rate: 19,
        status: "SENT",
        updated_at: updatedAt,
      })
      .select("id,updated_at")
      .single();
    if (offerError || !offer) throw offerError ?? new Error("Offer seed failed");
    offerId = offer.id;

    const { data: link, error: linkError } = await admin
      .from("document_recipient_links")
      .insert({
        user_id: owner.id,
        document_type: "offer",
        document_id: offerId,
        token_hash: crypto.randomBytes(32).toString("hex"),
        document_updated_at: offer.updated_at,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      })
      .select("id")
      .single();
    if (linkError || !link) throw linkError ?? new Error("Recipient link seed failed");
    linkId = link.id;

    const { data: notificationId, error: notificationError } = await admin.rpc("create_notification", {
      p_user_id: owner.id,
      p_type: "system",
      p_title: "Testhinweis",
      p_message: "Nur der Eigentümer darf diesen Hinweis sehen.",
      p_entity_type: "system",
      p_entity_id: null,
      p_action_url: "/app",
      p_metadata: {},
      p_event_key: `system:${owner.id}:rls-test`,
    });
    if (notificationError || !notificationId) throw notificationError ?? new Error("Notification seed failed");
    seededNotificationId = notificationId;
  });

  test.afterAll(async () => {
    if (owner?.id) await deleteTestUser(owner.id);
    if (attacker?.id) await deleteTestUser(attacker.id);
  });

  test("RLS isolates reads and read-state changes", async () => {
    const ownerClient = await createAuthenticatedClient(owner);
    const attackerClient = await createAuthenticatedClient(attacker);

    const ownRead = await ownerClient.from("notifications").select("id").eq("id", seededNotificationId);
    expect(ownRead.error).toBeNull();
    expect(ownRead.data).toHaveLength(1);

    const foreignRead = await attackerClient.from("notifications").select("id").eq("id", seededNotificationId);
    expect(foreignRead.error).toBeNull();
    expect(foreignRead.data).toEqual([]);

    const foreignUpdate = await attackerClient
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", seededNotificationId)
      .select("id");
    expect(foreignUpdate.error).toBeNull();
    expect(foreignUpdate.data).toEqual([]);

    const ownUpdate = await ownerClient
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", seededNotificationId)
      .select("is_read");
    expect(ownUpdate.error).toBeNull();
    expect(ownUpdate.data?.[0]?.is_read).toBe(true);

    const resetReadState = await ownerClient
      .from("notifications")
      .update({ is_read: false, read_at: null })
      .eq("id", seededNotificationId);
    expect(resetReadState.error).not.toBeNull();
  });

  test("anonymous and normal browser clients cannot create notifications", async () => {
    const anonymous = createClient(
      SUPABASE_URL ?? "https://example.supabase.co",
      SUPABASE_ANON_KEY ?? "missing-e2e-anon-key",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const anonymousRead = await anonymous.from("notifications").select("id");
    expect(anonymousRead.error).not.toBeNull();

    const attackerClient = await createAuthenticatedClient(attacker);
    const forgedInsert = await attackerClient.from("notifications").insert({
      user_id: owner.id,
      type: "system",
      title: "Gefälscht",
      message: "Dieser Eintrag darf nicht entstehen.",
    });
    expect(forgedInsert.error).not.toBeNull();
  });

  test("accepting an offer creates exactly one owner notification", async () => {
    const first = await admin.rpc("respond_to_offer_link", {
      p_link_id: linkId,
      p_response: "ACCEPTED",
      p_rejection_reason: null,
    });
    expect(first.error).toBeNull();
    expect(first.data).toBe("ACCEPTED");

    const repeated = await admin.rpc("respond_to_offer_link", {
      p_link_id: linkId,
      p_response: "ACCEPTED",
      p_rejection_reason: null,
    });
    expect(repeated.error).toBeNull();

    const { data, error } = await admin
      .from("notifications")
      .select("user_id,type,action_url,event_key")
      .eq("user_id", owner.id)
      .eq("event_key", `offer:${offerId}:accepted`);
    expect(error).toBeNull();
    expect(data).toEqual([{
      user_id: owner.id,
      type: "offer_accepted",
      action_url: `/app/offers/${offerId}`,
      event_key: `offer:${offerId}:accepted`,
    }]);
  });

  test("rejecting an offer creates exactly one owner notification", async () => {
    const rejectedOfferId = crypto.randomUUID();
    const rejectedLinkId = crypto.randomUUID();
    const updatedAt = new Date().toISOString();
    const { error: offerError } = await admin.from("offers").insert({
      id: rejectedOfferId,
      user_id: owner.id,
      client_id: clientId,
      number: "ANG-NOTIFY-REJECTED",
      date: new Date().toISOString().slice(0, 10),
      valid_until: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      positions: [],
      vat_rate: 19,
      status: "SENT",
      updated_at: updatedAt,
    });
    if (offerError) throw offerError;
    const { data: storedOffer, error: storedOfferError } = await admin
      .from("offers")
      .select("updated_at")
      .eq("id", rejectedOfferId)
      .single();
    if (storedOfferError || !storedOffer) throw storedOfferError ?? new Error("Rejected offer seed failed");
    const { error: linkError } = await admin.from("document_recipient_links").insert({
      id: rejectedLinkId,
      user_id: owner.id,
      document_type: "offer",
      document_id: rejectedOfferId,
      token_hash: crypto.randomBytes(32).toString("hex"),
      document_updated_at: storedOffer.updated_at,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    });
    if (linkError) throw linkError;

    const first = await admin.rpc("respond_to_offer_link", {
      p_link_id: rejectedLinkId,
      p_response: "REJECTED",
      p_rejection_reason: "Der Zeitraum passt nicht.",
    });
    const repeated = await admin.rpc("respond_to_offer_link", {
      p_link_id: rejectedLinkId,
      p_response: "REJECTED",
      p_rejection_reason: "Der Zeitraum passt nicht.",
    });
    expect(first.error).toBeNull();
    expect(repeated.error).toBeNull();

    const { data, error } = await admin
      .from("notifications")
      .select("user_id,type,action_url,event_key")
      .eq("event_key", `offer:${rejectedOfferId}:rejected`);
    expect(error).toBeNull();
    expect(data).toEqual([{
      user_id: owner.id,
      type: "offer_rejected",
      action_url: `/app/offers/${rejectedOfferId}`,
      event_key: `offer:${rejectedOfferId}:rejected`,
    }]);
  });

  test("failed offer responses do not create notifications", async () => {
    const updatedAt = new Date().toISOString();
    const failedOfferId = crypto.randomUUID();
    const failedLinkId = crypto.randomUUID();
    const { error: offerError } = await admin.from("offers").insert({
      id: failedOfferId,
      user_id: owner.id,
      client_id: clientId,
      number: "ANG-NOTIFY-FAILED",
      date: new Date().toISOString().slice(0, 10),
      positions: [],
      vat_rate: 19,
      status: "DRAFT",
      updated_at: updatedAt,
    });
    if (offerError) throw offerError;
    const { error: linkError } = await admin.from("document_recipient_links").insert({
      id: failedLinkId,
      user_id: owner.id,
      document_type: "offer",
      document_id: failedOfferId,
      token_hash: crypto.randomBytes(32).toString("hex"),
      document_updated_at: updatedAt,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    });
    if (linkError) throw linkError;

    const response = await admin.rpc("respond_to_offer_link", {
      p_link_id: failedLinkId,
      p_response: "ACCEPTED",
      p_rejection_reason: null,
    });
    expect(response.error).not.toBeNull();

    const { count } = await admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("event_key", `offer:${failedOfferId}:accepted`);
    expect(count).toBe(0);
  });

  test("the first portal view creates one notification only", async () => {
    const firstView = await admin.rpc("record_recipient_document_view", { p_link_id: linkId });
    expect(firstView.error).toBeNull();
    expect(firstView.data).toBe(true);
    const secondView = await admin.rpc("record_recipient_document_view", { p_link_id: linkId });
    expect(secondView.error).toBeNull();
    expect(secondView.data).toBe(false);

    const { count } = await admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("event_key", `offer:${offerId}:viewed`);
    expect(count).toBe(1);
  });
});
