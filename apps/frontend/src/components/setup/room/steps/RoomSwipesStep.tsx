"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { ArrowLeft, Heart, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlassButton } from "@/components/ui/GlassButton";

interface RoomSwipeRecord {
  imageId: number;
  action: "like" | "dislike";
  timestamp: number;
  reactionTime: number;
  tags: string[];
  categories: Record<string, unknown>;
}

interface RoomImage {
  id: number;
  url: string;
  filename: string;
  tags: string[];
  categories: Record<string, unknown>;
}

interface RoomSwipesStepProps {
  roomType: string;
  onComplete: (swipes: RoomSwipeRecord[]) => void;
  onBack: () => void;
}

export function RoomSwipesStep({
  roomType,
  onComplete,
  onBack,
}: RoomSwipesStepProps) {
  const { language } = useLanguage();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [swipes, setSwipes] = useState<RoomSwipeRecord[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [roomImages, setRoomImages] = useState<RoomImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/tinder/livingroom", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load images");
        const data = await res.json();
        setRoomImages(data);
      } catch (error) {
        console.error("Failed to load room images:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchImages();
  }, [roomType]);

  useEffect(() => {
    setStartTime(Date.now());
  }, [currentImageIndex]);

  const handleSwipe = (action: "like" | "dislike") => {
    const currentImage = roomImages[currentImageIndex];
    if (!currentImage) return;

    const reactionTime = Date.now() - startTime;

    const newSwipe: RoomSwipeRecord = {
      imageId: currentImage.id,
      action,
      timestamp: Date.now(),
      reactionTime,
      tags: currentImage.tags,
      categories: currentImage.categories,
    };

    const updatedSwipes = [...swipes, newSwipe];
    setSwipes(updatedSwipes);

    if (currentImageIndex + 1 >= roomImages.length) {
      onComplete(updatedSwipes);
    } else {
      setCurrentImageIndex((index) => index + 1);
    }
  };

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      handleSwipe("like");
    } else if (info.offset.x < -threshold) {
      handleSwipe("dislike");
    }
    setIsDragging(false);
  };

  const currentImage = roomImages[currentImageIndex];
  const progress =
    roomImages.length > 0
      ? ((currentImageIndex + 1) / roomImages.length) * 100
      : 0;

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
                {currentImageIndex + 1} / {roomImages.length}
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
                  onDragStart={() => setIsDragging(true)}
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
                        alt="Room inspiration"
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

          <div className="flex justify-center gap-6 mb-6">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSwipe("dislike")}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 shadow-xl flex items-center justify-center transition-all z-10"
              disabled={isDragging}
            >
              <X size={36} className="text-red-600" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSwipe("like")}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-green-200 hover:from-green-200 hover:to-green-300 shadow-xl flex items-center justify-center transition-all z-10"
              disabled={isDragging}
            >
              <Heart size={36} className="text-green-600" />
            </motion.button>
          </div>

          <div className="flex justify-between">
            <GlassButton onClick={onBack} variant="secondary">
              <ArrowLeft size={18} />
              {language === "pl" ? "Wstecz" : "Back"}
            </GlassButton>
            <div className="text-sm font-modern text-silver-dark self-center">
              {language === "pl"
                ? "Przesuń w prawo lub lewo, aby ocenić zdjęcie"
                : "Swipe left or right to rate the photo"}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
