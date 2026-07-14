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

test("billing usage migration is transactional, private and service-role only", async () => {
  const sql = (await readFile(new URL("../../supabase/migrations/20260714174406_billing_entitlements_usage.sql", import.meta.url), "utf8")).toLowerCase();
  assert.match(sql, /create table if not exists public\.billing_usage/);
  assert.match(sql, /alter table public\.billing_usage enable row level security/);
  assert.match(sql, /revoke all on table public\.billing_usage from public, anon, authenticated/);
  assert.match(sql, /security invoker/);
  assert.match(sql, /where public\.billing_usage\.quantity < p_limit/);
  assert.match(sql, /grant execute on function public\.increment_billing_usage.*to service_role/);
});
