"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { AwaDialogue } from "@/components/awa/AwaDialogue";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSessionData } from "@/hooks/useSessionData";
import { analyzeInspirationsWithGamma, type InspirationTaggingResult } from "@/lib/vision/gamma-tagging";
import { getOrCreateSpaceId, saveSpaceImagesMetadata } from "@/lib/remote-spaces";
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
  file?: File;
  previewUrl: string;          // blob: url for quick preview
  imageBase64?: string;        // data URL (preferred for persistence/generation)
  tags?: InspirationTaggingResult["tags"];
  description?: string;
  isTagging?: boolean;
  error?: string;
  persisted?: boolean;         // true when loaded from existing session (avoid duplicate appends)
  addedAt?: string;
}

const STEP_CARD_HEIGHT = "min-h-[700px] max-h-[85vh]";

export default function InspirationsPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sessionData, updateSessionData } = useSessionData();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<LocalInspiration[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = (pl: string, en: string) => (language === "pl" ? pl : en);

  const progress = Math.min((items.length / 10) * 100, 100);
  const fromDashboard = searchParams?.get("from") === "dashboard";

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const ensureBase64 = async (item: LocalInspiration): Promise<LocalInspiration> => {
    if (item.imageBase64) return item;
    if (item.file) {
      try {
        const dataUrl = await fileToDataUrl(item.file);
        return { ...item, imageBase64: dataUrl };
      } catch (error) {
        console.warn('[Inspirations] Failed to convert file to base64 for', item.id, error);
        return item;
      }
    }
    // Fallback when no file (loaded from existing session)
    const safeUrl = sanitizeUrl(item.previewUrl);
    return safeUrl ? { ...item, imageBase64: safeUrl } : item;
  };

  // Auto-tag on upload in background (non-blocking)
  useEffect(() => {
    const untagged = items.filter(i => i.file && !i.tags && !i.isTagging && !i.error);
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
      persisted: false
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

  const sanitizeUrl = (value?: string) => {
    if (!value) return undefined;
    if (value.startsWith('http')) return value;
    if (value.startsWith('data:')) return value;
    // ignore blob: and other schemes
    return undefined;
  };

  // Preload existing inspirations when entering from dashboard to avoid overwrite
  useEffect(() => {
    const existing = (sessionData as any)?.inspirations || [];
    if (existing.length === 0 || items.length > 0) return;
    const mapped: LocalInspiration[] = existing.map((insp: any, idx: number) => {
      const url = sanitizeUrl(insp.url) || sanitizeUrl(insp.imageBase64) || '';
      return {
        id: insp.id || `persisted_${idx}_${Date.now()}`,
        previewUrl: url,
        imageBase64: insp.imageBase64 || url,
        tags: insp.tags,
        description: insp.description,
        isTagging: false,
        error: undefined,
        persisted: true
      };
    });
    if (mapped.length > 0) {
      setItems(mapped);
    }
  }, [sessionData?.inspirations]);

  const tagItems = async (itemsToTag: LocalInspiration[]) => {
    const payload = (current: LocalInspiration[]) => current.map(i => ({
      id: i.id,
      fileId: undefined,
      url: sanitizeUrl(i.previewUrl), // only keep http/data URLs
      imageBase64: i.imageBase64,
      tags: i.tags,
      description: i.description,
      addedAt: new Date().toISOString(),
    }));

    for (const targetItem of itemsToTag) {
      if (!targetItem.file) {
        // Cannot tag without original file; skip persisted items
        continue;
      }
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
        
        // Ensure we persist base64 (data URL) for later generation usage
        const dataUrl = await fileToDataUrl(targetItem.file);

        setItems(prev => {
          const updated = prev.map(item =>
            item.id === targetItem.id
              ? {
                  ...item,
                  tags: analysis.tags,
                  description: analysis.description,
                  isTagging: false,
                  error: undefined,
                  imageBase64: dataUrl || item.imageBase64
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
    if (!items[index]?.file) {
      return;
    }
    setItems(prev => prev.map((it, i) => (i === index ? { ...it, isTagging: true, error: undefined } : it)));
    try {
      const res = await analyzeInspirationsWithGamma([items[index].file]);
      const first = res[0];
      const dataUrl = await fileToDataUrl(items[index].file);
      
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
      
      setItems(prev => prev.map((it, i) => (i === index ? { ...it, isTagging: false, tags: first.tags, description: first.description, imageBase64: dataUrl || it.imageBase64 } : it)));
    } catch (e: any) {
      console.error('[Inspirations] Tagging failed:', e);
      setItems(prev => prev.map((it, i) => (i === index ? { ...it, isTagging: false, error: e?.message || "Tagging failed" } : it)));
    }
  };

  const tagAll = async () => {
    const notTagged = items.map((it, i) => ({ it, i })).filter(x => x.it.file && !x.it.tags);
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
      // Ensure every item has base64 (data URL) for downstream generation
      const itemsWithBase64 = await Promise.all(items.map(ensureBase64));
      setItems(itemsWithBase64);

      // Upload files to Supabase Storage (background tolerate failures)
      // Note: If bucket doesn't exist, we'll skip upload but keep base64 in session
      const userHash = (sessionData as any)?.userHash || 'anonymous';
      const uploads = await Promise.all(itemsWithBase64.map(async (i) => {
        try {
          if (!i.file) {
            // Persist base64/session even if original file is missing (loaded from session/Supabase)
            return { id: i.id };
          }
          // Try to upload to storage, but don't fail if bucket doesn't exist
          const path = `inspirations/${userHash}/${i.id}`;
          const { data, error } = await supabase
            .storage
            .from('aura-assets')
            .upload(path, i.file, { upsert: true, contentType: i.file?.type || 'image/jpeg' });
          
          if (error) {
            // If bucket doesn't exist, log warning but continue
            const status = (error as any)?.statusCode ?? (error as any)?.status;
            if (error.message?.includes('Bucket not found') || status === 404 || status === '404') {
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
      const payload = itemsWithBase64.map(i => {
        const up = uploads.find(u => u.id === i.id);
        const persistedUrl = up?.url ? sanitizeUrl(up.url) : undefined;
        const safePreview = sanitizeUrl(i.previewUrl);
        const storedUrl = persistedUrl || safePreview; // avoid blob:
        // If we have a persisted URL, drop base64 to reduce localStorage footprint
        const base64 = persistedUrl ? undefined : (i.imageBase64 || safePreview); // Prefer data URL only when no persisted URL
        const result = {
          id: i.id,
          fileId: up?.fileId,
          url: storedUrl,
          imageBase64: base64, // Keep base64 only if no URL available
          tags: i.tags,
          description: i.description,
          addedAt: i.persisted ? i.addedAt || new Date().toISOString() : new Date().toISOString(),
          persisted: i.persisted || false
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

      // Merge with existing inspirations to avoid overwriting when adding from dashboard
      const existingInspirations = (sessionData as any)?.inspirations || [];
      const mergedMap = new Map<string, any>();
      const addToMap = (item: any) => {
        const key = item.id || item.url;
        if (!key) return;
        const prev = mergedMap.get(key) || {};
        mergedMap.set(key, { ...prev, ...item });
      };
      existingInspirations.forEach(addToMap);
      payload.forEach(addToMap);
      const mergedInspirations = Array.from(mergedMap.values()).map(i => {
        // Drop helper flag before saving
        const { persisted, ...rest } = i;
        return rest;
      });

      await updateSessionData({ inspirations: mergedInspirations } as any);
      
      // Also save inspirations to spaces/local snapshot and Supabase space_images with tags
      try {
        const userHash = (sessionData as any)?.userHash;
        if (userHash) {
          const spaceId = await getOrCreateSpaceId(userHash, {
            spaceId: (sessionData as any)?.currentSpaceId,
            name: (sessionData as any)?.roomName || 'Moja Przestrzeń'
          });

          // Update local spaces snapshot (flatten tags to string array for local display)
          const currentSpaces = (sessionData as any)?.spaces || [];
          const inspirationsForSpacesLocal = mergedInspirations.map(p => ({
            url: p.url || '',
            tags: p.tags
              ? [
                  ...(p.tags.styles || []),
                  ...(p.tags.colors || []),
                  ...(p.tags.materials || [])
                ]
              : undefined
          })).filter(x => x.url);
          const updatedSpaces = addMultipleInspirationsToSpace(
            currentSpaces,
            spaceId,
            inspirationsForSpacesLocal
          );
          await updateSessionData({ spaces: updatedSpaces, currentSpaceId: spaceId } as any);

          // Persist to space_images with full tags object (one-time, no retagging later)
          if (spaceId) {
            const imagesForSpace = mergedInspirations
              .map(p => ({
                url: p.url || p.imageBase64 || '',
                type: 'inspiration' as const,
                tags: p.tags,
                is_favorite: false
              }))
              .filter(img => !!img.url);

            if (imagesForSpace.length > 0) {
              await saveSpaceImagesMetadata(userHash, spaceId, imagesForSpace);
            }
          }

          // Optional: save inspirations snapshot to user_profiles (for cross-session fetch)
          try {
            const inspirationsForProfile = mergedInspirations.map(p => ({
              fileId: p.fileId,
              url: p.url,
              tags: p.tags,
              description: p.description,
              addedAt: p.addedAt
            }));

            const { error } = await supabase
              .from('user_profiles')
              .update({
                inspirations: inspirationsForProfile,
                metadata: {
                  spaces: updatedSpaces,
                  last_updated: new Date().toISOString()
                },
                updated_at: new Date().toISOString()
              })
              .eq('user_hash', userHash);

            if (error) {
              console.warn('[Inspirations] Failed to save inspirations to user profile:', error);
            } else {
              console.log('[Inspirations] Inspirations with gamma tags saved to user_profiles.inspirations');
            }
          } catch (e) {
            console.warn('[Inspirations] Failed to save inspirations to user_profiles (non-critical):', e);
          }
        }
      } catch (e) {
        console.warn('[Inspirations] Failed to save inspirations to space_images:', e);
      }
      
      router.push(fromDashboard ? "/dashboard" : "/flow/big-five");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    router.push(fromDashboard ? "/dashboard" : "/flow/big-five");
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
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
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


