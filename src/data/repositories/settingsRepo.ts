import type { UserSettings } from "@/domain/types";
import { dbGetSettings, dbSaveSettings } from "@/db/settingsDb";

export async function getSettings(): Promise<UserSettings> {
  return dbGetSettings();
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  await dbSaveSettings(settings);
}
