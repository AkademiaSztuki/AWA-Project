"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { Heart, X, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useProfileWizard } from "@/components/setup/profile/ProfileWizardContext";

interface TinderImage {
  id: number;
  url: string;
  filename: string;
  tags: string[];
  categories: Record<string, unknown>;
}

interface SwipeRecord {
  imageId: number;
  direction: "left" | "right";
  reactionTime: number;
  dwellTime: number;
  tags: string[];
  categories: Record<string, unknown>;
}

export default function TinderSwipesPage() {
  const { language } = useLanguage();
  const { completeStep, goToPreviousStep, profileData } =
    useProfileWizard();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipes, setSwipes] = useState<SwipeRecord[]>(
    profileData.tinderSwipes || []
  );
  const [startTime, setStartTime] = useState(() => Date.now());
  const [showInstructions, setShowInstructions] = useState(true);
  const [images, setImages] = useState<TinderImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/tinder/livingroom", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Failed to load images");
        }
        const data = await response.json();
        setImages(data);
      } catch (error) {
        console.error("Failed to load tinder images:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, []);

  useEffect(() => {
    setStartTime(Date.now());
  }, [currentIndex]);

  const currentImage = images[currentIndex];
  const progress = images.length > 0 ? (currentIndex / images.length) * 100 : 0;

  const handleCompletion = (records: SwipeRecord[]) => {
    completeStep({ tinderSwipes: records });
  };

  const handleSwipe = (direction: "left" | "right") => {
    if (!currentImage) {
      return;
    }

    const reactionTime = Date.now() - startTime;
    const dwellTime = reactionTime;

    const newRecord: SwipeRecord = {
      imageId: currentImage.id,
      direction,
      reactionTime,
      dwellTime,
      tags: currentImage.tags,
      categories: currentImage.categories,
    };

    const updatedSwipes = [...swipes, newRecord];
    setSwipes(updatedSwipes);

    if (currentIndex + 1 >= images.length) {
      handleCompletion(updatedSwipes);
    } else {
      setCurrentIndex((index) => index + 1);
    }
  };

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      handleSwipe("right");
    } else if (info.offset.x < -threshold) {
      handleSwipe("left");
    }
  };

  if (showInstructions) {
    return (
      <GlassCard className="p-6 md:p-8 text-center min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
        <h2 className="text-xl md:text-2xl font-nasalization text-graphite mb-3">
          {language === "pl" ? "Wnętrzarski Tinder" : "Interior Design Tinder"}
        </h2>
        <p className="text-graphite font-modern mb-4 text-sm">
          {language === "pl"
            ? `${
                isLoading
                  ? "Ładowanie..."
                  : `Pokażę Ci ${images.length} różnych wnętrz. Reaguj sercem, nie głową!`
              }`
            : `${
                isLoading
                  ? "Loading..."
                  : `I'll show you ${images.length} different interiors. React with your heart, not your head!`
              }`}
        </p>

        <div className="flex justify-center gap-8 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <X className="text-red-500" size={20} />
            </div>
            <span className="text-sm text-graphite">
              {language === "pl" ? "Nie" : "No"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Heart className="text-green-500" size={20} />
            </div>
            <span className="text-sm text-graphite">
              {language === "pl" ? "Tak!" : "Yes!"}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <GlassButton onClick={goToPreviousStep} variant="secondary">
            <ArrowLeft size={18} className="mr-2" />
            {language === "pl" ? "Wstecz" : "Back"}
          </GlassButton>
          <GlassButton onClick={() => setShowInstructions(false)}>
            {language === "pl" ? "Rozpocznij" : "Start"} →
          </GlassButton>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="w-full h-full">
      {isLoading ? (
        <div className="flex items-center justify-center h-96 text-silver-dark">
          {language === "pl"
            ? "Ładowanie zdjęć..."
            : "Loading images..."}
        </div>
      ) : (
        <>
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-silver-dark font-modern">
                {language === "pl" ? "Postęp" : "Progress"}
              </span>
              <span className="text-sm text-silver-dark font-modern">
                {currentIndex + 1} / {images.length}
              </span>
            </div>
            <div className="w-full bg-silver/20 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-gold to-champagne h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          <div className="relative h-[450px] md:h-[550px] mb-6">
            <AnimatePresence>
              {currentImage && (
                <motion.div
                  key={currentImage.id}
                  className="absolute inset-0 cursor-grab active:cursor-grabbing"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={handleDragEnd}
                  initial={{ scale: 0, rotate: 0 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{
                    scale: 0,
                    opacity: 0,
                    transition: { duration: 0.2 },
                  }}
                  whileDrag={{ scale: 1.05, rotate: 5 }}
                  style={{ touchAction: "none" }}
                >
                  <div className="h-full rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
                    <div className="relative h-full w-full">
                      <Image
                        src={currentImage.url}
                        alt="Interior"
                        fill
                        draggable={false}
                        className="object-cover w-full h-full select-none"
                        priority
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex justify-center gap-6">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSwipe("left")}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 shadow-xl flex items-center justify-center transition-all z-10"
            >
              <X size={36} className="text-red-600" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSwipe("right")}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-green-200 hover:from-green-200 hover:to-green-300 shadow-xl flex items-center justify-center transition-all z-10"
            >
              <Heart size={36} className="text-green-600" />
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
}
