"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Camera } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useModalAPI } from "@/hooks/useModalAPI";

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });

interface PhotoUploadStepProps {
  photos?: string[];
  roomType?: string;
  onUpdate: (photos: string[], roomType?: string | null, roomName?: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const ROOM_TYPE_TRANSLATIONS: Record<string, string> = {
  kitchen: "Kuchnia",
  bedroom: "Sypialnia",
  living_room: "Pokój dzienny",
  bathroom: "Łazienka",
  dining_room: "Jadalnia",
  office: "Biuro",
  empty_room: "Puste pomieszczenie",
};

const generateRoomName = (type: string): string => {
  const names: Record<string, string> = {
    kitchen: "Kuchnia",
    bedroom: "Sypialnia",
    living_room: "Salon",
    bathroom: "Łazienka",
    dining_room: "Jadalnia",
    office: "Biuro",
    empty_room: "Pomieszczenie",
  };
  return names[type] || "Pomieszczenie";
};

export function PhotoUploadStep({
  photos,
  roomType,
  onUpdate,
  onNext,
  onBack,
}: PhotoUploadStepProps) {
  const { language } = useLanguage();
  const { analyzeRoom } = useModalAPI();
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>(photos || []);
  const [uploadedPhotosBase64, setUploadedPhotosBase64] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [roomAnalysis, setRoomAnalysis] = useState<any>(null);
  const [detectedRoomType, setDetectedRoomType] = useState<string | null>(
    roomType || null
  );
  const [llmComment, setLlmComment] = useState<{
    comment: string;
    suggestions: string[];
  } | null>(null);
  const [humanComment, setHumanComment] = useState<string | null>(null);
  const [showRoomTypeSelection, setShowRoomTypeSelection] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");

  const analyzeImage = async (file: File) => {
    setIsAnalyzing(true);
    try {
      const base64 = await toBase64(file);
      const analysis = await analyzeRoom({ image: base64 });

      setRoomAnalysis(analysis);
      setDetectedRoomType(analysis.detected_room_type);

      if (analysis.detected_room_type && !roomName) {
        setRoomName(generateRoomName(analysis.detected_room_type));
      }

      if (analysis.comment) {
        setLlmComment({
          comment: analysis.comment,
          suggestions: analysis.suggestions || [],
        });
      }

      if (analysis.human_comment) {
        setHumanComment(analysis.human_comment);
      }
    } catch (error) {
      console.error("Error analyzing room:", error);
      if (error instanceof Error && error.message.includes("408")) {
        alert(
          "Model AI jest jeszcze ładowany (pierwsze uruchomienie). Spróbuj ponownie za chwilę."
        );
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExampleSelect = async (imageUrl: string) => {
    try {
      const exampleMetadata: Record<string, any> = {
        "/images/tinder/Living Room (1).jpg": {
          roomType: "living_room",
          roomName: "Salon",
          confidence: 0.95,
          roomDescription: "Modern living room with comfortable seating",
          comment:
            "This is a bright, modern living space with excellent natural light.",
          humanComment:
            "Nowoczesny salon z dużą ilością światła naturalnego i wygodnymi meblami.",
        },
        "/images/tinder/Living Room (2).jpg": {
          roomType: "living_room",
          roomName: "Salon",
          confidence: 0.93,
          roomDescription: "Contemporary living room with minimalist design",
          comment: "A minimalist living room with clean lines and neutral colors.",
          humanComment:
            "Minimalistyczny salon z czystymi liniami i stonowanymi kolorami.",
        },
        "/images/tinder/Living Room (3).jpg": {
          roomType: "living_room",
          roomName: "Salon",
          confidence: 0.92,
          roomDescription: "Cozy living room with warm atmosphere",
          comment: "A cozy, inviting living room with warm tones.",
          humanComment:
            "Przytulny salon z ciepłymi tonami i przyjazną atmosferą.",
        },
      };

      const metadata = exampleMetadata[imageUrl];

      if (metadata) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File(
          [blob],
          imageUrl.split("/").pop() || "image.jpg",
          { type: blob.type }
        );

        const base64 = await toBase64(file);
        const imageObjectUrl = URL.createObjectURL(blob);

        const newPhotos = [...uploadedPhotos, imageObjectUrl];
        const newPhotosBase64 = [...uploadedPhotosBase64, base64];

        setUploadedPhotos(newPhotos);
        setUploadedPhotosBase64(newPhotosBase64);
        setSelectedImage(imageObjectUrl);
        onUpdate(newPhotosBase64);

        setDetectedRoomType(metadata.roomType);
        setRoomName(metadata.roomName);
        setRoomAnalysis({
          detected_room_type: metadata.roomType,
          confidence: metadata.confidence,
          room_description: metadata.roomDescription,
          comment: metadata.comment,
          suggestions: [],
        });
        setLlmComment({
          comment: metadata.comment,
          suggestions: [],
        });
        setHumanComment(metadata.humanComment);
      } else {
        setIsAnalyzing(true);
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File(
          [blob],
          imageUrl.split("/").pop() || "image.jpg",
          { type: blob.type }
        );

        const base64 = await toBase64(file);
        const imageObjectUrl = URL.createObjectURL(file);

        const newPhotos = [...uploadedPhotos, imageObjectUrl];
        const newPhotosBase64 = [...uploadedPhotosBase64, base64];

        setUploadedPhotos(newPhotos);
        setUploadedPhotosBase64(newPhotosBase64);
        setSelectedImage(imageObjectUrl);
        onUpdate(newPhotosBase64);

        await analyzeImage(file);
      }
    } catch (error) {
      console.error("Error fetching example image", error);
      alert("Błąd podczas ładowania przykładowego zdjęcia");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const unsupportedFormats = ["image/avif", "image/webp", "image/gif"];
    if (unsupportedFormats.includes(file.type)) {
      alert(
        `Format ${file.type} nie jest obsługiwany. Proszę użyć formatów: JPG, PNG, TIFF, HEIC.`
      );
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert(
        `Nieprawidłowy typ pliku: ${file.type}. Proszę wybrać obraz (JPG, PNG, TIFF, HEIC).`
      );
      return;
    }

    try {
      const base64 = await toBase64(file);
      const imageUrl = URL.createObjectURL(file);
      const newPhotos = [...uploadedPhotos, imageUrl];
      const newPhotosBase64 = [...uploadedPhotosBase64, base64];

      setUploadedPhotos(newPhotos);
      setUploadedPhotosBase64(newPhotosBase64);
      setSelectedImage(imageUrl);

      onUpdate(newPhotosBase64);

      await analyzeImage(file);
    } catch (error) {
      console.error("Error processing file", error);
      alert(
        error instanceof Error
          ? error.message
          : "Błąd podczas przetwarzania pliku"
      );
    }
  };

  return (
    <motion.div
      key="photo_upload"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <GlassCard className="p-6 lg:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
            <Camera size={24} className="text-white" />
          </div>
          <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite">
            {language === "pl" ? "Pokaż Nam Pomieszczenie" : "Show Us the Space"}
          </h2>
        </div>

        <p className="text-graphite font-modern mb-6">
          {language === "pl"
            ? "Prześlij zdjęcie obecnego stanu pomieszczenia. IDA przeanalizuje je i automatycznie rozpozna typ pomieszczenia."
            : "Upload a photo of the current space state. IDA will analyze it and automatically detect the room type."}
        </p>

        {isAnalyzing && (
          <div className="mb-6 p-6 glass-panel rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="w-6 h-6 border-2 border-gold/40 border-t-gold rounded-full animate-spin" />
              <div>
                <p className="text-graphite font-modern font-semibold text-lg">
                  {language === "pl"
                    ? "IDA analizuje pomieszczenie..."
                    : "IDA is analyzing the room..."}
                </p>
                <p className="text-silver-dark text-sm font-modern">
                  {language === "pl"
                    ? "To może potrwać chwilę"
                    : "This may take a moment"}
                </p>
              </div>
            </div>
          </div>
        )}

        {detectedRoomType && !isAnalyzing && (
          <div className="mb-6 p-6 glass-panel rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-gradient-to-r from-gold/20 to-champagne/20 rounded-full flex items-center justify-center flex-shrink-0">
                <div className="w-4 h-4 bg-gradient-to-r from-gold to-champagne rounded-full" />
              </div>
              <div className="flex-1">
                <p className="text-graphite font-modern font-bold text-lg mb-3">
                  {language === "pl" ? "IDA wykryła: " : "IDA detected: "}
                  <span className="text-gold">
                    {ROOM_TYPE_TRANSLATIONS[detectedRoomType] || detectedRoomType}
                  </span>
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRoomTypeSelection(true)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-graphite text-sm font-modern font-semibold rounded-xl transition-all duration-200 hover:scale-105 border border-white/20"
                  >
                    {language === "pl"
                      ? "Zmień typ pomieszczenia"
                      : "Change room type"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {llmComment && !isAnalyzing && (
          <div className="mb-6 p-6 glass-panel rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-gradient-to-r from-gold/20 to-champagne/20 rounded-full flex items-center justify-center flex-shrink-0">
                <div className="w-4 h-4 bg-gradient-to-r from-gold to-champagne rounded-full" />
              </div>
              <div className="flex-1">
                <p className="text-graphite font-modern font-bold text-lg mb-3">
                  {language === "pl" ? "Komentarz IDA:" : "IDA Comment:"}
                </p>
                <p className="text-sm text-graphite font-modern leading-relaxed bg-white/5 p-4 rounded-xl border border-white/10 mb-4">
                  {llmComment.comment}
                </p>
                {humanComment && (
                  <>
                    <p className="text-graphite font-modern font-bold text-lg mb-3">
                      {language === "pl"
                        ? "Komentarz IDA po polsku:"
                        : "IDA Comment in Polish:"}
                    </p>
                    <p className="text-sm text-graphite font-modern leading-relaxed bg-gradient-to-r from-gold/10 to-champagne/10 p-4 rounded-xl border border-gold/20 mb-4">
                      {humanComment}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {showRoomTypeSelection && (
          <div className="mb-6 p-6 glass-panel rounded-2xl">
            <h3 className="text-sm font-bold text-graphite mb-3 font-modern">
              {language === "pl" ? "Typ pomieszczenia" : "Room type"}
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "living_room", label: language === "pl" ? "Pokój dzienny" : "Living Room" },
                { id: "bedroom", label: language === "pl" ? "Sypialnia" : "Bedroom" },
                { id: "kitchen", label: language === "pl" ? "Kuchnia" : "Kitchen" },
                { id: "dining_room", label: language === "pl" ? "Jadalnia" : "Dining Room" },
                { id: "bathroom", label: language === "pl" ? "Łazienka" : "Bathroom" },
                { id: "office", label: language === "pl" ? "Biuro" : "Office" },
                { id: "empty_room", label: language === "pl" ? "Puste pomieszczenie" : "Empty Room" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setDetectedRoomType(opt.id);
                    setRoomName(generateRoomName(opt.id));
                    setShowRoomTypeSelection(false);
                  }}
                  className={`px-3 py-2 rounded-xl text-sm border transition-all duration-200 ${
                    detectedRoomType === opt.id
                      ? "bg-gold/20 border-gold text-graphite"
                      : "bg-white/10 border-white/30 text-graphite hover:bg-white/20"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!selectedImage && (
          <>
            <div className="glass-panel rounded-2xl p-8 border-2 border-dashed border-gold/30 hover:border-gold/50 transition-colors mb-6">
              <label className="cursor-pointer flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center mb-4">
                  <Camera size={32} className="text-white" />
                </div>
                <p className="text-graphite font-semibold mb-2">
                  {language === "pl"
                    ? "Kliknij aby dodać zdjęcie"
                    : "Click to add photo"}
                </p>
                <p className="text-sm text-silver-dark">
                  {language === "pl" ? "Lub przeciągnij i upuść" : "Or drag and drop"}
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/tiff,image/heic,image/heif"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isAnalyzing}
                />
              </label>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-bold text-graphite mb-3 font-modern">
                {language === "pl" ? "Przykładowe zdjęcia" : "Example photos"}
              </h3>
              <div className="flex gap-3 justify-center flex-wrap">
                {[
                  "/images/tinder/Living Room (1).jpg",
                  "/images/tinder/Living Room (2).jpg",
                  "/images/tinder/Living Room (3).jpg",
                ].map((img, idx) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => handleExampleSelect(img)}
                    className="border-2 border-transparent hover:border-gold rounded-xl transition-all"
                    disabled={isAnalyzing}
                  >
                    <img
                      src={img}
                      alt={`Przykład ${idx + 1}`}
                      className="w-24 h-16 rounded-xl object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {selectedImage && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-graphite font-modern">
                {language === "pl" ? "Wybrane zdjęcie" : "Selected photo"}
              </h3>
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setDetectedRoomType(null);
                  setRoomAnalysis(null);
                  setLlmComment(null);
                  setHumanComment(null);
                  setRoomName("");
                }}
                className="text-sm text-silver-dark hover:text-gold transition-colors font-modern"
              >
                {language === "pl" ? "Zmień zdjęcie" : "Change photo"}
              </button>
            </div>
            <div className="relative">
              <img
                src={selectedImage}
                alt={language === "pl" ? "Wybrane zdjęcie" : "Selected photo"}
                className="w-full max-w-md mx-auto rounded-xl shadow-lg"
              />
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <GlassButton onClick={onBack} variant="secondary">
            <ArrowLeft size={18} />
            {language === "pl" ? "Wstecz" : "Back"}
          </GlassButton>
          <GlassButton
            onClick={() => {
              onUpdate(uploadedPhotosBase64, detectedRoomType, roomName);
              onNext();
            }}
            disabled={isAnalyzing || !detectedRoomType}
          >
            {isAnalyzing
              ? language === "pl"
                ? "Analizuje..."
                : "Analyzing..."
              : language === "pl"
              ? "Dalej"
              : "Next"}
            <ArrowRight size={18} />
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}
