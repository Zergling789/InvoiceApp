import { strToU8, zipSync } from "fflate";

export const EXPORT_SOURCES = [
  { table: "profiles", ownerColumn: "id" },
  ...[
  "user_settings",
  "clients",
  "projects",
  "offers",
  "invoices",
  "document_activity",
  "sender_identities",
  "audit_events",
  "einvoice_exports",
  "account_deletion_requests",
  "billing_customers",
  "billing_subscriptions",
  "document_recipient_links",
  ].map((table) => ({ table, ownerColumn: "user_id" })),
];

const json = (value) => JSON.stringify(value, null, 2);

export function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function rowsToCsv(rows) {
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))].sort();
  if (!headers.length) return "";
  return [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\r\n");
}

export function buildAccountExportZip({ user, datasets, generatedAt = new Date().toISOString() }) {
  const files = {
    "README.txt": strToU8([
      "FreelanceFlow-Datenexport",
      `Erstellt: ${generatedAt}`,
      "Alle enthaltenen Datensätze gehören zum authentifizierten Konto.",
      "JSON ist die vollständige maschinenlesbare Darstellung; CSV-Dateien dienen der tabellarischen Weiterverarbeitung.",
    ].join("\r\n")),
    "profile.json": strToU8(json({ id: user.id, email: user.email ?? null, createdAt: user.created_at ?? null })),
    "manifest.json": strToU8(json({ version: 1, generatedAt, tables: Object.fromEntries(Object.entries(datasets).map(([name, rows]) => [name, rows.length])) })),
  };

  for (const [name, rows] of Object.entries(datasets)) {
    files[`${name}.json`] = strToU8(json(rows));
    files[`${name}.csv`] = strToU8(rowsToCsv(rows));
  }

  return Buffer.from(zipSync(files, { level: 6 }));
}

export async function loadOwnedAccountData(supabase, userId) {
  const datasets = {};
  for (const { table, ownerColumn } of EXPORT_SOURCES) {
    const { data, error } = await supabase.from(table).select("*").eq(ownerColumn, userId);
    if (error) {
      const failure = new Error(`Account export query failed for ${table}`);
      failure.code = "DATA_EXPORT_FAILED";
      failure.status = 500;
      throw failure;
    }
    datasets[table] = data ?? [];
  }
  return datasets;
}
