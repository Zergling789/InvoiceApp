import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Stripe billing migration keeps browser writes disabled and webhook claims server-only", async () => {
  const sql = (await readFile(new URL("../../supabase/migrations/20260713173008_create_stripe_billing.sql", import.meta.url), "utf8")).toLowerCase();
  assert.match(sql, /alter table public\.billing_subscriptions enable row level security/);
  assert.match(sql, /security invoker set search_path = public, pg_temp/);
  assert.match(sql, /grant execute on function public\.claim_stripe_webhook\(text, text\) to service_role/);
  assert.match(sql, /revoke all on table public\.billing_customers, public\.billing_subscriptions, public\.stripe_webhook_events from anon, authenticated/);
  assert.doesNotMatch(sql, /grant (insert|update|delete).*authenticated/);
});
