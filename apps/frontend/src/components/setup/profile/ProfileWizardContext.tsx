"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSessionData } from "@/hooks/useSessionData";
import { CoreProfileData, ProfileWizardStep } from "./types";

interface ProfileWizardContextValue {
  steps: ProfileWizardStep[];
  currentStep: ProfileWizardStep;
  currentStepIndex: number;
  progress: number;
  profileData: CoreProfileData;
  updateProfile: (updates: Partial<CoreProfileData>) => void;
  replaceProfile: (next: CoreProfileData) => void;
  completeStep: (updates?: Partial<CoreProfileData>) => void;
  goToStep: (step: ProfileWizardStep) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  currentInsight: string;
  setCurrentInsight: (value: string) => void;
  completeProfile: () => Promise<void>;
  isSubmitting: boolean;
  showLoginModal: boolean;
  setShowLoginModal: (value: boolean) => void;
  handleLoginSuccess: () => Promise<void>;
}

const STEP_DEFINITIONS: Array<{ key: ProfileWizardStep; segment: string }> = [
  { key: "welcome", segment: "welcome" },
  { key: "lifestyle", segment: "lifestyle" },
  { key: "big_five", segment: "big-five" },
  { key: "inspirations", segment: "inspirations" },
  { key: "tinder_swipes", segment: "tinder-swipes" },
  { key: "semantic_diff", segment: "semantic-diff" },
  { key: "colors_materials", segment: "colors-materials" },
  { key: "sensory_tests", segment: "sensory-tests" },
  { key: "nature_metaphor", segment: "nature-metaphor" },
  { key: "aspirational_self", segment: "aspirational-self" },
  { key: "prs_ideal", segment: "prs-ideal" },
  { key: "biophilia", segment: "biophilia" },
  { key: "summary", segment: "summary" },
];

const segmentToStep = STEP_DEFINITIONS.reduce<Record<string, ProfileWizardStep>>(
  (acc, entry) => {
    acc[entry.segment] = entry.key;
    return acc;
  },
  {}
);

const stepsOrder: ProfileWizardStep[] = STEP_DEFINITIONS.map(
  (entry) => entry.key
);

const ProfileWizardContext = createContext<ProfileWizardContextValue | null>(
  null
);

const DEFAULT_STEP: ProfileWizardStep = "welcome";

const getStepFromPathname = (pathname: string): ProfileWizardStep => {
  const parts = pathname.split("/").filter(Boolean);
  const profileIndex = parts.findIndex((part) => part === "profile");
  if (profileIndex === -1) {
    return DEFAULT_STEP;
  }

  const segment = parts[profileIndex + 1];
  if (!segment) {
    return DEFAULT_STEP;
  }

  return segmentToStep[segment] ?? DEFAULT_STEP;
};

export function ProfileWizardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useLanguage();
  const { user, linkUserHashToAuth } = useAuth();
  const { sessionData, updateSessionData } = useSessionData();

  const currentStep = useMemo(
    () => getStepFromPathname(pathname || ""),
    [pathname]
  );
  const currentStepIndex = useMemo(
    () => Math.max(0, stepsOrder.indexOf(currentStep)),
    [currentStep]
  );

  const [profileData, setProfileData] = useState<CoreProfileData>({});
  const [currentInsight, setCurrentInsight] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const steps = stepsOrder;
  const progress = useMemo(() => {
    if (!steps.length) {
      return 0;
    }

    return ((currentStepIndex + 1) / steps.length) * 100;
  }, [currentStepIndex, steps.length]);

  useEffect(() => {
    setCurrentInsight("");
  }, [currentStep]);

  const stepToSegment = useCallback((step: ProfileWizardStep) => {
    const definition = STEP_DEFINITIONS.find((entry) => entry.key === step);
    return definition?.segment ?? "welcome";
  }, []);

  const goToStep = useCallback(
    (step: ProfileWizardStep) => {
      const segment = stepToSegment(step);
      router.push(`/setup/profile/${segment}`);
    },
    [router, stepToSegment]
  );

  const updateProfile = useCallback((updates: Partial<CoreProfileData>) => {
    setProfileData((prev) => ({ ...prev, ...updates }));
  }, []);

  const replaceProfile = useCallback((next: CoreProfileData) => {
    setProfileData(next);
  }, []);

  const generateInsight = useCallback(
    (step: ProfileWizardStep, data: CoreProfileData): string => {
      switch (step) {
        case "lifestyle": {
          const situation = data.lifestyle?.livingSituation;
          if (situation === "partner") {
            return language === "pl"
              ? "Rozumiem - projektujemy dla dwojga! To będzie balans między 'my' i 'ja'. 💑"
              : "I understand - we're designing for two! It'll be a balance between 'us' and 'me'. 💑";
          }
          if (data.lifestyle?.goals?.includes("peace")) {
            return language === "pl"
              ? "Spokój to Twój priorytet - stworzymy przestrzeń która odpręża. 🧘"
              : "Peace is your priority - we'll create a space that relaxes. 🧘";
          }
          return "";
        }
        case "tinder_swipes": {
          const rightSwipes =
            data.tinderSwipes?.filter((item) => item.direction === "right")
              .length ?? 0;
          if (rightSwipes > 20) {
            return language === "pl"
              ? "Widzę Twoje preferencje! Ciepłe, przytulne wnętrza to Twój język. 🌳"
              : "I see your preferences! Warm, cozy interiors are your language. 🌳";
          }

          return language === "pl"
            ? "Poznałam Twój gust wizualny - to będzie piękne! ✨"
            : "I learned your visual taste - this will be beautiful! ✨";
        }
        case "nature_metaphor": {
          const metaphors: Record<
            string,
            { pl: string; en: string }
          > = {
            ocean: {
              pl: "Ocean - płynność, spokój, głębia. Będziemy tworzyć przestrzeń która 'oddycha'. 🌊",
              en: "Ocean - fluidity, calm, depth. We'll create a space that 'breathes'. 🌊",
            },
            forest: {
              pl: "Las - uziemienie, organiczność. Przestrzeń pełna natury i spokoju. 🌲",
              en: "Forest - grounding, organic. A space full of nature and peace. 🌲",
            },
            mountain: {
              pl: "Góry - siła, inspiracja. Wyniosła przestrzeń która motywuje. ⛰️",
              en: "Mountains - strength, inspiration. An elevated space that motivates. ⛰️",
            },
          };

          const metaphor = data.natureMetaphor || "";
          return metaphors[metaphor]?.[language] ?? "";
        }
        case "aspirational_self": {
          if (data.aspirationalSelf?.rituals?.includes("morning_coffee")) {
            return language === "pl"
              ? "Poranek to Twój czas - stworzymy przestrzeń która wspiera ten rytuał. ☀️☕"
              : "Morning is your time - we'll create a space that supports this ritual. ☀️☕";
          }
          return "";
        }
        case "biophilia": {
          if ((data.biophiliaScore || 0) >= 2) {
            return language === "pl"
              ? "Kochasz naturę! Zielone rośliny będą wszędzie. 🌿"
              : "You love nature! Green plants will be everywhere. 🌿";
          }
          return "";
        }
        default:
          return "";
      }
    },
    [language]
  );

  const goToNextStep = useCallback(() => {
    const insight = generateInsight(currentStep, profileData);
    setCurrentInsight(insight);

    const nextStep = steps[currentStepIndex + 1];
    if (nextStep) {
      goToStep(nextStep);
    }
  }, [
    currentStep,
    currentStepIndex,
    generateInsight,
    goToStep,
    profileData,
    steps,
  ]);

  const completeStep = useCallback(
    (updates?: Partial<CoreProfileData>) => {
      const merged = updates ? { ...profileData, ...updates } : profileData;
      if (updates) {
        setProfileData(merged);
      }

      const insight = generateInsight(currentStep, merged);
      setCurrentInsight(insight);

      const nextStep = steps[currentStepIndex + 1];
      if (nextStep) {
        goToStep(nextStep);
      }
    },
    [
      currentStep,
      currentStepIndex,
      generateInsight,
      goToStep,
      profileData,
      steps,
    ]
  );

  const goToPreviousStep = useCallback(() => {
    const previousStep = steps[currentStepIndex - 1];
    if (previousStep) {
      setCurrentInsight("");
      goToStep(previousStep);
    }
  }, [currentStepIndex, goToStep, steps]);

  const completeProfile = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await updateSessionData({
        tinderData: {
          swipes: profileData.tinderSwipes || [],
        },
      });

      if (!user) {
        setShowLoginModal(true);
        setIsSubmitting(false);
        return;
      }

      if (sessionData?.userHash) {
        await linkUserHashToAuth(sessionData.userHash);
      }

      router.push("/dashboard");
    } catch (error) {
      console.error("[ProfileWizard] Failed to complete profile:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    linkUserHashToAuth,
    profileData.tinderSwipes,
    router,
    sessionData?.userHash,
    updateSessionData,
    user,
  ]);

  const handleLoginSuccess = useCallback(async () => {
    setShowLoginModal(false);

    if (sessionData?.userHash && user) {
      await linkUserHashToAuth(sessionData.userHash);
    }

    router.push("/dashboard");
  }, [linkUserHashToAuth, router, sessionData?.userHash, user]);

  const value = useMemo<ProfileWizardContextValue>(
    () => ({
      steps,
      currentStep,
      currentStepIndex,
      progress,
      profileData,
      updateProfile,
      replaceProfile,
      completeStep,
      goToStep,
      goToNextStep,
      goToPreviousStep,
      currentInsight,
      setCurrentInsight,
      completeProfile,
      isSubmitting,
      showLoginModal,
      setShowLoginModal,
      handleLoginSuccess,
    }),
    [
      completeProfile,
      completeStep,
      currentInsight,
      currentStep,
      currentStepIndex,
      goToNextStep,
      goToPreviousStep,
      goToStep,
      handleLoginSuccess,
      isSubmitting,
      profileData,
      progress,
      replaceProfile,
      showLoginModal,
      steps,
      updateProfile,
    ]
  );

  return (
    <ProfileWizardContext.Provider value={value}>
      {children}
    </ProfileWizardContext.Provider>
  );
}

export const useProfileWizard = (): ProfileWizardContextValue => {
  const context = useContext(ProfileWizardContext);
  if (!context) {
    throw new Error(
      "useProfileWizard must be used within a ProfileWizardProvider"
    );
  }
  return context;
};
