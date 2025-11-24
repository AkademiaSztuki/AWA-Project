"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSessionData } from '@/hooks/useSessionData';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { supabase } from '@/lib/supabase';
import { getUserHouseholds, saveHousehold } from '@/lib/supabase-deep-personalization';
import { 
  Home, 
  Plus, 
  Image as ImageIcon,
  Clock,
  Heart,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  User,
  Eye
} from 'lucide-react';
import Image from 'next/image';
import {
  VisualDNASection,
  CoreNeedsSection,
  RoomAnalysisSection,
  InspirationsPreviewSection,
  GenerationStatsSection
} from '@/components/dashboard/ProfileSections';

interface Space {
  id: string;
  name: string;
  type: string;
  images: SpaceImage[];
  createdAt: string;
  updatedAt: string;
}

interface SpaceImage {
  id: string;
  url: string;
  type: 'generated' | 'inspiration';
  addedAt: string;
  thumbnailUrl?: string;
  tags?: string[];
}

/**
 * UserDashboard - Main control panel for image spaces
 * 
 * Shows:
 * - User's spaces (simplified from households)
 * - Generated images in each space
 * - Inspiration images in each space
 * - Quick actions
 */
export function UserDashboard() {
  const router = useRouter();
  const { sessionData, updateSessionData } = useSessionData();
  const { language } = useLanguage();
  
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  

  useEffect(() => {
    loadUserData();
  }, [sessionData]);

  const loadUserData = async () => {
    try {
      // Try to get userHash from multiple sources
      let userHash = sessionData?.userHash;
      
      if (!userHash && typeof window !== 'undefined') {
        userHash = localStorage.getItem('aura_user_hash') || 
                   sessionStorage.getItem('aura_user_hash') || '';
      }
      
      if (!userHash) {
        console.log('[Dashboard] No user hash found - showing empty dashboard');
        setSpaces([]);
        setIsLoading(false);
        return;
      }

      console.log('[Dashboard] Loading data for user:', userHash);
      
      // Check if we have session data with spaces
      if (sessionData?.spaces && sessionData.spaces.length > 0) {
        console.log('[Dashboard] Loaded from sessionData');
        setSpaces(sessionData.spaces);
        setIsLoading(false);
        return;
      }
      
      // First try to load from localStorage for immediate display
      const localSessionData = localStorage.getItem('aura_session');
      console.log('[Dashboard] localStorage data:', localSessionData);
      if (localSessionData) {
        try {
          const parsed = JSON.parse(localSessionData);
          console.log('[Dashboard] Parsed localStorage data:', parsed);
          if (parsed.spaces && parsed.spaces.length > 0) {
            console.log('[Dashboard] Loaded from localStorage');
            setSpaces(parsed.spaces);
            setIsLoading(false);
            // Continue with Supabase load in background
          } else {
            console.log('[Dashboard] No spaces in localStorage data');
            setSpaces([]);
            setIsLoading(false);
          }
        } catch (e) {
          console.log('[Dashboard] Failed to parse localStorage data:', e);
          setSpaces([]);
          setIsLoading(false);
        }
      } else {
        console.log('[Dashboard] No localStorage data found');
        setSpaces([]);
        setIsLoading(false);
      }
      
      // Call Supabase function to get complete profile
      const { data, error } = await supabase
        .rpc('get_user_complete_profile', { p_user_hash: userHash });
      
      if (error) {
        console.error('[Dashboard] Supabase error:', error);
        // If we don't have localStorage data, show empty state
        if (!localSessionData) {
          setSpaces([]);
        }
      } else if (data && data.spaces && data.spaces.length > 0) {
        console.log('[Dashboard] Loaded profile data from Supabase:', data);
        
        // Transform Supabase data to UI format
        const transformedSpaces: Space[] = (data.spaces || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          type: s.type || 'personal',
          images: s.images || [],
          createdAt: s.created_at,
          updatedAt: s.updated_at
        }));
        
        setSpaces(transformedSpaces);
      } else {
        // No profile yet - empty state
        console.log('[Dashboard] No profile data found in Supabase');
        if (!localSessionData) {
          setSpaces([]);
        }
      }
    } catch (error) {
      console.error('[Dashboard] Failed to load user data:', error);
      // Only set empty if we don't have localStorage data
      const localSessionData = localStorage.getItem('aura_session');
      if (!localSessionData) {
        setSpaces([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSpace = async () => {
    try {
      // Ensure we have a user hash
      let userHash = sessionData?.userHash as string | undefined;
      if (!userHash && typeof window !== 'undefined') {
        userHash = localStorage.getItem('aura_user_hash') || 
                   sessionStorage.getItem('aura_user_hash') || undefined;
      }

      if (!userHash) {
        console.error('[Dashboard] No user hash found for adding space');
        router.push('/'); // fallback
        return;
      }

      // Try to reuse latest household if exists
      let householdId: string | null = null;
      try {
        const households = await getUserHouseholds(userHash);
        if (households && households.length > 0) {
          householdId = households[0].id;
        }
      } catch (e) {
        console.warn('[Dashboard] Failed to load households, will try to create a new one.', e);
      }

      // If none, create a minimal default household in background
      if (!householdId) {
        try {
          const created = await saveHousehold({
            userHash,
            name: language === 'pl' ? 'Moja przestrzeń' : 'My Space',
            householdType: 'home',
            livingSituation: 'alone',
            householdDynamics: null,
            householdGoals: []
          } as any);
          householdId = created?.id || `household-${Date.now()}`;
        } catch (e) {
          console.warn('[Dashboard] Failed to create household, using fallback id.', e);
          householdId = `household-${Date.now()}`;
        }
      }

      router.push(`/setup/room/${householdId}`);
    } catch (error) {
      console.error('[Dashboard] Error in handleAddSpace:', error);
    }
  };

  const handleOpenSpace = (spaceId: string) => {
    router.push(`/space/${spaceId}`);
  };


  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('auth') === 'error') {
      setAuthError(decodeURIComponent(url.searchParams.get('msg') || ''));
      url.searchParams.delete('auth');
      url.searchParams.delete('msg');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col w-full relative">
      {authError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-xl p-3 rounded-lg glass-panel border border-gold/30">
          <p className="text-sm text-graphite font-modern text-center">
            {language === 'pl' ? 'Błąd logowania: ' : 'Sign-in error: '}
            {authError}
          </p>
        </div>
      )}
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-radial from-pearl-50 via-platinum-50 to-silver-100 -z-10" />
      
      {/* Dialog IDA na dole - cała szerokość */}
      <div className="w-full">
        <AwaDialogue 
          currentStep="onboarding" 
          fullWidth={true}
          autoHide={true}
        />
      </div>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 pb-32">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="mb-6">
              <h1 className="text-3xl lg:text-4xl xl:text-5xl font-nasalization bg-gradient-to-r from-gold via-champagne to-platinum bg-clip-text text-transparent mb-2">
                {language === 'pl' ? 'Moje Przestrzenie' : 'My Spaces'}
              </h1>
              <p className="text-base lg:text-lg text-graphite font-modern">
                {language === 'pl' ? 'Zarządzaj swoimi wnętrzami' : 'Manage your interiors'}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              <GlassCard className="p-4 sm:p-6 min-h-[80px]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold to-champagne flex items-center justify-center flex-shrink-0">
                    <Home size={20} className="text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-2xl font-nasalization text-graphite">{spaces.length}</p>
                    <p className="text-xs text-silver-dark font-modern">
                      {language === 'pl' ? 'Przestrzenie' : 'Spaces'}
                    </p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-4 sm:p-6 min-h-[80px]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold to-champagne flex items-center justify-center flex-shrink-0">
                    <ImageIcon size={20} className="text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-2xl font-nasalization text-graphite">
                      {spaces.reduce((sum, s) => sum + s.images.filter(img => img.type === 'generated').length, 0)}
                    </p>
                    <p className="text-xs text-silver-dark font-modern">
                      {language === 'pl' ? 'Wygenerowane' : 'Generated'}
                    </p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-4 sm:p-6 min-h-[80px]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold to-champagne flex items-center justify-center flex-shrink-0">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-2xl font-nasalization text-graphite">
                      {spaces.reduce((sum, s) => sum + s.images.filter(img => img.type === 'inspiration').length, 0)}
                    </p>
                    <p className="text-xs text-silver-dark font-modern">
                      {language === 'pl' ? 'Inspiracje' : 'Inspirations'}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </motion.div>

          {/* User Profile Overview */}
          <ProfileOverview sessionData={sessionData} />

          {/* Big Five Results - Enhanced with details link */}
          <BigFiveResults userHash={(sessionData as any)?.userHash} />

          {/* Visual DNA */}
          <VisualDNASection visualDNA={(sessionData as any)?.visualDNA} />

          {/* Core Needs / Laddering */}
          <CoreNeedsSection ladderResults={(sessionData as any)?.ladderResults} />

          {/* Room Analysis */}
          <RoomAnalysisSection 
            roomAnalysis={(sessionData as any)?.roomAnalysis}
            roomImage={(sessionData as any)?.roomImage}
          />

          {/* Inspirations Preview */}
          <InspirationsPreviewSection 
            inspirations={(sessionData as any)?.inspirations || []}
            onViewAll={() => {
              const spaces = (sessionData as any)?.spaces || [];
              if (spaces.length > 0) {
                router.push(`/space/${spaces[0].id}?filter=inspiration`);
              }
            }}
          />

          {/* Generation Stats */}
          <GenerationStatsSection 
            generations={(sessionData as any)?.generations || []}
            generatedImages={(sessionData as any)?.generatedImages}
          />

          {/* Spaces List */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 text-silver-dark font-modern">
                {language === 'pl' ? 'Ładowanie...' : 'Loading...'}
              </p>
            </div>
          ) : spaces.length === 0 ? (
            <EmptyState onAddSpace={handleAddSpace} />
          ) : (
            <div className="space-y-6">
              {spaces.map((space, index) => (
                <SpaceCard
                  key={space.id}
                  space={space}
                  index={index}
                  onOpenSpace={() => handleOpenSpace(space.id)}
                />
              ))}

              {/* Add Space Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: spaces.length * 0.1 + 0.2 }}
              >
                <button
                  onClick={handleAddSpace}
                  className="w-full glass-panel rounded-2xl p-4 sm:p-6 hover:bg-white/40 transition-all duration-300 group"
                >
                  <div className="flex items-center justify-center gap-2 sm:gap-3 text-graphite">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus size={20} className="sm:w-6 sm:h-6 text-white" />
                    </div>
                    <span className="font-nasalization text-base sm:text-lg lg:text-xl">
                      {language === 'pl' ? 'Dodaj Nową Przestrzeń' : 'Add New Space'}
                    </span>
                  </div>
                </button>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== SUB-COMPONENTS ==========

function ProfileOverview({ sessionData }: { sessionData: any }) {
  const { language } = useLanguage();
  const router = useRouter();

  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);

  // Calculate profile completion
  const hasVisualDNA = !!sessionData?.visualDNA;
  const hasLadder = !!sessionData?.ladderResults;
  const hasBigFive = !!sessionData?.bigFive;
  const hasInspirations = sessionData?.inspirations?.length > 0;
  const hasRoom = !!sessionData?.roomImage;

  const completedItems = [hasVisualDNA, hasLadder, hasBigFive, hasInspirations, hasRoom].filter(Boolean).length;
  const totalItems = 5;
  const completionPercentage = Math.round((completedItems / totalItems) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6"
    >
      <GlassCard className="p-4 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4 mb-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center flex-shrink-0">
            <User size={24} className="sm:w-8 sm:h-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-nasalization text-graphite">
              {t('Twój Profil', 'Your Profile')}
            </h2>
            <p className="text-xs sm:text-sm text-silver-dark font-modern">
              {t(`Ukończono ${completionPercentage}%`, `${completionPercentage}% Complete`)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/20 rounded-full h-2 sm:h-3 mb-4">
          <div
            className="bg-gradient-to-r from-gold to-champagne h-2 sm:h-3 rounded-full transition-all duration-1000"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        {/* Profile Items */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          <ProfileItem completed={hasVisualDNA} label={t('Visual DNA', 'Visual DNA')} />
          <ProfileItem completed={hasLadder} label={t('Core Needs', 'Core Needs')} />
          <ProfileItem completed={hasBigFive} label={t('Big Five', 'Big Five')} />
          <ProfileItem completed={hasInspirations} label={t('Inspiracje', 'Inspirations')} />
          <ProfileItem completed={hasRoom} label={t('Pokój', 'Room')} />
        </div>
      </GlassCard>
    </motion.div>
  );
}

function ProfileItem({ completed, label }: { completed: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
        completed ? 'bg-gold' : 'bg-white/20'
      }`}>
        {completed && <span className="text-white text-xs">✓</span>}
      </div>
      <span className={`font-modern ${completed ? 'text-graphite' : 'text-silver-dark'}`}>
        {label}
      </span>
    </div>
  );
}

function SpaceCard({ space, index, onOpenSpace }: {
  space: Space;
  index: number;
  onOpenSpace: () => void;
}) {
  const { language } = useLanguage();
  const generatedImages = space.images.filter(img => img.type === 'generated');
  const inspirationImages = space.images.filter(img => img.type === 'inspiration');
  const allImages = [...inspirationImages, ...generatedImages];
  const displayImages = allImages.slice(0, 6);
  const remainingCount = allImages.length - displayImages.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onClick={onOpenSpace}
      className="cursor-pointer"
    >
      <GlassCard className="p-4 sm:p-6 lg:p-8 hover:border-gold/50 transition-all duration-300">
        {/* Space Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center flex-shrink-0">
              <Home size={20} className="sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-nasalization text-graphite truncate">
                {space.name}
              </h2>
              <p className="text-xs sm:text-sm text-silver-dark font-modern">
                {generatedImages.length} {language === 'pl' ? 'wyg.' : 'gen.'} • {inspirationImages.length} {language === 'pl' ? 'insp.' : 'insp.'}
              </p>
            </div>
          </div>
          <ChevronRight size={20} className="sm:w-6 sm:h-6 text-gold flex-shrink-0" />
        </div>

        {/* Images Gallery Preview */}
        {allImages.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            {displayImages.map((image, idx) => (
              <div key={image.id} className="relative aspect-square rounded-lg overflow-hidden glass-panel group">
                <Image
                  src={image.url}
                  alt={image.type === 'generated' ? 'Generated' : 'Inspiration'}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                />
                {/* Badge indicating type */}
                <div className="absolute top-1 right-1">
                  {image.type === 'generated' ? (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center shadow-lg">
                      <Sparkles size={12} className="sm:w-3.5 sm:h-3.5 text-white" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-champagne to-platinum flex items-center justify-center shadow-lg">
                      <Heart size={12} className="sm:w-3.5 sm:h-3.5 text-white" />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="relative aspect-square rounded-lg overflow-hidden glass-panel flex items-center justify-center bg-gradient-to-br from-gold/20 to-champagne/20">
                <span className="text-base sm:text-xl font-nasalization text-graphite">+{remainingCount}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12">
            <p className="text-sm sm:text-base text-silver-dark font-modern">
              {language === 'pl' ? 'Brak obrazów w tej przestrzeni' : 'No images in this space yet'}
            </p>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}



function EmptyState({ onAddSpace }: { onAddSpace: () => void }) {
  const { language } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <GlassCard className="p-12 text-center">
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1
          }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold via-champagne to-platinum flex items-center justify-center"
        >
          <Home size={48} className="text-white" />
        </motion.div>

        <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite mb-4">
          {language === 'pl' ? 'Zacznij Swoją Podróż' : 'Start Your Journey'}
        </h2>

        <p className="text-base text-graphite font-modern max-w-md mx-auto mb-8">
          {language === 'pl'
            ? 'Dodaj swoją pierwszą przestrzeń aby zacząć tworzyć spersonalizowane wnętrza z IDA'
            : 'Add your first space to start creating personalized interiors with IDA'}
        </p>

        <GlassButton onClick={onAddSpace} className="px-8 py-4">
          <Plus size={20} className="mr-2" />
          {language === 'pl' ? 'Dodaj Pierwszą Przestrzeń' : 'Add First Space'}
        </GlassButton>
      </GlassCard>
    </motion.div>
  );
}

// ========== HELPER FUNCTIONS ==========

function BigFiveResults({ userHash }: { userHash?: string }) {
  const { language } = useLanguage();
  const router = useRouter();
  const [bigFiveData, setBigFiveData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!userHash) { setBigFiveData(null); setLoading(false); return; }
        
        // First try localStorage (immediate)
        const localSession = localStorage.getItem('aura_session');
        if (localSession) {
          const parsed = JSON.parse(localSession);
          const bigFive = parsed?.bigFive;
          if (mounted && bigFive) {
            setBigFiveData(bigFive);
            setLoading(false);
            return;
          }
        }
        
        // Fallback to Supabase
        const { data, error } = await supabase
          .from('sessions')
          .select('session_json')
          .eq('user_hash', userHash)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        const bigFive = (data as any)?.session_json?.bigFive;
        if (mounted) setBigFiveData(bigFive);
      } catch (e) {
        console.warn('[Dashboard] Big Five fetch failed', e);
        if (mounted) setBigFiveData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userHash]);

  if (loading) return null;
  if (!bigFiveData?.scores) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6 cursor-pointer"
      onClick={() => router.push('/dashboard/personality')}
    >
      <GlassCard className="p-4 sm:p-6 hover:border-gold/50 transition-all duration-300">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center flex-shrink-0">
              <User size={16} className="sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg lg:text-xl font-nasalization text-graphite truncate">
                {language === 'pl' ? 'Profil Osobowości' : 'Personality Profile'}
              </h3>
              <p className="text-xs sm:text-sm text-silver-dark font-modern">
                {language === 'pl' ? 'Big Five (IPIP-NEO-120)' : 'Big Five (IPIP-NEO-120)'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 text-gold flex-shrink-0">
            <Eye size={16} className="sm:w-5 sm:h-5" />
            <ChevronRight size={16} className="sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {(() => {
            // Handle both IPIP-60 and IPIP-NEO-120 formats
            const domainsMap: Array<{ domain: string; score: number }> = [];
            
            if (bigFiveData.scores.domains) {
              // IPIP-NEO-120 format
              Object.entries(bigFiveData.scores.domains).forEach(([key, value]) => {
                domainsMap.push({ domain: key, score: value as number });
              });
            } else {
              // IPIP-60 format
              Object.entries(bigFiveData.scores).forEach(([key, value]) => {
                if (typeof value === 'number') {
                  domainsMap.push({ domain: key, score: value });
                }
              });
            }
            
            return domainsMap.map(({ domain, score }, index) => (
              <motion.div
                key={domain}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="mb-2">
                  <div className="text-xl sm:text-2xl font-bold text-gold mb-1">{Number(score)}%</div>
                  <div className="text-xs sm:text-sm font-nasalization text-graphite">
                    {getDomainLabel(domain, language)}
                  </div>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-gold to-champagne h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </motion.div>
            ));
          })()}
        </div>
        <div className="mt-4 text-center">
          <p className="text-xs sm:text-sm text-silver-dark font-modern">
            {language === 'pl' ? 'Kliknij aby zobaczyć szczegółową analizę' : 'Click to see detailed analysis'}
          </p>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function getDomainLabel(domain: string, language: 'pl' | 'en'): string {
  const labels = {
    // IPIP-60 format
    openness: { pl: 'Otwartość', en: 'Openness' },
    conscientiousness: { pl: 'Sumienność', en: 'Conscientiousness' },
    extraversion: { pl: 'Ekstrawersja', en: 'Extraversion' },
    agreeableness: { pl: 'Ugodowość', en: 'Agreeableness' },
    neuroticism: { pl: 'Neurotyczność', en: 'Neuroticism' },
    // IPIP-NEO-120 format
    O: { pl: 'Otwartość', en: 'Openness' },
    C: { pl: 'Sumienność', en: 'Conscientiousness' },
    E: { pl: 'Ekstrawersja', en: 'Extraversion' },
    A: { pl: 'Ugodowość', en: 'Agreeableness' },
    N: { pl: 'Neurotyczność', en: 'Neuroticism' }
  };
  return labels[domain as keyof typeof labels]?.[language] || domain;
}

function getRelativeTime(dateString: string, language: 'pl' | 'en'): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return language === 'pl' ? 'Dzisiaj' : 'Today';
  } else if (diffDays === 1) {
    return language === 'pl' ? 'Wczoraj' : 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} ${language === 'pl' ? 'dni temu' : 'days ago'}`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${language === 'pl' ? (weeks === 1 ? 'tydzień temu' : 'tygodni temu') : (weeks === 1 ? 'week ago' : 'weeks ago')}`;
  } else {
    const months = Math.floor(diffDays / 30);
    return `${months} ${language === 'pl' ? (months === 1 ? 'miesiąc temu' : 'miesięcy temu') : (months === 1 ? 'month ago' : 'months ago')}`;
  }
}

