"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useProfileWizard } from "@/components/setup/profile/ProfileWizardContext";

interface ColorsMaterialsData {
  selectedPalette: string;
  topMaterials: string[];
}

const INITIAL_STATE: ColorsMaterialsData = {
  selectedPalette: "",
  topMaterials: [],
};

export default function ColorsMaterialsPage() {
  const { language } = useLanguage();
  const { profileData, updateProfile, completeStep, goToPreviousStep } =
    useProfileWizard();

  const [state, setState] = useState<ColorsMaterialsData>(() => ({
    ...INITIAL_STATE,
    ...profileData.colorsAndMaterials,
  }));

  useEffect(() => {
    if (profileData.colorsAndMaterials) {
      setState({
        ...INITIAL_STATE,
        ...profileData.colorsAndMaterials,
      });
    }
  }, [profileData.colorsAndMaterials]);

  const paletteOptions = useMemo(
    () => [
      {
        id: "warm-earth",
        colors: ["#8B7355", "#D4A574", "#F5DEB3", "#E6D5B8"],
        label: { pl: "Ciepła Ziemia", en: "Warm Earth" },
      },
      {
        id: "cool-nordic",
        colors: ["#E8F1F5", "#B0C4DE", "#778899", "#A9B8C2"],
        label: { pl: "Nordycki Chłód", en: "Cool Nordic" },
      },
      {
        id: "vibrant-bold",
        colors: ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3"],
        label: { pl: "Odważne Kolory", en: "Vibrant Bold" },
      },
      {
        id: "natural-green",
        colors: ["#6B8E23", "#8FBC8F", "#F5F5DC", "#DEB887"],
        label: { pl: "Naturalna Zieleń", en: "Natural Green" },
      },
      {
        id: "monochrome",
        colors: ["#2C2C2C", "#5C5C5C", "#8C8C8C", "#E8E8E8"],
        label: { pl: "Monochromatyczne", en: "Monochrome" },
      },
      {
        id: "soft-pastels",
        colors: ["#FFB6C1", "#E6E6FA", "#FFE4E1", "#F0E68C"],
        label: { pl: "Miękkie Pastele", en: "Soft Pastels" },
      },
    ],
    []
  );

  const materialOptions = useMemo(
    () => [
      { id: "wood", label: { pl: "Drewno", en: "Wood" } },
      { id: "metal", label: { pl: "Metal", en: "Metal" } },
      { id: "fabric", label: { pl: "Tkaniny", en: "Fabric" } },
      { id: "stone", label: { pl: "Kamień", en: "Stone" } },
      { id: "glass", label: { pl: "Szkło", en: "Glass" } },
      { id: "leather", label: { pl: "Skóra", en: "Leather" } },
    ],
    []
  );

  const canProceed =
    state.selectedPalette && (state.topMaterials?.length ?? 0) > 0;

  const toggleMaterial = (material: string) => {
    setState((prev) => {
      const materials = prev.topMaterials ?? [];
      return materials.includes(material)
        ? { ...prev, topMaterials: materials.filter((item) => item !== material) }
        : { ...prev, topMaterials: [...materials, material] };
    });
  };

  const handleNext = () => {
    updateProfile({ colorsAndMaterials: state });
    completeStep({ colorsAndMaterials: state });
  };

  return (
    <GlassCard className="p-6 md:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
      <h2 className="text-xl md:text-2xl font-nasalization text-graphite mb-2">
        {language === "pl" ? "Kolory i Materiały" : "Colors & Materials"}
      </h2>
      <p className="text-graphite font-modern mb-6 text-sm">
        {language === "pl"
          ? "Wybierz swoją paletę i ulubione materiały..."
          : "Choose your palette and favorite materials..."}
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-graphite mb-2">
            {language === "pl"
              ? "Która paleta kolorów najbardziej Ciebie odzwierciedla?"
              : "Which color palette reflects you most?"}
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {paletteOptions.map((palette) => (
              <button
                key={palette.id}
                type="button"
                onClick={() =>
                  setState((prev) => ({ ...prev, selectedPalette: palette.id }))
                }
                className={`rounded-lg p-3 transition-all duration-300 cursor-pointer group ${
                  state.selectedPalette === palette.id
                    ? "bg-gold/30 border-2 border-gold shadow-lg"
                    : "bg-white/10 border border-white/30 hover:bg-gold/10 hover:border-gold/50"
                }`}
              >
                <div className="flex gap-1 mb-2 h-8">
                  {palette.colors.map((color, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="text-xs font-modern text-graphite text-center font-semibold group-hover:text-gold-700 transition-colors">
                  {palette.label[language]}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-graphite mb-2">
            {language === "pl"
              ? "Jakich materiałów chcesz dotykać?"
              : "What materials do you want to touch?"}
            <span className="text-xs text-silver-dark ml-2">
              ({language === "pl" ? "wybierz kilka" : "select multiple"})
            </span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {materialOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleMaterial(option.id)}
                className={`rounded-lg p-4 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                  state.topMaterials?.includes(option.id)
                    ? "bg-gold/30 border-2 border-gold text-graphite shadow-lg"
                    : "bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700"
                }`}
              >
                {option.label[language]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
        <GlassButton onClick={goToPreviousStep} variant="secondary">
          <ArrowLeft size={18} className="mr-2" />
          {language === "pl" ? "Wstecz" : "Back"}
        </GlassButton>
        <GlassButton onClick={handleNext} disabled={!canProceed}>
          {language === "pl" ? "Dalej" : "Next"}
          <ArrowRight size={18} className="ml-2" />
        </GlassButton>
      </div>
    </GlassCard>
  );
}
