import { test } from "node:test";
import assert from "node:assert/strict";

process.env.SERVER_TEST_MODE = "1";

const { lockInvoiceAfterSend } = await import("../index.js");

test("lockInvoiceAfterSend sets is_locked and finalized_at", async () => {
  const updates = [];
  const mockSupabase = {
    from() {
      return {
        update(payload) {
          updates.push(payload);
          return {
            eq() {
              return {
                eq() {
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        },
      };
    },
  };

  await lockInvoiceAfterSend({ supabase: mockSupabase, invoiceId: "inv-1", userId: "user-1" });

  assert.equal(updates.length, 1);
  assert.equal(updates[0].is_locked, true);
  assert.ok(typeof updates[0].finalized_at === "string");
});

test("lockInvoiceAfterSend throws on update error", async () => {
  const mockSupabase = {
    from() {
      return {
        update() {
          return {
            eq() {
              return {
                eq() {
                  return Promise.resolve({ error: { message: "fail" } });
                },
              };
            },
          };
        },
      };
    },
  };

  await assert.rejects(
    () => lockInvoiceAfterSend({ supabase: mockSupabase, invoiceId: "inv-1", userId: "user-1" }),
    /Failed to lock invoice/
  );
});
