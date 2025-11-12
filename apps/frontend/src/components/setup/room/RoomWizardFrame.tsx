"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { AwaDialogue } from "@/components/awa/AwaDialogue";
import { useRoomWizard } from "./RoomWizardContext";

export function RoomWizardFrame({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();
  const { currentStep, currentStepIndex, steps, progress } = useRoomWizard();

  return (
    <div className="min-h-screen flex flex-col w-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-pearl-50 via-platinum-50 to-silver-100 -z-10" />

      <div className="flex-1 p-4 lg:p-8 pb-32">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 h-12">
            <div className="flex items-center justify-between text-sm text-silver-dark mb-2 font-modern h-6">
              <span>
                {language === "pl" ? "Krok" : "Step"} {currentStepIndex + 1} /{" "}
                {steps.length}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="glass-panel rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-gold via-champagne to-gold"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="w-full">
        <AwaDialogue currentStep="onboarding" fullWidth autoHide />
      </div>
    </div>
  );
}
