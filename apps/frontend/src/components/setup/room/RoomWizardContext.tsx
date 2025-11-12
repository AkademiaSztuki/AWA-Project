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
import { saveRoom } from "@/lib/supabase-deep-personalization";
import { useSessionData } from "@/hooks/useSessionData";
import { RoomData, RoomWizardStep } from "./types";

interface RoomWizardContextValue {
  householdId: string;
  steps: RoomWizardStep[];
  currentStep: RoomWizardStep;
  currentStepIndex: number;
  progress: number;
  data: RoomData;
  updateData: (updates: Partial<RoomData>) => void;
  replaceData: (next: RoomData) => void;
  goToStep: (step: RoomWizardStep) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  isSaving: boolean;
  submitRoom: () => Promise<void>;
}

const STEP_DEFINITIONS: Array<{ key: RoomWizardStep; segment: string }> = [
  { key: "photo", segment: "photo" },
  { key: "prs-current", segment: "prs-current" },
  { key: "usage", segment: "usage" },
  { key: "activities", segment: "activities" },
  { key: "pain-points", segment: "pain-points" },
  { key: "room-swipes", segment: "room-swipes" },
  { key: "prs-target", segment: "prs-target" },
  { key: "summary", segment: "summary" },
];

const segmentToStep = STEP_DEFINITIONS.reduce<Record<string, RoomWizardStep>>(
  (acc, entry) => {
    acc[entry.segment] = entry.key;
    return acc;
  },
  {}
);

const stepsOrder: RoomWizardStep[] = STEP_DEFINITIONS.map(
  (entry) => entry.key
);

const DEFAULT_STEP: RoomWizardStep = "photo";

const RoomWizardContext = createContext<RoomWizardContextValue | null>(null);

const getStepFromPathname = (pathname: string): RoomWizardStep => {
  const parts = pathname.split("/").filter(Boolean);
  const roomIndex = parts.findIndex((part) => part === "room");
  if (roomIndex === -1) {
    return DEFAULT_STEP;
  }

  const stepSegment = parts[roomIndex + 2]; // after room and householdId
  if (!stepSegment) {
    return DEFAULT_STEP;
  }

  return segmentToStep[stepSegment] ?? DEFAULT_STEP;
};

export function RoomWizardProvider({
  children,
  householdId,
}: {
  children: ReactNode;
  householdId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useLanguage();
  const { updateSessionData } = useSessionData();

  const currentStep = useMemo(
    () => getStepFromPathname(pathname || ""),
    [pathname]
  );
  const currentStepIndex = useMemo(
    () => Math.max(0, stepsOrder.indexOf(currentStep)),
    [currentStep]
  );

  const [data, setData] = useState<RoomData>({
    name: "",
    roomType: "",
    usageType: "solo",
    sharedWith: [],
    photos: [],
    painPoints: [],
    activities: [],
  });
  const [isSaving, setIsSaving] = useState(false);

  const steps = stepsOrder;
  const progress = useMemo(() => {
    if (!steps.length) {
      return 0;
    }
    return ((currentStepIndex + 1) / steps.length) * 100;
  }, [currentStepIndex, steps.length]);

  const stepToSegment = useCallback((step: RoomWizardStep) => {
    const definition = STEP_DEFINITIONS.find((entry) => entry.key === step);
    return definition?.segment ?? "photo";
  }, []);

  const goToStep = useCallback(
    (step: RoomWizardStep) => {
      const segment = stepToSegment(step);
      router.push(`/setup/room/${householdId}/${segment}`);
    },
    [householdId, router, stepToSegment]
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

  const updateData = useCallback((updates: Partial<RoomData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const replaceData = useCallback((next: RoomData) => {
    setData(next);
  }, []);

  const submitRoom = useCallback(async () => {
    setIsSaving(true);
    try {
      console.log("[RoomWizard] Saving room:", data);
      console.log("[RoomWizard] Household ID:", householdId);

      try {
        const savedRoom = await saveRoom({
          householdId,
          name: data.name,
          roomType: data.roomType,
          usageType: data.usageType,
          sharedWith: data.sharedWith || [],
          currentPhotos: (data.photos || []).map((url) => ({
            url,
            analysis: {
              clutter: 0,
              dominantColors: [],
              detectedObjects: [],
              lightQuality: "bright",
              aiComment: "",
              humanComment: "",
            },
            uploadedAt: new Date().toISOString(),
          })),
          prsCurrent: data.prsCurrent || { x: 0, y: 0 },
          prsTarget: data.prsTarget || { x: 0, y: 0 },
          painPoints: data.painPoints,
          activities: (data.activities || []).map((id) => ({
            type: id,
            frequency: "daily",
            satisfaction: data.activitySatisfaction?.[id] || "ok",
          })),
        });

        if (savedRoom) {
          console.log("[RoomWizard] Room saved with ID:", savedRoom.id);
        }
      } catch (error) {
        console.warn(
          "[RoomWizard] Could not save to DB (migrations not applied?), continuing anyway:",
          error
        );
      }

      if (data.photos && data.photos.length > 0) {
        await updateSessionData({ roomImage: data.photos[0] });
      }

      router.push("/flow/generate");
    } catch (error) {
      console.error("[RoomWizard] Error while submitting room:", error);
      alert(
        language === "pl"
          ? "Błąd podczas zapisywania pokoju. Spróbuj ponownie."
          : "An error occurred while saving the room. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }, [data, householdId, language, router, updateSessionData]);

  const value = useMemo<RoomWizardContextValue>(
    () => ({
      householdId,
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
      submitRoom,
    }),
    [
      currentStep,
      currentStepIndex,
      data,
      goToNextStep,
      goToPreviousStep,
      goToStep,
      householdId,
      isSaving,
      progress,
      replaceData,
      steps,
      submitRoom,
      updateData,
    ]
  );

  return (
    <RoomWizardContext.Provider value={value}>
      {children}
    </RoomWizardContext.Provider>
  );
}

export const useRoomWizard = (): RoomWizardContextValue => {
  const context = useContext(RoomWizardContext);
  if (!context) {
    throw new Error("useRoomWizard must be used within a RoomWizardProvider");
  }
  return context;
};
