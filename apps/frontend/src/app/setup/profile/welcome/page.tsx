"use client";

import { motion } from "framer-motion";
import { ArrowRight, Heart, Sparkles, Zap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useProfileWizard } from "@/components/setup/profile/ProfileWizardContext";

export default function ProfileWelcomePage() {
  const { language } = useLanguage();
  const { completeStep } = useProfileWizard();

  return (
    <GlassCard className="p-8 lg:p-12 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold via-champagne to-platinum flex items-center justify-center"
      >
        <Heart size={40} className="text-white" fill="currentColor" />
      </motion.div>

      <h1 className="text-3xl lg:text-4xl xl:text-5xl font-nasalization bg-gradient-to-r from-gold via-champagne to-platinum bg-clip-text text-transparent mb-6">
        {language === "pl" ? "Poznajmy Się" : "Let's Get to Know You"}
      </h1>

      <p className="text-base lg:text-lg text-graphite font-modern max-w-2xl mx-auto mb-8">
        {language === "pl"
          ? "Poświęć 15 minut aby stworzyć swój Profil. To jednorazowe - raz wypełnione, pozostanie w Twoim profilu."
          : "Spend 15 minutes to create your Core Profile. One-time only - once filled, stays in your profile."}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
        {[
          {
            icon: Sparkles,
            label:
              language === "pl"
                ? "Preferencje wizualne"
                : "Visual preferences",
          },
          {
            icon: Heart,
            label: language === "pl" ? "Psychologia" : "Psychology",
          },
          {
            icon: Zap,
            label: language === "pl" ? "Styl życia" : "Lifestyle",
          },
        ].map((item, index) => (
          <div key={index} className="glass-panel rounded-xl p-4">
            <item.icon size={24} className="text-gold mx-auto mb-2" />
            <p className="text-sm font-modern text-graphite">{item.label}</p>
          </div>
        ))}
      </div>

      <GlassButton onClick={() => completeStep()} className="px-8 py-4">
        {language === "pl" ? "Zacznijmy!" : "Let's Start!"}
        <ArrowRight size={20} className="ml-2" />
      </GlassButton>
    </GlassCard>
  );
}
