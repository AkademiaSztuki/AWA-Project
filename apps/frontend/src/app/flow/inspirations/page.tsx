"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { AwaDialogue } from "@/components/awa/AwaDialogue";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSessionData } from "@/hooks/useSessionData";
import { analyzeInspirationsWithGamma, type InspirationTaggingResult } from "@/lib/vision/gamma-tagging";
import { supabase } from "@/lib/supabase";
import { addMultipleInspirationsToSpace } from "@/lib/spaces";
import { 
  Upload, 
  X, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  ArrowLeft
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

const STEP_CARD_HEIGHT = "min-h-[700px] max-h-[85vh]";

export default function InspirationsPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const { sessionData, updateSessionData } = useSessionData();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<LocalInspiration[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = (pl: string, en: string) => (language === "pl" ? pl : en);

  const progress = Math.min((items.length / 10) * 100, 100);

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
    const payload = (current: LocalInspiration[]) => current.map(i => ({
      id: i.id,
      fileId: undefined,
      url: i.previewUrl, // Include previewUrl (base64 data URL) for immediate use
      tags: i.tags,
      description: i.description,
      addedAt: new Date().toISOString(),
    }));

    for (const targetItem of itemsToTag) {
      try {
        const [analysis] = await analyzeInspirationsWithGamma([targetItem.file]);
        
        // DEBUG: Log what gamma model returned
        console.log('[Inspirations] Gamma model returned (auto-tag):', {
          itemId: targetItem.id,
          hasTags: !!analysis.tags,
          tagsType: typeof analysis.tags,
          tagsIsObject: analysis.tags && typeof analysis.tags === 'object',
          tagsKeys: analysis.tags ? Object.keys(analysis.tags) : [],
          tagsValue: analysis.tags,
          hasDescription: !!analysis.description,
          description: analysis.description
        });
        
        setItems(prev => {
          const updated = prev.map(item =>
            item.id === targetItem.id
              ? {
                  ...item,
                  tags: analysis.tags,
                  description: analysis.description,
                  isTagging: false,
                  error: undefined,
                }
              : item
          );
          
          // DEBUG: Log what is being saved to sessionData
          const itemWithTags = updated.find(item => item.id === targetItem.id);
          console.log('[Inspirations] Saving to sessionData:', {
            itemId: itemWithTags?.id,
            hasTags: !!itemWithTags?.tags,
            tagsType: typeof itemWithTags?.tags,
            tagsValue: itemWithTags?.tags
          });
          
          setTimeout(() => updateSessionData({ inspirations: payload(updated) } as any), 0);
          return updated;
        });
      } catch (error) {
        console.error("Tagging failed:", error);
        setItems(prev => {
          const updated = prev.map(item =>
            item.id === targetItem.id ? { ...item, isTagging: false, error: "Tagging failed" } : item
          );
          setTimeout(() => updateSessionData({ inspirations: payload(updated) } as any), 0);
          return updated;
        });
      }
    }
  };

  const tagOne = async (index: number) => {
    setItems(prev => prev.map((it, i) => (i === index ? { ...it, isTagging: true, error: undefined } : it)));
    try {
      const res = await analyzeInspirationsWithGamma([items[index].file]);
      const first = res[0];
      
      // DEBUG: Log what gamma model returned
      console.log('[Inspirations] Gamma model returned:', {
        hasTags: !!first.tags,
        tagsType: typeof first.tags,
        tagsIsObject: first.tags && typeof first.tags === 'object',
        tagsKeys: first.tags ? Object.keys(first.tags) : [],
        tagsValue: first.tags,
        hasDescription: !!first.description,
        description: first.description
      });
      
      setItems(prev => prev.map((it, i) => (i === index ? { ...it, isTagging: false, tags: first.tags, description: first.description } : it)));
    } catch (e: any) {
      console.error('[Inspirations] Tagging failed:', e);
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
      // Note: If bucket doesn't exist, we'll skip upload but keep base64 in session
      const userHash = (sessionData as any)?.userHash || 'anonymous';
      const uploads = await Promise.all(items.map(async (i) => {
        try {
          // Try to upload to storage, but don't fail if bucket doesn't exist
          const path = `inspirations/${userHash}/${i.id}`;
          const { data, error } = await supabase
            .storage
            .from('aura-assets')
            .upload(path, i.file, { upsert: true, contentType: i.file.type || 'image/jpeg' });
          
          if (error) {
            // If bucket doesn't exist, log warning but continue
            if (error.message?.includes('Bucket not found') || error.statusCode === '404') {
              console.warn('Bucket aura-assets not found - skipping upload, using base64 only');
              return { id: i.id };
            }
            throw error;
          }
          
          const { data: pub } = supabase.storage.from('aura-assets').getPublicUrl(path);
          return { id: i.id, fileId: data?.path, url: pub?.publicUrl || undefined };
        } catch (e) {
          console.warn('Upload failed for', i.id, e);
          return { id: i.id };
        }
      }));

      // Persist inspirations with public URLs to session (and Supabase via saveFullSession)
      // Include base64 for local storage if upload failed
      const payload = items.map(i => {
        const up = uploads.find(u => u.id === i.id);
        const base64 = i.imageBase64 || i.previewUrl; // Keep base64 if available
        const result = {
          id: i.id,
          fileId: up?.fileId,
          url: up?.url,
          imageBase64: base64, // Keep base64 for InspirationReference source
          tags: i.tags,
          description: i.description,
          addedAt: new Date().toISOString(),
        };
        
        // DEBUG: Log tags before saving
        console.log('[Inspirations] Saving inspiration:', {
          id: result.id,
          hasTags: !!result.tags,
          tagsType: typeof result.tags,
          tagsIsObject: result.tags && typeof result.tags === 'object',
          tagsKeys: result.tags ? Object.keys(result.tags) : [],
          tagsValue: result.tags,
          hasDescription: !!result.description
        });
        
        return result;
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
        
        // Save spaces and inspirations to Supabase for persistence across sessions
        try {
          const userHash = (sessionData as any)?.userHash;
          if (userHash) {
            const { ensureUserProfileExists, getUserProfile, saveUserProfile } = await import('@/lib/supabase-deep-personalization');
            const profileExists = await ensureUserProfileExists(userHash);
            if (profileExists) {
              // Get existing profile to preserve other data
              const existingProfile = await getUserProfile(userHash);
              
              // Prepare inspirations for user_profiles (with tags from gamma model)
              const inspirationsForProfile = payload.map(p => ({
                fileId: p.fileId,
                url: p.url,
                tags: p.tags, // Tags from gamma model (Gemma3VisionModel)
                description: p.description, // Description from gamma model
                addedAt: p.addedAt
              }));
              
              // Update user profile with inspirations (with gamma tags) and spaces metadata
              const updateData: any = {
                inspirations: inspirationsForProfile,
                updated_at: new Date().toISOString()
              };
              
              if (updatedSpaces.length > 0) {
                updateData.metadata = {
                  spaces: updatedSpaces,
                  last_updated: new Date().toISOString()
                };
              }
              
              const { error } = await supabase
                .from('user_profiles')
                .update(updateData)
                .eq('user_hash', userHash);
              
              if (error) {
                console.warn('[Inspirations] Failed to save inspirations to user profile:', error);
              } else {
                console.log('[Inspirations] Inspirations with gamma tags saved to Supabase user_profiles.inspirations');
                console.log('[Inspirations] Tags structure:', inspirationsForProfile.map(i => ({
                  hasTags: !!i.tags,
                  styles: i.tags?.styles?.length || 0,
                  colors: i.tags?.colors?.length || 0,
                  materials: i.tags?.materials?.length || 0,
                  biophilia: i.tags?.biophilia,
                  description: i.description ? 'present' : 'missing'
                })));
              }
            }
          }
        } catch (e) {
          console.warn('[Inspirations] Failed to save inspirations to Supabase:', e);
          // Non-critical - inspirations are saved locally
        }
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
    <div className="flex flex-col w-full">
      <div className="flex-1 flex justify-center items-start">
        <div className="w-full max-w-3xl lg:max-w-none mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <GlassCard className={`p-6 md:p-8 ${STEP_CARD_HEIGHT} overflow-auto scrollbar-hide`}>
              
              {/* Header with Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl md:text-2xl font-nasalization text-graphite">
                    {t("Twoje Inspiracje", "Your Inspirations")}
                  </h2>
                  <div className="text-sm text-silver-dark font-modern">
                    {items.length} / 10 {t("zdjęć", "images")}
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-silver/20 rounded-full h-2 mb-4">
                  <motion.div
                    className="bg-gradient-to-r from-gold to-champagne h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                <p className="text-graphite font-modern text-sm">
                  {t(
                    "Prześlij zdjęcia wnętrz, które Cię inspirują. IDA przeanalizuje je w tle.",
                    "Upload interior images that inspire you. IDA will analyze them in the background."
                  )}
                </p>
              </div>

              {/* Upload Area */}
              <div className="mb-8">
                <div 
                  onClick={handlePickFiles}
                  className="border-2 border-dashed border-gold/30 rounded-2xl p-8 md:p-12 text-center hover:border-gold/50 hover:bg-gold/5 transition-all duration-300 cursor-pointer group"
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
                    className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center group-hover:shadow-lg group-hover:shadow-gold/25 transition-all duration-300"
                  >
                    <Upload size={28} className="text-white" />
                  </motion.div>
                  
                  <h3 className="text-lg md:text-xl font-nasalization text-graphite mb-2">
                    {t("Dodaj Zdjęcia", "Add Images")}
                  </h3>
                  <p className="text-sm text-silver-dark font-modern">
                    {t(
                      "Kliknij lub przeciągnij zdjęcia wnętrz",
                      "Click or drag interior images"
                    )}
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                                <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                              </div>
                            )}
                            {item.tags && (
                              <CheckCircle size={20} className="text-green-400" />
                            )}
                            {item.error && (
                              <AlertCircle size={20} className="text-red-400" />
                            )}
                          </div>
                          
                          {/* Remove button */}
                          <button
                            onClick={() => removeItem(item.id)}
                            className="absolute top-2 right-2 w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        
                        {/* Tags preview */}
                        {item.tags && (
                          <div className="mt-2 text-xs text-silver-dark">
                            <div className="flex flex-wrap gap-1">
                              {item.tags.styles?.slice(0, 1).map(style => (
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
              <div className="flex justify-between mt-auto pt-6">
                <div className="flex gap-4">
                  <GlassButton
                    onClick={() => router.back()}
                    variant="secondary"
                  >
                    <ArrowLeft size={18} />
                    {t("Wróć", "Back")}
                  </GlassButton>
                  
                  <GlassButton
                    onClick={handleSkip}
                    variant="secondary"
                  >
                    {t("Pomiń", "Skip")}
                  </GlassButton>
                </div>
                
                <GlassButton
                  onClick={handleSave}
                  disabled={!canProceed || isSubmitting}
                >
                  <span className="flex items-center gap-2">
                    {isSubmitting ? t("Zapisywanie…", "Saving…") : t("Kontynuuj", "Continue")}
                    <ArrowRight size={18} />
                  </span>
                </GlassButton>
              </div>

            </GlassCard>
          </motion.div>
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
    </div>
  );
}


