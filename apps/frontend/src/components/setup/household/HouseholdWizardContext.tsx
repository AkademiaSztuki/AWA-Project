"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSession } from "@/hooks";
import { saveHousehold } from "@/lib/supabase-deep-personalization";
import {
  HouseholdData,
  HouseholdWizardStep,
} from "./types";

interface HouseholdWizardContextValue {
  steps: HouseholdWizardStep[];
  currentStep: HouseholdWizardStep;
  currentStepIndex: number;
  progress: number;
  data: HouseholdData;
  updateData: (updates: Partial<HouseholdData>) => void;
  replaceData: (next: HouseholdData) => void;
  goToStep: (step: HouseholdWizardStep) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  isSaving: boolean;
  submitHousehold: () => Promise<void>;
}

const STEP_DEFINITIONS: Array<{ key: HouseholdWizardStep; segment: string }> = [
  { key: "name", segment: "name" },
  { key: "living", segment: "living" },
  { key: "goals", segment: "goals" },
];

const segmentToStep = STEP_DEFINITIONS.reduce<Record<string, HouseholdWizardStep>>(
  (acc, entry) => {
    acc[entry.segment] = entry.key;
    return acc;
  },
  {}
);

const stepsOrder: HouseholdWizardStep[] = STEP_DEFINITIONS.map(
  (entry) => entry.key
);

const HouseholdWizardContext = createContext<HouseholdWizardContextValue | null>(
  null
);

const DEFAULT_STEP: HouseholdWizardStep = "name";

const getStepFromPathname = (pathname: string): HouseholdWizardStep => {
  const parts = pathname.split("/").filter(Boolean);
  const householdIndex = parts.findIndex((part) => part === "household");
  if (householdIndex === -1) {
    return DEFAULT_STEP;
  }

  const segment = parts[householdIndex + 1];
  if (!segment) {
    return DEFAULT_STEP;
  }

  return segmentToStep[segment] ?? DEFAULT_STEP;
};

export function HouseholdWizardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useLanguage();
  const { sessionData } = useSession();

  const currentStep = useMemo(
    () => getStepFromPathname(pathname || ""),
    [pathname]
  );
  const currentStepIndex = useMemo(
    () => Math.max(0, stepsOrder.indexOf(currentStep)),
    [currentStep]
  );

  const [data, setData] = useState<HouseholdData>({
    name: "",
    type: "home",
    livingSituation: "",
    goals: [],
  });
  const [isSaving, setIsSaving] = useState(false);

  const steps = stepsOrder;
  const progress = useMemo(() => {
    if (!steps.length) {
      return 0;
    }
    return ((currentStepIndex + 1) / steps.length) * 100;
  }, [currentStepIndex, steps.length]);

  const stepToSegment = useCallback((step: HouseholdWizardStep) => {
    const definition = STEP_DEFINITIONS.find((entry) => entry.key === step);
    return definition?.segment ?? "name";
  }, []);

  const goToStep = useCallback(
    (step: HouseholdWizardStep) => {
      const segment = stepToSegment(step);
      router.push(`/setup/household/${segment}`);
    },
    [router, stepToSegment]
  );

  const goToNextStep = useCallback(() => {
    const nextStep = steps[currentStepIndex + 1];
    if (nextStep) {
      goToStep(nextStep);
    }
  }, [currentStepIndex, goToStep, steps]);

  const goToPreviousStep = useCallback(() => {
    const previousStep = steps[currentStepIndex - 1];
    if (previousStep) {
      goToStep(previousStep);
    }
  }, [currentStepIndex, goToStep, steps]);

  const updateData = useCallback((updates: Partial<HouseholdData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const replaceData = useCallback((next: HouseholdData) => {
    setData(next);
  }, []);

  const submitHousehold = useCallback(async () => {
    setIsSaving(true);
    try {
      const userHash =
        sessionData?.userHash ||
        (typeof window !== "undefined"
          ? window.localStorage.getItem("aura_user_hash") ||
            window.sessionStorage.getItem("aura_user_hash") ||
            ""
          : "");

      if (!userHash) {
        console.error("[HouseholdWizard] No user hash found");
        alert(
          language === "pl"
            ? "Musisz być zalogowany aby kontynuować"
            : "You must be logged in to continue"
        );
        return;
      }

      let householdId = `household-${Date.now()}`;

      try {
        const savedHousehold = await saveHousehold({
          userHash,
          name: data.name,
          householdType: data.type,
          livingSituation: data.livingSituation,
          householdDynamics: data.householdDynamics,
          householdGoals: data.goals,
        });

        if (savedHousehold) {
          householdId = savedHousehold.id;
          console.log("[HouseholdWizard] Household saved with ID:", householdId);
        }
      } catch (error) {
        console.warn(
          "[HouseholdWizard] Could not save household, continuing with fallback ID:",
          error
        );
      }

      router.push(`/setup/room/${householdId}`);
    } catch (error) {
      console.error("[HouseholdWizard] Error while submitting household:", error);
      alert(
        language === "pl"
          ? "Błąd podczas zapisywania. Spróbuj ponownie."
          : "An error occurred while saving. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }, [data, language, router, sessionData?.userHash]);

  const value = useMemo<HouseholdWizardContextValue>(
    () => ({
      steps,
      currentStep,
      currentStepIndex,
      progress,
      data,
      updateData,
      replaceData,
      goToStep,
      goToNextStep,
      goToPreviousStep,
      isSaving,
      submitHousehold,
    }),
    [
      currentStep,
      currentStepIndex,
      data,
      goToNextStep,
      goToPreviousStep,
      goToStep,
      isSaving,
      progress,
      replaceData,
      steps,
      submitHousehold,
      updateData,
    ]
  );

  return (
    <HouseholdWizardContext.Provider value={value}>
      {children}
    </HouseholdWizardContext.Provider>
  );
}

export const useHouseholdWizard = (): HouseholdWizardContextValue => {
  const context = useContext(HouseholdWizardContext);
  if (!context) {
    throw new Error(
      "useHouseholdWizard must be used within a HouseholdWizardProvider"
    );
  }
  return context;
};
