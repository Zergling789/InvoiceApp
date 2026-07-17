import type { Database } from "@/lib/supabase.types";
import { supabase } from "@/supabaseClient";

export const ONBOARDING_STEPS = [
  "WELCOME",
  "COMPANY",
  "TAX",
  "CUSTOMER",
  "OFFER",
  "DONE",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type OnboardingProgress = {
  step: OnboardingStep;
  completedAt: string | null;
  clientId: string | null;
};

type SettingsInsert = Database["public"]["Tables"]["user_settings"]["Insert"];

const isOnboardingStep = (value: string): value is OnboardingStep =>
  ONBOARDING_STEPS.some((step) => step === value);

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Nicht eingeloggt. Bitte melde dich erneut an.");
  return data.user.id;
}

export async function dbGetOnboardingProgress(): Promise<OnboardingProgress> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("user_settings")
    .select("onboarding_step,onboarding_completed_at,onboarding_client_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    const initial: SettingsInsert = { user_id: userId, onboarding_step: "WELCOME" };
    const { error: insertError } = await supabase
      .from("user_settings")
      .insert(initial);
    if (insertError && insertError.code !== "23505") {
      throw new Error(insertError.message);
    }
    if (insertError?.code === "23505") {
      return dbGetOnboardingProgress();
    }
    return { step: "WELCOME", completedAt: null, clientId: null };
  }

  const step = isOnboardingStep(data.onboarding_step)
    ? data.onboarding_step
    : "WELCOME";
  return {
    step,
    completedAt: data.onboarding_completed_at,
    clientId: data.onboarding_client_id,
  };
}

export async function dbSaveOnboardingProgress(
  step: OnboardingStep,
  options: { clientId?: string | null } = {},
): Promise<OnboardingProgress> {
  const userId = await requireUserId();
  const completedAt = step === "DONE" ? new Date().toISOString() : null;
  const payload: SettingsInsert = {
    user_id: userId,
    onboarding_step: step,
    onboarding_completed_at: completedAt,
    ...(options.clientId !== undefined
      ? { onboarding_client_id: options.clientId }
      : {}),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(payload, { onConflict: "user_id" })
    .select("onboarding_step,onboarding_completed_at,onboarding_client_id")
    .single();

  if (error) throw new Error(error.message);
  const savedStep = isOnboardingStep(data.onboarding_step)
    ? data.onboarding_step
    : step;
  return {
    step: savedStep,
    completedAt: data.onboarding_completed_at,
    clientId: data.onboarding_client_id,
  };
}
