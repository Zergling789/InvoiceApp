import crypto from "node:crypto";

export const DELETION_POLICIES = Object.freeze({ BLOCKED: "BLOCKED", DELETE_ALL: "DELETE_ALL", ANONYMIZE_AND_RETAIN_FINANCIAL_DOCUMENTS: "ANONYMIZE_AND_RETAIN_FINANCIAL_DOCUMENTS" });

export const resolveDeletionPolicy = (configured) => {
  if (configured === "delete-all-v1" || configured === DELETION_POLICIES.DELETE_ALL) return DELETION_POLICIES.DELETE_ALL;
  if (configured === DELETION_POLICIES.ANONYMIZE_AND_RETAIN_FINANCIAL_DOCUMENTS) return DELETION_POLICIES.ANONYMIZE_AND_RETAIN_FINANCIAL_DOCUMENTS;
  return DELETION_POLICIES.BLOCKED;
};

const workerError = (code, message) => Object.assign(new Error(message), { code });

const removeStorageObjects = async (supabase, userId) => {
  const bucket = supabase.storage.from("company-assets");
  let offset = 0;
  while (true) {
    const { data, error } = await bucket.list(userId, { limit: 100, offset });
    if (error) throw workerError("ACCOUNT_STORAGE_DELETE_FAILED", "Storage listing failed");
    const objects = (data ?? []).filter((item) => item.name).map((item) => `${userId}/${item.name}`);
    if (objects.length) {
      const { error: removeError } = await bucket.remove(objects);
      if (removeError) throw workerError("ACCOUNT_STORAGE_DELETE_FAILED", "Storage deletion failed");
    }
    if ((data ?? []).length < 100) return;
    offset += 100;
  }
};

const markFailed = async (supabase, requestId, code) => {
  await supabase
    .from("account_deletion_requests")
    .update({ status: "FAILED", failure_code: String(code).slice(0, 100), updated_at: new Date().toISOString() })
    .eq("id", requestId);
};

export async function processDueAccountDeletions({
  supabase,
  policyVersion,
  limit = 10,
}) {
  const policy = resolveDeletionPolicy(policyVersion);
  if (policy === DELETION_POLICIES.BLOCKED) throw workerError("ACCOUNT_DELETION_POLICY_NOT_APPROVED", "Account deletion policy is blocked.");
  if (policy === DELETION_POLICIES.ANONYMIZE_AND_RETAIN_FINANCIAL_DOCUMENTS) throw workerError("ACCOUNT_DELETION_POLICY_REVIEW_REQUIRED", "Anonymization policy requires external approval.");

  const { data: requests, error } = await supabase.rpc("claim_due_account_deletions", {
    p_limit: limit,
    p_policy_version: policyVersion,
  });
  if (error) throw workerError("ACCOUNT_DELETION_CLAIM_FAILED", "Deletion requests could not be claimed");

  const results = [];
  for (const request of requests ?? []) {
    try {
      await supabase.from("account_deletion_requests").update({ status: "PROCESSING", updated_at: new Date().toISOString() }).eq("id", request.id);
      await removeStorageObjects(supabase, request.user_id);
      const { error: deleteError } = await supabase.auth.admin.deleteUser(request.user_id);
      if (deleteError) throw workerError("ACCOUNT_AUTH_DELETE_FAILED", "Auth user deletion failed");

      const completedAt = new Date().toISOString();
      const { error: completionError } = await supabase
        .from("account_deletion_requests")
        .update({ status: "COMPLETED", completed_at: completedAt, updated_at: completedAt })
        .eq("id", request.id)
        .is("user_id", null);
      if (completionError) throw workerError("ACCOUNT_DELETION_COMPLETION_FAILED", "Deletion completion failed");
      results.push({ id: request.id, status: "COMPLETED" });
    } catch (cause) {
      const code = cause?.code || "ACCOUNT_DELETION_FAILED";
      await markFailed(supabase, request.id, code);
      results.push({ id: request.id, status: "FAILED", code });
    }
  }

  return { processed: results.length, results };
}

export const verifyWorkerSecret = (provided, expected) => {
  if (!provided || !expected) return false;
  const left = Buffer.from(String(provided));
  const right = Buffer.from(String(expected));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};
