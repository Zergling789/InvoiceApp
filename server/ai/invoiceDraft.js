import crypto from "node:crypto";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export const invoiceDraftSchema = z.object({
  positions: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().gt(0),
    unit: z.string().min(1).max(30),
    price: z.number().min(0),
  })).min(1).max(20),
  introText: z.string().max(1000),
  footerText: z.string().max(1000),
  warnings: z.array(z.string().min(1).max(500)).max(10),
});

const SYSTEM_PROMPT = `Du erstellst ausschließlich einen bearbeitbaren Entwurf für ein deutsches Angebot oder eine Rechnung.
Erfinde keine Leistungen. Fehlen Preise, Mengen oder Einheiten, gib einen Warnhinweis aus und verwende keine erfundenen Werte.
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

export async function generateInvoiceDraft({ description, documentType, currency, vatRate, userId, client }) {
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
    input: `Dokumenttyp: ${documentType}\nWährung: ${currency}\nUmsatzsteuersatz als unveränderlicher Kontext: ${vatRate}\nLeistungsbeschreibung:\n${safeDescription}`,
    text: { format: zodTextFormat(invoiceDraftSchema, "invoice_draft") },
  });

  if (!response.output_parsed) {
    throw Object.assign(new Error("Invalid structured AI response."), { code: "AI_INVALID_RESPONSE" });
  }
  return invoiceDraftSchema.parse(response.output_parsed);
}
