"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { AwaContainer } from "@/components/awa/AwaContainer";
import { AwaDialogue } from "@/components/awa/AwaDialogue";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSessionData } from "@/hooks/useSessionData";
import { analyzeInspirationsWithGamma, type InspirationTaggingResult } from "@/lib/vision/gamma-tagging";
import { supabase } from "@/lib/supabase";
import { 
  Upload, 
  X, 
  Sparkles, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  Image as ImageIcon
} from "lucide-react";

interface LocalInspiration {
  id: string;
  file: File;
  previewUrl: string;
  tags?: InspirationTaggingResult["tags"];
  description?: string;
  isTagging?: boolean;
  error?: string;
}

export default function InspirationsPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const { sessionData, updateSessionData } = useSessionData();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<LocalInspiration[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = (pl: string, en: string) => (language === "pl" ? pl : en);

  // Auto-tag on upload in background (non-blocking)
  useEffect(() => {
    const untagged = items.filter(i => !i.tags && !i.isTagging && !i.error);
    if (untagged.length === 0) return;
    // mark as tagging immediately for UX
    setItems(prev => prev.map(it => untagged.some(u => u.id === it.id) ? { ...it, isTagging: true } : it));
    // fire-and-forget background tagging
    void tagItems(untagged);
  }, [items.length]);

  const handlePickFiles = () => inputRef.current?.click();

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    const existing = items.length;
    const toAdd = arr.slice(0, Math.max(0, 10 - existing));
    const mapped = toAdd.map((file, idx) => ({
      id: `${Date.now()}_${existing + idx}`,
      file,
      previewUrl: URL.createObjectURL(file),
      // Start as not tagging; the effect will flip to tagging and call the analyzer
      isTagging: false,
    }));
    setItems(prev => [...prev, ...mapped]);
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  };

  const tagItems = async (itemsToTag: LocalInspiration[]) => {
    try {
      const files = itemsToTag.map(i => i.file);
      const results = await analyzeInspirationsWithGamma(files);
      
      setItems(prev => prev.map(item => {
        const targetItem = itemsToTag.find(i => i.id === item.id);
        if (!targetItem) return item;
        
        const result = results[itemsToTag.indexOf(targetItem)];
        return result ? { 
          ...item, 
          tags: result.tags, 
          description: result.description,
          isTagging: false 
        } : { ...item, isTagging: false, error: "Tagging failed" };
      }));

      // Persist partial results to session in background
      const payload = (current: LocalInspiration[]) => current.map(i => ({
        id: i.id,
        fileId: undefined,
        tags: i.tags,
        description: i.description,
        addedAt: new Date().toISOString(),
      }));
      setTimeout(() => updateSessionData({ inspirations: payload(items) } as any), 0);
    } catch (error) {
      console.error("Tagging failed:", error);
      setItems(prev => prev.map(item => 
        itemsToTag.some(i => i.id === item.id) 
          ? { ...item, isTagging: false, error: "Tagging failed" }
          : item
      ));
    }
  };

  const tagOne = async (index: number) => {
    setItems(prev => prev.map((it, i) => (i === index ? { ...it, isTagging: true, error: undefined } : it)));
    try {
      const res = await analyzeInspirationsWithGamma([items[index].file]);
      const first = res[0];
      setItems(prev => prev.map((it, i) => (i === index ? { ...it, isTagging: false, tags: first.tags, description: first.description } : it)));
    } catch (e: any) {
      setItems(prev => prev.map((it, i) => (i === index ? { ...it, isTagging: false, error: e?.message || "Tagging failed" } : it)));
    }
  };

  const tagAll = async () => {
    const notTagged = items.map((it, i) => ({ it, i })).filter(x => !x.it.tags);
    for (const { i } of notTagged) {
      // sequential to avoid overloading the endpoint by default
      // can be parallelized later if endpoint supports it
      // eslint-disable-next-line no-await-in-loop
      await tagOne(i);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      // Upload files to Supabase Storage (background tolerate failures)
      const userHash = (sessionData as any)?.userHash || 'anonymous';
      const uploads = await Promise.all(items.map(async (i) => {
        try {
          const path = `inspirations/${userHash}/${i.id}`;
          const { data, error } = await supabase
            .storage
            .from('aura-assets')
            .upload(path, i.file, { upsert: true, contentType: i.file.type || 'image/jpeg' });
          if (error) throw error;
          const { data: pub } = supabase.storage.from('aura-assets').getPublicUrl(path);
          return { id: i.id, fileId: data?.path, url: pub?.publicUrl || undefined };
        } catch (e) {
          console.warn('Upload failed for', i.id, e);
          return { id: i.id };
        }
      }));

      // Persist inspirations with public URLs to session (and Supabase via saveFullSession)
      const payload = items.map(i => {
        const up = uploads.find(u => u.id === i.id);
        return {
          id: i.id,
          fileId: up?.fileId,
          url: up?.url,
          tags: i.tags,
          description: i.description,
          addedAt: new Date().toISOString(),
        };
      });
      await updateSessionData({ inspirations: payload } as any);
      
      // Also save inspirations to spaces
      const currentSpaces = (sessionData as any)?.spaces || [];
      const inspirationsForSpaces = payload
        .filter(p => p.url)
        .map(p => ({
          url: p.url!,
          tags: p.tags ? [
            ...(p.tags.styles || []),
            ...(p.tags.colors || []),
            ...(p.tags.materials || [])
          ] : undefined
        }));
      
      if (inspirationsForSpaces.length > 0) {
        const updatedSpaces = addMultipleInspirationsToSpace(
          currentSpaces, 
          undefined, 
          inspirationsForSpaces
        );
        await updateSessionData({ spaces: updatedSpaces } as any);
      }
      
      router.push("/flow/big-five");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    router.push("/flow/big-five");
  };

  // User can continue with 1–10 images; tagging happens in background
  const canProceed = items.length >= 1 && items.length <= 10;

  return (
    <div className="min-h-screen flex flex-col w-full relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-radial from-pearl-50 via-platinum-50 to-silver-100 -z-10" />
      
      {/* 3D Model Background */}
      <div className="absolute inset-0 -z-5">
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-96 h-96 rounded-full bg-gradient-to-br from-gold/10 via-champagne/10 to-platinum/10 blur-3xl" />
        </div>
      </div>

      {/* Dialog IDA na dole */}
      <div className="w-full">
        <AwaDialogue 
          currentStep="onboarding" 
          fullWidth={true}
          autoHide={true}
        />
      </div>

      <div className="flex-1 p-4 lg:p-8 pb-32">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <GlassCard className="p-8 lg:p-12">
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
                
                <h1 className="text-4xl lg:text-5xl font-nasalization bg-gradient-to-r from-gold via-champagne to-platinum bg-clip-text text-transparent mb-4">
                  {t("Twoje Inspiracje", "Your Inspirations")}
                </h1>
                <p className="text-lg text-graphite font-modern max-w-2xl mx-auto">
                  {t(
                    "Prześlij zdjęcia wnętrz, które Cię inspirują (do 10). IDA przeanalizuje je w tle i użyje do personalizacji.",
                    "Upload interior images that inspire you (up to 10). IDA will analyze them in the background and use them to personalize."
                  )}
                </p>
              </div>

              {/* Upload Area */}
              <div className="mb-8">
                <div 
                  onClick={handlePickFiles}
                  className="border-2 border-dashed border-gold/30 rounded-2xl p-12 text-center hover:border-gold/50 hover:bg-gold/5 transition-all duration-300 cursor-pointer group"
                >
                  <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFiles(e.target.files)}
                    className="hidden"
                  />
                  
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center group-hover:shadow-lg group-hover:shadow-gold/25 transition-all duration-300"
                  >
                    <Upload size={32} className="text-white" />
                  </motion.div>
                  
                  <h3 className="text-xl font-nasalization text-graphite mb-2">
                    {t("Dodaj Zdjęcia", "Add Images")}
                  </h3>
                  <p className="text-silver-dark font-modern">
                    {t(
                      "Kliknij lub przeciągnij zdjęcia wnętrz (do 10)",
                      "Click or drag interior images (up to 10)"
                    )}
                  </p>
                  <p className="text-sm text-silver-dark mt-2">
                    {items.length}/10 {t("zdjęć", "images")}
                  </p>
                </div>
              </div>

              {/* Items Grid */}
              {items.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mb-8"
                >
                  <h3 className="text-xl font-nasalization text-graphite mb-4">
                    {t("Twoje Inspiracje", "Your Inspirations")}
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {items.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="relative group"
                      >
                        <div className="relative aspect-square rounded-xl overflow-hidden glass-panel">
                          <Image
                            src={item.previewUrl}
                            alt="Inspiration"
                            fill
                            className="object-cover"
                          />
                          
                          {/* Status overlay */}
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            {item.isTagging && (
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs text-white font-modern">Analyzing...</span>
                              </div>
                            )}
                            {item.tags && (
                              <CheckCircle size={24} className="text-green-400" />
                            )}
                            {item.error && (
                              <AlertCircle size={24} className="text-red-400" />
                            )}
                          </div>
                          
                          {/* Remove button */}
                          <button
                            onClick={() => removeItem(item.id)}
                            className="absolute top-2 right-2 w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        
                        {/* Tags preview */}
                        {item.tags && (
                          <div className="mt-2 text-xs text-silver-dark">
                            <div className="flex flex-wrap gap-1">
                              {item.tags.styles?.slice(0, 2).map(style => (
                                <span key={style} className="px-2 py-1 bg-gold/10 text-gold rounded-full">
                                  {style}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <GlassButton
                  onClick={() => router.back()}
                  variant="secondary"
                  className="px-8 py-3"
                >
                  {t("Wróć", "Back")}
                </GlassButton>
                
                <GlassButton
                  onClick={handleSkip}
                  variant="secondary"
                  className="px-8 py-3"
                >
                  {t("Pomiń", "Skip")}
                </GlassButton>
                
                <GlassButton
                  onClick={handleSave}
                  disabled={!canProceed || isSubmitting}
                  className="px-8 py-3"
                >
                  <span className="flex items-center gap-2">
                    {isSubmitting ? t("Zapisywanie…", "Saving…") : t("Kontynuuj", "Continue")}
                    <ArrowRight size={18} />
                  </span>
                </GlassButton>
              </div>

              {/* Progress indicator */}
              {items.length > 0 && (
                <div className="mt-6 text-center">
                  <div className="text-sm text-silver-dark font-modern">
                    {t(
                      `${items.length}/10 zdjęć • ${items.filter(i => i.tags).length} przeanalizowanych w tle`,
                      `${items.length}/10 images • ${items.filter(i => i.tags).length} analyzed in background`
                    )}
                  </div>
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}


