import { z } from "zod";

export const ALLOWED_POSITION_UNITS = ["Std", "Stk", "m", "m²", "m³", "kg", "t", "Tag", "Monat", "Pauschal"];

const positionShape = z.object({
  id: z.string().optional(),
  description: z.string().trim().min(1).max(500),
  quantity: z.coerce.number().positive().max(1_000_000).optional(),
  unit: z.string().trim().min(1).max(30).optional(),
  price: z.coerce.number().min(0).max(100_000_000).optional(),
  taxCategory: z.enum(["STANDARD", "REDUCED", "ZERO", "EXEMPT", "SMALL_BUSINESS", "REVERSE_CHARGE"]).optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
}).passthrough();

const normalize = (value) => String(value ?? "").toLocaleLowerCase("de-DE").normalize("NFKD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();
const tokens = (value) => normalize(value).split(/\s+/).filter(Boolean);
const RELATED_TERMS = new Map([
  ["terrasse", ["terrassenplatte", "pflaster", "unterbau", "randstein", "fuge"]],
  ["pflastern", ["pflasterarbeiten", "pflaster", "platten", "splittbett"]],
  ["bagger", ["minibagger", "aushub", "erdarbeiten"]],
  ["anfahrt", ["anfahrtspauschale", "fahrtkosten"]],
  ["bad", ["badezimmer", "sanitar", "fliesen"]],
  ["hecke", ["heckenschnitt", "rodung", "entsorgung"]],
  ["photovoltaik", ["pv", "solarmodul", "wechselrichter", "montage"]],
]);

function editDistance(a, b) {
  const rows = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = rows[0];
    rows[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = rows[j];
      rows[j] = Math.min(rows[j] + 1, rows[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return rows[b.length];
}

export function textRelevance(query, title, description = "") {
  const q = normalize(query);
  const candidate = normalize(`${title} ${description}`);
  if (!q) return 0;
  if (normalize(title) === q) return 1000;
  if (candidate.startsWith(q)) return 850;
  if (candidate.includes(q)) return 700;
  const queryTokens = tokens(q);
  const candidateTokens = tokens(candidate);
  const fuzzy = queryTokens.reduce((score, queryToken) => {
    const best = candidateTokens.reduce((minimum, candidateToken) => {
      const prefixLength = Math.min(candidateToken.length, queryToken.length);
      const prefixDistance = editDistance(queryToken, candidateToken.slice(0, prefixLength));
      const stemMatch = prefixLength >= 6 && candidateToken.slice(0, 6) === queryToken.slice(0, 6) ? 0 : 99;
      return Math.min(minimum, editDistance(queryToken, candidateToken), prefixDistance, stemMatch);
    }, 99);
    return score + (best <= 1 ? 120 : best === 2 && queryToken.length >= 5 ? 60 : 0);
  }, 0);
  if (fuzzy > 0) return fuzzy;
  const related = queryTokens.flatMap((token) => RELATED_TERMS.get(token) ?? []);
  return related.some((term) => candidateTokens.some((candidateToken) => candidateToken.includes(term) || term.includes(candidateToken))) ? 35 : 0;
}

function historyRows(rows, source, customerId) {
  return rows.flatMap((document) => {
    if (!Array.isArray(document.positions)) return [];
    return document.positions.flatMap((raw, index) => {
      const parsed = positionShape.safeParse(raw);
      if (!parsed.success) return [];
      const position = parsed.data;
      return [{
        id: `${source}:${document.id}:${position.id ?? index}`,
        title: position.description,
        description: "",
        unit: position.unit ?? "Stk",
        lastPrice: position.price ?? null,
        standardPrice: null,
        taxCategory: position.taxCategory ?? null,
        taxRate: position.taxRate ?? null,
        category: "Frühere Position",
        source,
        kind: "HISTORY",
        quantity: position.quantity ?? 1,
        customerSpecific: Boolean(customerId && document.client_id === customerId),
        usedAt: document.updated_at ?? document.created_at ?? null,
      }];
    });
  });
}

export function rankPositionSuggestions({ query, templates = [], invoices = [], offers = [], events = [], customerId = null, limit = 10 }) {
  const candidates = [
    ...templates.map((template) => ({
      id: template.id,
      title: template.name,
      description: template.description ?? "",
      unit: template.unit,
      lastPrice: template.default_unit_price,
      standardPrice: template.default_unit_price,
      taxCategory: template.tax_category,
      taxRate: Number(template.tax_rate),
      category: template.category ?? "",
      source: template.kind === "PRODUCT" ? "Produktkatalog" : template.kind === "SERVICE" ? "Leistungskatalog" : "Positionsvorlage",
      kind: template.kind,
      quantity: template.default_quantity ? Number(template.default_quantity) : 1,
      productNumber: template.product_number,
      manufacturer: template.manufacturer,
      imageUrl: template.image_url,
      customerSpecific: false,
      usageCount: template.usage_count ?? 0,
      usedAt: template.last_used_at,
    })),
    ...historyRows(invoices, "Rechnungshistorie", customerId),
    ...historyRows(offers, "Angebotshistorie", customerId),
  ];

  const eventCounts = new Map();
  for (const event of events) {
    if (event.action !== "SELECTED" && event.action !== "APPLIED") continue;
    const key = event.suggestion_id;
    if (key) eventCounts.set(key, (eventCounts.get(key) ?? 0) + 1);
  }

  const deduplicated = new Map();
  for (const candidate of candidates) {
    const relevance = textRelevance(query, candidate.title, candidate.description);
    if (relevance <= 0) continue;
    const frequency = Math.min(100, Number(candidate.usageCount ?? 0) * 8 + (eventCounts.get(candidate.id) ?? 0) * 10);
    const customerScore = candidate.customerSpecific ? 90 : 0;
    const recentScore = candidate.usedAt ? Math.max(0, 60 - Math.floor((Date.now() - new Date(candidate.usedAt).getTime()) / 86_400_000)) : 0;
    const scored = { ...candidate, score: relevance + frequency + customerScore + recentScore };
    const key = `${normalize(candidate.title)}|${candidate.unit}|${candidate.taxRate ?? ""}`;
    const existing = deduplicated.get(key);
    if (!existing || scored.score > existing.score) deduplicated.set(key, scored);
  }
  return [...deduplicated.values()].sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "de")).slice(0, limit);
}
