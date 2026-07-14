import assert from "node:assert/strict";
import test from "node:test";

import {
  DELETION_POLICIES,
  processDueAccountDeletions,
  resolveDeletionPolicy,
  verifyWorkerSecret,
} from "../accountDeletionWorker.js";

test("worker refuses to delete without the approved policy version", async () => {
  await assert.rejects(
    processDueAccountDeletions({ supabase: {}, policyVersion: "" }),
    (error) => error.code === "ACCOUNT_DELETION_POLICY_NOT_APPROVED",
  );
});

test("retention policy engine is fail-closed and keeps anonymization under review", async () => {
  assert.equal(resolveDeletionPolicy(""), DELETION_POLICIES.BLOCKED);
  assert.equal(resolveDeletionPolicy("delete-all-v1"), DELETION_POLICIES.DELETE_ALL);
  await assert.rejects(processDueAccountDeletions({ supabase: {}, policyVersion: DELETION_POLICIES.ANONYMIZE_AND_RETAIN_FINANCIAL_DOCUMENTS }), (error) => error.code === "ACCOUNT_DELETION_POLICY_REVIEW_REQUIRED");
});

test("worker secret comparison is fail-closed", () => {
  assert.equal(verifyWorkerSecret("same-secret", "same-secret"), true);
  assert.equal(verifyWorkerSecret("wrong", "same-secret"), false);
  assert.equal(verifyWorkerSecret("", ""), false);
});

test("worker removes storage and auth user before completing the request", async () => {
  const events = [];
  const update = (values) => ({
    eq(column, value) {
      events.push(["update", values, column, value]);
      return {
        is() {
          return Promise.resolve({ error: null });
        },
        then(resolve) {
          return Promise.resolve({ error: null }).then(resolve);
        },
      };
    },
  });
  const supabase = {
    rpc: async () => ({ data: [{ id: "request-1", user_id: "user-1" }], error: null }),
    storage: {
      from: () => ({
        list: async () => ({ data: [{ name: "logo.png" }], error: null }),
        remove: async (paths) => { events.push(["storage", paths]); return { error: null }; },
      }),
    },
    auth: { admin: { deleteUser: async (id) => { events.push(["auth", id]); return { error: null }; } } },
    from: () => ({ update }),
  };

  const result = await processDueAccountDeletions({
    supabase,
    policyVersion: DELETION_POLICIES.DELETE_ALL,
  });

  assert.equal(result.results[0].status, "COMPLETED");
  assert.deepEqual(events.find((event) => event[0] === "storage"), ["storage", ["user-1/logo.png"]]);
  assert.deepEqual(events.find((event) => event[0] === "auth"), ["auth", "user-1"]);
});
