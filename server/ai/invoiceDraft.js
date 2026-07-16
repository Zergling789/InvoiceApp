import crypto from "node:crypto";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export const invoiceDraftSchema = z.object({
  positions: z.array(z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000),
    quantity: z.number().gt(0),
    unit: z.string().min(1).max(30),
    category: z.string().max(100),
    internalNote: z.string().max(1000),
    subpositions: z.array(z.string().min(1).max(300)).max(12),
    priceSourceId: z.string().max(200).nullable(),
  })).min(1).max(20),
  introText: z.string().max(1000),
  footerText: z.string().max(1000),
  warnings: z.array(z.string().min(1).max(500)).max(10),
});

const SYSTEM_PROMPT = `Du erstellst ausschließlich einen bearbeitbaren Entwurf für ein deutsches Angebot oder eine Rechnung.
Erfinde keine Leistungen. Fehlen Preise, Mengen oder Einheiten, gib einen Warnhinweis aus und verwende keine erfundenen Werte.
Du gibst niemals einen Preis aus. Setze priceSourceId nur auf die exakte ID eines bereitgestellten Preiskandidaten, wenn dieser fachlich eindeutig passt, sonst null.
Berechne oder verändere keine Umsatzsteuer. Vergib keine Rechnungsnummer und ändere keinen Dokumentstatus.
Garantierte rechtliche oder steuerliche Korrektheit ist ausgeschlossen. Summen berechnet ausschließlich die Anwendung.
Antworte ausschließlich auf Deutsch und nur im vorgegebenen strukturierten Format.`;

export function sanitizeDraftDescription(value) {
  return String(value ?? "")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[E-Mail entfernt]")
    .replace(/\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]){11,30}\b/gi, "[IBAN entfernt]")
    .replace(/\b(?:DE)?\s?\d{9,13}\b/g, "[Steuerkennung entfernt]")
    .replace(/\b[\p{L}][\p{L}&.' -]{1,80}\s+(?:GmbH|UG|AG|KG|OHG|GbR|e\.K\.)\b/giu, "[Kunde entfernt]")
    .replace(/\b[\p{L}.'-]+(?:straße|strasse|str\.|weg|allee|platz)\s+\d+[a-z]?\b/giu, "[Adresse entfernt]")
    .trim();
}

export async function generateInvoiceDraft({ description, documentType, currency, vatRate, userId, client, priceCandidates = [] }) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim();
  if (!apiKey) throw Object.assign(new Error("OpenAI API key missing."), { code: "AI_NOT_CONFIGURED" });
  if (!model) throw Object.assign(new Error("OpenAI model missing."), { code: "AI_MODEL_NOT_CONFIGURED" });

  const openai = client ?? new OpenAI({ apiKey });
  const safeDescription = sanitizeDraftDescription(description);
  const safetyIdentifier = crypto.createHash("sha256").update(String(userId)).digest("hex");

  const response = await openai.responses.parse({
    model,
    store: false,
    safety_identifier: safetyIdentifier,
    instructions: SYSTEM_PROMPT,
    input: `Dokumenttyp: ${documentType}\nWährung: ${currency}\nUmsatzsteuersatz als unveränderlicher Kontext: ${vatRate}\nVerlässliche Preiskandidaten (nur eine exakte ID darf als priceSourceId gewählt werden):\n${JSON.stringify(priceCandidates.map((candidate) => ({ id: candidate.id, title: candidate.title, unit: candidate.unit, kind: candidate.kind })))}\nLeistungsbeschreibung:\n${safeDescription}`,
    text: { format: zodTextFormat(invoiceDraftSchema, "invoice_draft") },
  });

  if (!response.output_parsed) {
    throw Object.assign(new Error("Invalid structured AI response."), { code: "AI_INVALID_RESPONSE" });
  }
  const parsed = invoiceDraftSchema.parse(response.output_parsed);
  const candidateById = new Map(priceCandidates.map((candidate) => [candidate.id, candidate]));
  return {
    ...parsed,
    positions: parsed.positions.map((position) => {
      const candidate = position.priceSourceId ? candidateById.get(position.priceSourceId) : null;
      const price = candidate?.lastPrice ?? candidate?.standardPrice ?? null;
      return {
        ...position,
        price,
        priceNeedsReview: price === null,
        taxCategory: candidate?.taxCategory ?? (Number(vatRate) === 7 ? "REDUCED" : Number(vatRate) === 0 ? "ZERO" : "STANDARD"),
        taxRate: candidate?.taxRate ?? Number(vatRate),
        source: candidate ? { id: candidate.id, title: candidate.title, kind: candidate.kind, source: candidate.source, productNumber: candidate.productNumber ?? null, manufacturer: candidate.manufacturer ?? null, imageUrl: candidate.imageUrl ?? null } : null,
      };
    }),
  };
}
