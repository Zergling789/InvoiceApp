import type { UserSettings } from "@/types";
import * as settingsRepo from "@/data/repositories/settingsRepo";

export const fetchSettings = (): Promise<UserSettings> => settingsRepo.getSettings();
export const saveSettings = (settings: UserSettings): Promise<void> => settingsRepo.saveSettings(settings);
export const loadSettings = fetchSettings;
