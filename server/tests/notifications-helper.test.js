import assert from "node:assert/strict";
import test from "node:test";

import { createNotification } from "../notifications.js";

const validInput = {
  userId: "11111111-1111-4111-8111-111111111111",
  type: "offer_accepted",
  title: "Angebot angenommen",
  message: "Das Angebot ANG-1 wurde angenommen.",
  entityType: "offer",
  entityId: "22222222-2222-4222-8222-222222222222",
  actionUrl: "/app/offers/22222222-2222-4222-8222-222222222222",
  metadata: { source: "recipient_portal" },
  eventKey: "offer:22222222-2222-4222-8222-222222222222:accepted",
};

test("server notification helper validates and forwards the stable contract", async () => {
  let rpcCall;
  const id = await createNotification({
    rpc: async (name, payload) => {
      rpcCall = { name, payload };
      return { data: "33333333-3333-4333-8333-333333333333", error: null };
    },
  }, validInput);

  assert.equal(id, "33333333-3333-4333-8333-333333333333");
  assert.equal(rpcCall.name, "create_notification");
  assert.equal(rpcCall.payload.p_type, "offer_accepted");
  assert.equal(rpcCall.payload.p_event_key, validInput.eventKey);
});

test("server notification helper blocks unknown types and external redirects", async () => {
  const db = { rpc: async () => ({ data: null, error: null }) };
  await assert.rejects(
    createNotification(db, { ...validInput, type: "unknown" }),
    /NOTIFICATION_TYPE_INVALID/,
  );
  await assert.rejects(
    createNotification(db, { ...validInput, actionUrl: "https://evil.example" }),
    /NOTIFICATION_ACTION_URL_INVALID/,
  );
});

test("server notification helper exposes only a stable failure code", async () => {
  await assert.rejects(
    createNotification({ rpc: async () => ({ data: null, error: new Error("sensitive database detail") }) }, validInput),
    (error) => error.code === "NOTIFICATION_CREATE_FAILED" && !error.message.includes("sensitive"),
  );
});
