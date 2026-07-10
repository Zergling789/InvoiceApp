import crypto from "node:crypto";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export const businessCardSchema = z.object({
  companyName: z.string().max(200),
  contactPerson: z.string().max(200),
  email: z.string().max(320),
  phone: z.string().max(80),
  website: z.string().max(300),
  address: z.string().max(800),
  jobTitle: z.string().max(200),
  notes: z.string().max(800),
  warnings: z.array(z.string().max(300)).max(10),
});

const DATA_URL_PATTERN = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;

export function validateBusinessCardImage(imageDataUrl) {
  const value = String(imageDataUrl ?? "");
  const match = value.match(DATA_URL_PATTERN);
  if (!match) throw Object.assign(new Error("Unsupported business card image."), { code: "AI_CARD_INVALID_IMAGE" });
  const bytes = Buffer.byteLength(match[2], "base64");
  if (bytes < 100 || bytes > 4 * 1024 * 1024) {
    throw Object.assign(new Error("Business card image size is invalid."), { code: "AI_CARD_IMAGE_SIZE" });
  }
  return value;
}

export async function extractBusinessCard({ imageDataUrl, userId, client }) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_VISION_MODEL?.trim() || process.env.OPENAI_MODEL?.trim();
  if (!apiKey) throw Object.assign(new Error("OpenAI API key missing."), { code: "AI_NOT_CONFIGURED" });
  if (!model) throw Object.assign(new Error("OpenAI model missing."), { code: "AI_MODEL_NOT_CONFIGURED" });

  const image = validateBusinessCardImage(imageDataUrl);
  const openai = client ?? new OpenAI({ apiKey });
  const response = await openai.responses.parse({
    model,
    store: false,
    safety_identifier: crypto.createHash("sha256").update(String(userId)).digest("hex"),
    instructions: "Extrahiere ausschließlich sichtbare Kontaktdaten aus der Visitenkarte. Erfinde keine fehlenden Werte. Gib unsichere oder unleserliche Angaben als Warnung aus. Antworte im vorgegebenen Format.",
    input: [{
      role: "user",
      content: [
        { type: "input_text", text: "Lies diese Visitenkarte aus. Formatiere die postalische Adresse mehrzeilig. Zusätzliche sichtbare Angaben dürfen knapp in notes stehen." },
        { type: "input_image", image_url: image, detail: "high" },
      ],
    }],
    text: { format: zodTextFormat(businessCardSchema, "business_card_contact") },
  });
  if (!response.output_parsed) throw Object.assign(new Error("Invalid structured AI response."), { code: "AI_INVALID_RESPONSE" });
  return businessCardSchema.parse(response.output_parsed);
}
