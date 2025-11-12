"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useProfileWizard } from "@/components/setup/profile/ProfileWizardContext";

export default function ProfileSummaryPage() {
  const { language } = useLanguage();
  const { completeProfile, goToPreviousStep, isSubmitting } = useProfileWizard();

  return (
    <GlassCard className="p-8 lg:p-12 text-center">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold via-champagne to-platinum flex items-center justify-center shadow-xl"
      >
        <Check size={40} className="text-white" />
      </motion.div>

      <h1 className="text-3xl lg:text-4xl xl:text-5xl font-nasalization bg-gradient-to-r from-gold via-champagne to-platinum bg-clip-text text-transparent mb-6">
        {language === "pl" ? "Gotowe!" : "All Set!"}
      </h1>

      <p className="text-base lg:text-lg text-graphite font-modern max-w-2xl mx-auto mb-8">
        {language === "pl"
          ? "Wspaniale! Twój Core Profile jest kompletny. Teraz możemy tworzyć wnętrza które naprawdę odzwierciedlają KIM jesteś."
          : "Great! Your Core Profile is complete. Now we can create interiors that truly reflect WHO you are."}
      </p>

      <div className="flex justify-center gap-4">
        <GlassButton onClick={goToPreviousStep} variant="secondary" disabled={isSubmitting}>
          <ArrowLeft size={18} className="mr-2" />
          {language === "pl" ? "Wstecz" : "Back"}
        </GlassButton>
        <GlassButton onClick={completeProfile} disabled={isSubmitting} className="px-8">
          {isSubmitting
            ? language === "pl"
              ? "Zapisywanie..."
              : "Saving..."
            : language === "pl"
            ? "Zakończ"
            : "Complete"}
          <Check size={18} className="ml-2" />
        </GlassButton>
      </div>
    </GlassCard>
  );
}
