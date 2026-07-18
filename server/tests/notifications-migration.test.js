import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260718123514_in_app_notifications.sql",
  import.meta.url,
);
const serverUrl = new URL("../index.js", import.meta.url);

test("notifications are owner-scoped, client-immutable and server-created", async () => {
  const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();

  assert.match(sql, /create table if not exists public\.notifications/);
  for (const type of [
    "offer_accepted",
    "offer_rejected",
    "offer_viewed",
    "offer_message_received",
    "offer_expiring",
    "invoice_viewed",
    "invoice_paid",
    "invoice_overdue",
    "payment_failed",
    "document_send_failed",
    "system",
  ]) {
    assert.match(sql, new RegExp(`'${type}'`));
  }
  assert.match(sql, /alter table public\.notifications enable row level security/);
  assert.match(sql, /for select\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(sql, /for update\s+to authenticated[\s\S]+using \(\(select auth\.uid\(\)\) = user_id\)[\s\S]+with check \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(sql, /for delete\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(sql, /grant update \(is_read, read_at\) on table public\.notifications to authenticated/);
  assert.doesNotMatch(sql, /grant insert on table public\.notifications to authenticated/);
  assert.match(sql, /create unique index if not exists notifications_event_key_unique_idx[\s\S]+where event_key is not null/);
  assert.match(sql, /create or replace function private\.create_notification/);
  assert.match(sql, /security definer\s+set search_path = ''/);
  assert.match(sql, /revoke all on function private\.create_notification[\s\S]+from public, anon, authenticated/);
  assert.match(sql, /grant execute on function private\.create_notification[\s\S]+to service_role/);
  assert.match(sql, /action_url !~ '\^\/app/);
});

test("recipient responses and first views create atomic deduplicated notifications", async () => {
  const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();

  assert.match(sql, /create or replace function public\.respond_to_offer_link/);
  assert.match(sql, /if link_rec\.response is not null then\s+return link_rec\.response/);
  assert.match(sql, /'offer:' \|\| offer_rec\.id::text \|\| ':' \|\| lower\(p_response\)/);
  assert.match(sql, /perform private\.create_notification\([\s\S]+offer_rec\.id/);
  assert.match(sql, /create or replace function public\.record_recipient_document_view/);
  assert.match(sql, /if link_rec\.first_viewed_at is not null then\s+return false/);
  assert.match(sql, /':viewed'/);
  assert.match(sql, /alter publication supabase_realtime add table public\.notifications/);
});

test("read state can move forward once but cannot be reset", async () => {
  const transitionUrl = new URL(
    "../../supabase/migrations/20260718124816_enforce_notification_read_transition.sql",
    import.meta.url,
  );
  const sql = (await readFile(transitionUrl, "utf8")).toLowerCase();
  assert.match(sql, /if old\.is_read then/);
  assert.match(sql, /notification_already_read/);
  assert.match(sql, /new\.is_read is not true or new\.read_at is null/);
  assert.match(sql, /before update on public\.notifications/);
});

test("notification texts remain valid UTF-8 and repair previously corrupted rows", async () => {
  const encodingUrl = new URL(
    "../../supabase/migrations/20260718172919_fix_notification_utf8_encoding.sql",
    import.meta.url,
  );
  const sql = await readFile(encodingUrl, "utf8");

  assert.match(sql, /Angebot geöffnet/);
  assert.match(sql, /Rechnung geöffnet/);
  assert.match(sql, /wurde vom Kunden geöffnet\./);
  assert.match(sql, /drop trigger if exists notifications_guard_read_transition/);
  assert.match(sql, /create trigger notifications_guard_read_transition/);
  assert.match(sql, /where type in \('offer_viewed', 'invoice_viewed'\)/);
  assert.doesNotMatch(
    sql.replaceAll("geÃ¶ffnet", ""),
    /Ã|Â/,
  );
});

test("the public recipient route records the first view without logging document identifiers", async () => {
  const source = await readFile(serverUrl, "utf8");
  assert.match(source, /rpc\(\s*"record_recipient_document_view"/);
  assert.match(source, /recipient_view_notification_failed/);
  assert.doesNotMatch(source, /recipient_view_notification_failed[\s\S]{0,300}documentId/);
});
