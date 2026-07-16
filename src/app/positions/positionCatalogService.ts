import { apiFetch, readJsonResponse } from "@/app/api/apiClient";
import { readApiError } from "@/app/api/apiError";
import type { TaxCategory } from "@/types";

export type PositionTemplate = { id: string; kind: "PRODUCT" | "SERVICE" | "TEMPLATE"; name: string; description: string; category: string; unit: string; default_quantity: number | null; default_unit_price: number | null; tax_category: TaxCategory; tax_rate: number; product_number: string | null; manufacturer: string | null; image_url: string | null };
export type PositionTemplateInput = { kind: PositionTemplate["kind"]; name: string; description?: string; category?: string; unit: string; defaultQuantity?: number; defaultUnitPrice: number | null; taxCategory: TaxCategory; taxRate: number; productNumber?: string; manufacturer?: string };
export type PositionGroupItem = { id?: string; title: string; description: string; quantity: number; unit: string; unit_price: number | null; tax_category: TaxCategory; tax_rate: number; optional: boolean; position_template_id?: string | null; sort_order?: number };
export type PositionGroup = { id: string; name: string; description: string; category: string; position_group_items: PositionGroupItem[] };
export type PositionGroupInput = { name: string; description?: string; category?: string; items: Array<{ positionTemplateId?: string | null; title: string; description: string; quantity: number; unit: string; unitPrice: number | null; taxCategory: TaxCategory; taxRate: number; optional: boolean }> };

async function checked<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) { const error = await readApiError(response); throw new Error(error.message ?? fallback); }
  if (response.status === 204) return undefined as T;
  return readJsonResponse<T>(response);
}

export async function loadPositionTemplates(): Promise<PositionTemplate[]> { return (await checked<{ templates: PositionTemplate[] }>(await apiFetch("/api/positions/templates", {}, { auth: true }), "Einträge konnten nicht geladen werden.")).templates; }
export async function createPositionTemplate(input: PositionTemplateInput): Promise<PositionTemplate> { return (await checked<{ template: PositionTemplate }>(await apiFetch("/api/positions/templates", { method: "POST", body: JSON.stringify(input) }, { auth: true }), "Eintrag konnte nicht gespeichert werden.")).template; }
export async function updatePositionTemplate(id: string, input: PositionTemplateInput): Promise<PositionTemplate> { return (await checked<{ template: PositionTemplate }>(await apiFetch(`/api/positions/templates/${id}`, { method: "PATCH", body: JSON.stringify(input) }, { auth: true }), "Eintrag konnte nicht aktualisiert werden.")).template; }
export async function deletePositionTemplate(id: string): Promise<void> { await checked<void>(await apiFetch(`/api/positions/templates/${id}`, { method: "DELETE" }, { auth: true }), "Eintrag konnte nicht gelöscht werden."); }
export async function loadPositionGroups(): Promise<PositionGroup[]> { return (await checked<{ groups: PositionGroup[] }>(await apiFetch("/api/positions/groups", {}, { auth: true }), "Pakete konnten nicht geladen werden.")).groups; }
export async function createPositionGroup(input: PositionGroupInput): Promise<PositionGroup> { return (await checked<{ group: PositionGroup }>(await apiFetch("/api/positions/groups", { method: "POST", body: JSON.stringify(input) }, { auth: true }), "Paket konnte nicht gespeichert werden.")).group; }
export async function updatePositionGroup(id: string, input: PositionGroupInput): Promise<PositionGroup> { return (await checked<{ group: PositionGroup }>(await apiFetch(`/api/positions/groups/${id}`, { method: "PATCH", body: JSON.stringify(input) }, { auth: true }), "Paket konnte nicht aktualisiert werden.")).group; }
export async function deletePositionGroup(id: string): Promise<void> { await checked<void>(await apiFetch(`/api/positions/groups/${id}`, { method: "DELETE" }, { auth: true }), "Paket konnte nicht gelöscht werden."); }
