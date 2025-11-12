"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Activity } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { ACTIVITY_QUESTIONS } from "@/lib/questions/adaptive-questions";

interface ActivitiesStepProps {
  roomType: string;
  selected: string[];
  satisfaction?: Record<string, string>;
  onUpdate: (
    activities: string[],
    satisfaction: Record<string, string>
  ) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ActivitiesStep({
  roomType,
  selected,
  satisfaction,
  onUpdate,
  onNext,
  onBack,
}: ActivitiesStepProps) {
  const { t, language } = useLanguage();
  const [selectedActivities, setSelectedActivities] = useState<string[]>(
    selected || []
  );
  const [activitySatisfaction, setActivitySatisfaction] = useState<
    Record<string, string>
  >(satisfaction || {});

  const activities = ACTIVITY_QUESTIONS[roomType] || ACTIVITY_QUESTIONS.default;

  const toggleActivity = (id: string) => {
    const updated = selectedActivities.includes(id)
      ? selectedActivities.filter((activity) => activity !== id)
      : [...selectedActivities, id];
    setSelectedActivities(updated);
  };

  const setSatisfaction = (activityId: string, level: string) => {
    setActivitySatisfaction((prev) => ({ ...prev, [activityId]: level }));
  };

  const handleNext = () => {
    onUpdate(selectedActivities, activitySatisfaction);
    onNext();
  };

  return (
    <motion.div
      key="activities"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <GlassCard className="p-6 lg:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
            <Activity size={24} className="text-white" />
          </div>
          <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite">
            {language === "pl" ? "Co tu robisz?" : "What do you do here?"}
          </h2>
        </div>

        <p className="text-graphite font-modern mb-6">
          {language === "pl"
            ? "Wybierz wszystkie aktywności które wykonujesz w tym pokoju"
            : "Select all activities you do in this room"}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {activities.map((activity) => {
            const isSelected = selectedActivities.includes(activity.id);
            return (
              <button
                key={activity.id}
                onClick={() => toggleActivity(activity.id)}
                className={`glass-panel rounded-xl p-4 transition-all duration-300 ${
                  isSelected
                    ? "border-2 border-gold bg-gold/10 scale-105"
                    : "border border-white/30 hover:border-gold/30"
                }`}
              >
                <div className="w-8 h-8 mx-auto mb-3 rounded-full bg-gradient-to-br from-gold/20 to-champagne/20 flex items-center justify-center">
                  <div className="w-4 h-4 bg-gradient-to-br from-gold to-champagne rounded-full" />
                </div>
                <p className="text-xs font-modern text-graphite text-center leading-tight">
                  {t(activity.label)}
                </p>
              </button>
            );
          })}
        </div>

        {selectedActivities.length > 0 && (
          <div className="glass-panel rounded-xl p-6 mb-6">
            <p className="text-sm font-semibold text-graphite mb-4">
              {language === "pl"
                ? "Jak dobrze pokój wspiera każdą aktywność?"
                : "How well does the room support each activity?"}
            </p>

            <div className="space-y-4">
              {selectedActivities.map((activityId) => {
                const activity = activities.find((item) => item.id === activityId);
                if (!activity) return null;

                return (
                  <div
                    key={activityId}
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{activity.icon}</span>
                      <span className="text-sm font-modern text-graphite">
                        {t(activity.label)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {[
                        {
                          id: "great",
                          emoji: "😊",
                          label: language === "pl" ? "Świetnie" : "Great",
                        },
                        { id: "ok", emoji: "😐", label: "OK" },
                        {
                          id: "difficult",
                          emoji: "😕",
                          label: language === "pl" ? "Trudno" : "Difficult",
                        },
                      ].map((level) => (
                        <button
                          key={level.id}
                          onClick={() => setSatisfaction(activityId, level.id)}
                          className={`w-12 h-12 rounded-xl transition-all duration-300 ${
                            activitySatisfaction[activityId] === level.id
                              ? "glass-panel border-2 border-gold bg-gold/10 scale-110"
                              : "glass-panel border border-white/30 hover:scale-105"
                          }`}
                          title={level.label}
                        >
                          <span className="text-xl">{level.emoji}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <GlassButton onClick={onBack} variant="secondary">
            <ArrowLeft size={18} className="mr-2" />
            {language === "pl" ? "Wstecz" : "Back"}
          </GlassButton>
          <GlassButton
            onClick={handleNext}
            disabled={selectedActivities.length === 0}
          >
            {language === "pl" ? "Dalej" : "Next"}
            <ArrowRight size={18} className="ml-2" />
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}
