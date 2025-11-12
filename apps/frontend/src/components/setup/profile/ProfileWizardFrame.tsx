"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { AwaDialogue } from "@/components/awa/AwaDialogue";
import { LoginModal } from "@/components/auth/LoginModal";
import { useProfileWizard } from "./ProfileWizardContext";

export function ProfileWizardFrame({ children }: { children: React.ReactNode }) {
  const {
    currentStep,
    currentStepIndex,
    steps,
    progress,
    currentInsight,
    showLoginModal,
    setShowLoginModal,
    handleLoginSuccess,
  } = useProfileWizard();
  const { language } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col w-full">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto">
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

          <AnimatePresence>
            {currentInsight && (
              <motion.div
                key="wizard-insight"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
                className="mb-6"
              >
                <div className="glass-panel rounded-xl p-4 bg-gradient-to-r from-gold/10 via-champagne/10 to-platinum/10 border-2 border-gold/30">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles size={18} className="text-white" />
                    </div>
                    <p className="text-sm font-modern text-graphite flex-1">
                      {currentInsight}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
        message={
          language === "pl"
            ? "Świetnie! Zaloguj się aby zachować swój profil i wrócić później."
            : "Great! Sign in to save your profile and return later."
        }
      />
    </div>
  );
}
