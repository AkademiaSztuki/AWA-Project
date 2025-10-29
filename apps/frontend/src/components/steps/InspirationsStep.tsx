"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSessionData } from "@/hooks/useSessionData";
import { analyzeInspirationsWithGamma } from "@/lib/vision/gamma-tagging";
import { getSupabase } from "@/lib/supabase";
import { 
  Upload, 
  ArrowRight, 
  ArrowLeft,
  X,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  Sparkles
} from "lucide-react";

interface InspirationItem {
  id: string;
  file: File;
  previewUrl: string;
  fileId?: string;
  url?: string;
  tags?: {
    styles?: string[];
    colors?: string[];
    materials?: string[];
    biophilia?: number;
  };
  description?: string;
  addedAt: string;
  isTagging?: boolean;
}

interface InspirationsStepProps {
  data?: Array<{
    id: string;
    fileId?: string;
    url?: string;
    tags?: {
      styles?: string[];
      colors?: string[];
      materials?: string[];
      biophilia?: number;
    };
    description?: string;
    addedAt: string;
  }>;
  onUpdate: (data: Array<{
    id: string;
    fileId?: string;
    url?: string;
    tags?: {
      styles?: string[];
      colors?: string[];
      materials?: string[];
      biophilia?: number;
    };
    description?: string;
    addedAt: string;
  }>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function InspirationsStep({ data, onUpdate, onNext, onBack }: InspirationsStepProps) {
  const { language } = useLanguage();
  const { updateSessionData } = useSessionData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isTagging, setIsTagging] = useState(false);

  const t = (pl: string, en: string) => (language === "pl" ? pl : en);

  // Load existing data
  useEffect(() => {
    if (data && data.length > 0) {
      // Convert existing data to InspirationItem format
      const existingItems: InspirationItem[] = data.map(item => ({
        id: item.id,
        file: new File([], 'existing-image'), // Placeholder file
        previewUrl: item.url || '',
        fileId: item.fileId,
        url: item.url,
        tags: item.tags,
        description: item.description,
        addedAt: item.addedAt
      }));
      setItems(existingItems);
    }
  }, [data]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    const existing = items.length;
    const toAdd = arr.slice(0, Math.max(0, 10 - existing));
    const mapped = toAdd.map((file, idx) => ({
      id: `${Date.now()}_${existing + idx}`,
      file,
      previewUrl: URL.createObjectURL(file),
      addedAt: new Date().toISOString()
    }));
    setItems(prev => [...prev, ...mapped]);
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item?.previewUrl && item.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const uploadToSupabase = async (file: File, fileId: string): Promise<string> => {
    const { data: uploadData, error } = await getSupabase().storage
      .from('aura-assets')
      .upload(`inspirations/${fileId}`, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: { publicUrl } } = getSupabase().storage
      .from('aura-assets')
      .getPublicUrl(uploadData.path);

    return publicUrl;
  };

  const tagItems = async (itemsToTag: InspirationItem[]) => {
    setIsTagging(true);
    
    for (const item of itemsToTag) {
      if (item.tags || item.isTagging) continue;
      
      try {
        setItems(prev => prev.map(i => 
          i.id === item.id ? { ...i, isTagging: true } : i
        ));

        const result = await analyzeInspirationsWithGamma([item.file]);
        if (result.length > 0) {
          const analysis = result[0];
          setItems(prev => prev.map(i => 
            i.id === item.id ? { 
              ...i, 
              tags: analysis.tags,
              description: analysis.description,
              isTagging: false
            } : i
          ));
        }
      } catch (error) {
        console.error('Error analyzing inspiration:', error);
        setItems(prev => prev.map(i => 
          i.id === item.id ? { ...i, isTagging: false } : i
        ));
      }
    }
    
    setIsTagging(false);
  };

  // Auto-tag new items
  useEffect(() => {
    const untaggedItems = items.filter(item => !item.tags && !item.isTagging && item.file);
    if (untaggedItems.length > 0) {
      tagItems(untaggedItems);
    }
  }, [items]);

  const handleSave = async () => {
    setIsUploading(true);
    
    try {
      const itemsToUpload = items.filter(item => item.file && !item.fileId);
      const uploadedItems = [...items];

      // Upload new files to Supabase
      for (const item of itemsToUpload) {
        try {
          const fileId = `inspiration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const url = await uploadToSupabase(item.file, fileId);
          
          const index = uploadedItems.findIndex(i => i.id === item.id);
          if (index !== -1) {
            uploadedItems[index] = {
              ...uploadedItems[index],
              fileId,
              url
            };
          }
        } catch (error) {
          console.error('Failed to upload item:', error);
        }
      }

      // Convert to the format expected by parent
      const formattedItems = uploadedItems.map(item => ({
        id: item.id,
        fileId: item.fileId,
        url: item.url || item.previewUrl,
        tags: item.tags,
        description: item.description,
        addedAt: item.addedAt
      }));

      onUpdate(formattedItems);
      
      // Also save to session data
      await updateSessionData({
        inspirations: formattedItems
      } as any);
      
      onNext();
    } finally {
      setIsUploading(false);
    }
  };

  const handleSkip = () => {
    onNext();
  };

  const canProceed = items.length >= 1 && items.length <= 10;

  return (
    <GlassCard className="p-6 md:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, 2, -2, 0]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            repeatDelay: 2
          }}
          className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold via-champagne to-platinum flex items-center justify-center"
        >
          <ImageIcon size={40} className="text-white" />
        </motion.div>
        
        <h2 className="text-2xl md:text-3xl font-nasalization bg-gradient-to-r from-gold via-champagne to-platinum bg-clip-text text-transparent mb-4">
          {t("Zdjęcia Inspiracji", "Inspiration Images")}
        </h2>
        <p className="text-lg text-graphite font-modern max-w-2xl mx-auto">
          {t(
            "Prześlij 1-10 zdjęć które Cię inspirują. IDA przeanalizuje je i użyje do personalizacji wnętrz.",
            "Upload 1-10 images that inspire you. IDA will analyze them and use them to personalize your interiors."
          )}
        </p>
      </div>

      {/* Upload Area */}
      <div className="mb-8">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gold/30 rounded-xl p-8 text-center cursor-pointer hover:border-gold/50 hover:bg-gold/5 transition-all duration-300"
        >
          <Upload size={48} className="mx-auto mb-4 text-gold" />
          <h3 className="text-lg font-nasalization text-graphite mb-2">
            {t("Kliknij aby dodać zdjęcia", "Click to add images")}
          </h3>
          <p className="text-sm text-silver-dark font-modern">
            {t("JPG, PNG, WebP (max 10MB)", "JPG, PNG, WebP (max 10MB)")}
          </p>
          <p className="text-xs text-silver-dark font-modern mt-1">
            {t("1-10 zdjęć", "1-10 images")}
          </p>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Image Grid */}
      {items.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-nasalization text-graphite mb-4">
            {t("Twoje Inspiracje", "Your Inspirations")} ({items.length}/10)
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group"
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-white/10">
                  <img
                    src={item.previewUrl}
                    alt={`Inspiration ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-2 transition-all duration-300 hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
                  {/* Tagging indicator */}
                  {item.isTagging && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 size={24} className="text-white animate-spin mx-auto mb-2" />
                        <p className="text-white text-xs font-modern">
                          {t("Analizuję...", "Analyzing...")}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Tags indicator */}
                  {item.tags && !item.isTagging && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-green-500 text-white rounded-full p-1">
                        <CheckCircle size={16} />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Tags preview */}
                {item.tags && (
                  <div className="mt-2 space-y-1">
                    {item.tags.styles?.slice(0, 2).map((style, i) => (
                      <span
                        key={i}
                        className="inline-block bg-gold/20 text-gold text-xs px-2 py-1 rounded-full mr-1"
                      >
                        {style}
                      </span>
                    ))}
                    {item.tags.colors?.slice(0, 2).map((color, i) => (
                      <span
                        key={i}
                        className="inline-block bg-champagne/20 text-champagne text-xs px-2 py-1 rounded-full mr-1"
                      >
                        {color}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Status */}
      {isTagging && (
        <div className="mb-6 p-4 glass-panel rounded-xl">
          <div className="flex items-center gap-3">
            <Loader2 size={20} className="text-gold animate-spin" />
            <span className="text-graphite font-modern">
              {t("Analizuję zdjęcia w tle...", "Analyzing images in background...")}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <GlassButton
          onClick={onBack}
          variant="secondary"
          className="px-6 py-3"
        >
          <ArrowLeft size={18} className="mr-2" />
          {t("Wstecz", "Back")}
        </GlassButton>

        <div className="flex gap-4">
          <GlassButton
            onClick={handleSkip}
            variant="secondary"
            className="px-6 py-3"
          >
            {t("Pomiń", "Skip")}
          </GlassButton>
          
          <GlassButton
            onClick={handleSave}
            disabled={!canProceed || isUploading}
            className="px-6 py-3"
          >
            {isUploading ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                {t("Zapisywanie...", "Saving...")}
              </>
            ) : (
              <>
                {t("Dalej", "Next")}
                <ArrowRight size={18} className="ml-2" />
              </>
            )}
          </GlassButton>
        </div>
      </div>
    </GlassCard>
  );
}
