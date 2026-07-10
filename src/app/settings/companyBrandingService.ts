import { supabase } from "@/supabaseClient";

export const COMPANY_ASSETS_BUCKET = "company-assets";
export const MAX_LOGO_FILE_SIZE = 2 * 1024 * 1024;
export const MAX_LOGO_WIDTH = 2000;
export const MAX_LOGO_HEIGHT = 1000;
export const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

const extensionByType: Record<(typeof ALLOWED_LOGO_TYPES)[number], string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const requireUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Nicht eingeloggt. Bitte anmelden.");
  return data.user.id;
};

const readImageDimensions = async (file: File) => {
  const bitmap = await createImageBitmap(file);
  try {
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
};

export async function validateCompanyLogo(file: File) {
  if (!ALLOWED_LOGO_TYPES.includes(file.type as (typeof ALLOWED_LOGO_TYPES)[number])) {
    throw new Error("Bitte PNG, JPEG oder WebP verwenden.");
  }
  if (file.size > MAX_LOGO_FILE_SIZE) {
    throw new Error("Das Firmenlogo darf maximal 2 MB groß sein.");
  }
  let dimensions: { width: number; height: number };
  try {
    dimensions = await readImageDimensions(file);
  } catch {
    throw new Error("Die Bilddatei konnte nicht gelesen werden.");
  }
  if (dimensions.width > MAX_LOGO_WIDTH || dimensions.height > MAX_LOGO_HEIGHT) {
    throw new Error("Das Firmenlogo darf maximal 2000 × 1000 Pixel groß sein.");
  }
  return dimensions;
}

export async function uploadCompanyLogo(file: File) {
  await validateCompanyLogo(file);
  const userId = await requireUserId();
  const extension = extensionByType[file.type as keyof typeof extensionByType];
  const path = `${userId}/logos/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(COMPANY_ASSETS_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

export async function downloadCompanyLogo(path: string) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(COMPANY_ASSETS_BUCKET).download(path);
  if (error) throw new Error(error.message);
  return data;
}
