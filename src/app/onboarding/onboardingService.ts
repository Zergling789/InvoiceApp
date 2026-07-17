import {
  dbGetOnboardingProgress,
  dbSaveOnboardingProgress,
  type OnboardingProgress,
  type OnboardingStep,
} from "@/db/onboardingDb";

export type { OnboardingProgress, OnboardingStep } from "@/db/onboardingDb";

export const ONBOARDING_PROGRESS_EVENT = "freelanceflow:onboarding-progress";

export const getOnboardingProgress = (): Promise<OnboardingProgress> =>
  dbGetOnboardingProgress();

export async function saveOnboardingProgress(
  step: OnboardingStep,
  options: { clientId?: string | null } = {},
): Promise<OnboardingProgress> {
  const progress = await dbSaveOnboardingProgress(step, options);
  window.dispatchEvent(
    new CustomEvent(ONBOARDING_PROGRESS_EVENT, { detail: progress }),
  );
  return progress;
}

export const completeOnboarding = (clientId?: string | null) =>
  saveOnboardingProgress("DONE", { clientId });
