import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(process.cwd(), "supabase", "migrations", "20251225_invoice_locking.sql");

test("invoice lock migration defines update guard", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.ok(sql.includes("prevent_locked_invoice_update"));
  assert.ok(sql.includes("trg_prevent_locked_invoice_update"));
});
