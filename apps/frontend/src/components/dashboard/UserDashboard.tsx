"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSessionData } from '@/hooks/useSessionData';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { getSupabase } from '@/lib/supabase';
import { 
  Home, 
  Plus, 
  Image as ImageIcon,
  Clock,
  Heart,
  Sparkles,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import Image from 'next/image';

interface Household {
  id: string;
  name: string;
  type: string;
  rooms: Room[];
}

interface Room {
  id: string;
  name: string;
  roomType: string;
  sessionsCount: number;
  lastSessionDate?: string;
  thumbnailUrl?: string;
}

/**
 * UserDashboard - Main control panel for multi-room, multi-household system
 * 
 * Shows:
 * - User's households
 * - Rooms within each household
 * - Design sessions per room
 * - Quick actions
 */
export function UserDashboard() {
  const router = useRouter();
  const { sessionData, updateSessionData } = useSessionData();
  const { language } = useLanguage();
  
  const [households, setHouseholds] = useState<Household[]>([]);
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
        setHouseholds([]);
        setIsLoading(false);
        return;
      }

      console.log('[Dashboard] Loading data for user:', userHash);
      
      // Check if we have session data with households
      if (sessionData?.households && sessionData.households.length > 0) {
        console.log('[Dashboard] Loaded from sessionData');
        setHouseholds(sessionData.households);
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
          if (parsed.households && parsed.households.length > 0) {
            console.log('[Dashboard] Loaded from localStorage');
            setHouseholds(parsed.households);
            setIsLoading(false);
            // Continue with Supabase load in background
          } else {
            console.log('[Dashboard] No households in localStorage data');
            setHouseholds([]);
            setIsLoading(false);
          }
        } catch (e) {
          console.log('[Dashboard] Failed to parse localStorage data:', e);
          setHouseholds([]);
          setIsLoading(false);
        }
      } else {
        console.log('[Dashboard] No localStorage data found');
        setHouseholds([]);
        setIsLoading(false);
      }
      
      // Call Supabase function to get complete profile
      const { data, error } = await getSupabase()
        .rpc('get_user_complete_profile', { p_user_hash: userHash });
      
      if (error) {
        console.error('[Dashboard] Supabase error:', error);
        // If we don't have localStorage data, show empty state
        if (!localSessionData) {
          setHouseholds([]);
        }
      } else if (data && data.households && data.households.length > 0) {
        console.log('[Dashboard] Loaded profile data from Supabase:', data);
        
        // Transform Supabase data to UI format
        const transformedHouseholds: Household[] = (data.households || []).map((h: any) => ({
          id: h.household.id,
          name: h.household.name,
          type: h.household.household_type || 'home',
          rooms: (h.rooms || []).map((r: any) => ({
            id: r.room.id,
            name: r.room.name,
            roomType: r.room.room_type,
            sessionsCount: r.sessions?.length || 0,
            lastSessionDate: r.sessions?.[r.sessions.length - 1]?.created_at,
            thumbnailUrl: r.sessions?.[r.sessions.length - 1]?.generated_images?.[0]?.url
          }))
        }));
        
        setHouseholds(transformedHouseholds);
      } else {
        // No profile yet - empty state
        console.log('[Dashboard] No profile data found in Supabase');
        if (!localSessionData) {
          setHouseholds([]);
        }
      }
    } catch (error) {
      console.error('[Dashboard] Failed to load user data:', error);
      // Only set empty if we don't have localStorage data
      const localSessionData = localStorage.getItem('aura_session');
      if (!localSessionData) {
        setHouseholds([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddHousehold = () => {
    // Create a sample household for demo
    const newHousehold: Household = {
      id: `household_${Date.now()}`,
      name: language === 'pl' ? 'Moja Przestrzeń' : 'My Space',
      type: 'home',
      rooms: []
    };
    
    const updatedHouseholds = [...households, newHousehold];
    setHouseholds(updatedHouseholds);
    
    // Save to session data
    updateSessionData({ households: updatedHouseholds });
    
    router.push('/setup/household');
  };

  const handleAddRoom = (householdId: string) => {
    router.push(`/setup/room/${householdId}`);
  };

  const handleOpenRoom = (roomId: string) => {
    router.push(`/design/${roomId}`);
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
    <div className="min-h-screen flex flex-col w-full relative overflow-hidden">
      {authError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-xl p-3 rounded-lg glass-panel border border-red-300/40">
          <p className="text-sm text-red-700 font-modern text-center">
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
                    <p className="text-2xl font-nasalization text-graphite">{households.length}</p>
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
                      {households.reduce((sum, h) => sum + h.rooms.length, 0)}
                    </p>
                    <p className="text-xs text-silver-dark font-modern">
                      {language === 'pl' ? 'Pokoje' : 'Rooms'}
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
                      {households.reduce((sum, h) => 
                        sum + h.rooms.reduce((s, r) => s + r.sessionsCount, 0), 0
                      )}
                    </p>
                    <p className="text-xs text-silver-dark font-modern">
                      {language === 'pl' ? 'Projekty' : 'Designs'}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </motion.div>

          {/* Inspirations Gallery (from latest session_json) */}
          <InspirationsGallery userHash={(sessionData as any)?.userHash} />

          {/* Big Five Results */}
          <BigFiveResults userHash={(sessionData as any)?.userHash} />

          {/* Households List */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 text-silver-dark font-modern">
                {language === 'pl' ? 'Ładowanie...' : 'Loading...'}
              </p>
            </div>
          ) : households.length === 0 ? (
            <EmptyState onAddHousehold={handleAddHousehold} />
          ) : (
            <div className="space-y-6">
              {households.map((household, index) => (
                <HouseholdCard
                  key={household.id}
                  household={household}
                  index={index}
                  onAddRoom={() => handleAddRoom(household.id)}
                  onOpenRoom={handleOpenRoom}
                />
              ))}

              {/* Add Household Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: households.length * 0.1 + 0.2 }}
              >
                <button
                  onClick={handleAddHousehold}
                  className="w-full glass-panel rounded-2xl p-6 hover:bg-white/40 transition-all duration-300 group"
                >
                  <div className="flex items-center justify-center gap-3 text-graphite">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus size={24} className="text-white" />
                    </div>
                    <span className="font-nasalization text-xl">
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

function HouseholdCard({ household, index, onAddRoom, onOpenRoom }: {
  household: Household;
  index: number;
  onAddRoom: () => void;
  onOpenRoom: (roomId: string) => void;
}) {
  const { language } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <GlassCard className="p-6 lg:p-8">
        {/* Household Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
              <Home size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite">
                {household.name}
              </h2>
              <p className="text-sm text-silver-dark font-modern">
                {household.rooms.length} {language === 'pl' ? 'pokoi' : 'rooms'}
              </p>
            </div>
          </div>
        </div>

        {/* Rooms Grid */}
        {household.rooms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
            {household.rooms.map((room, roomIndex) => (
              <RoomCard
                key={room.id}
                room={room}
                index={roomIndex}
                onClick={() => onOpenRoom(room.id)}
              />
            ))}

            {/* Add Room Button */}
            <button
              onClick={onAddRoom}
              className="glass-panel rounded-xl p-4 sm:p-6 hover:bg-white/40 transition-all duration-300 group min-h-[200px] flex flex-col items-center justify-center gap-3 w-full"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus size={24} className="text-white" />
              </div>
              <span className="font-modern text-graphite">
                {language === 'pl' ? 'Dodaj Pokój' : 'Add Room'}
              </span>
            </button>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-silver-dark font-modern mb-4">
              {language === 'pl' ? 'Brak pokoi w tej przestrzeni' : 'No rooms in this space yet'}
            </p>
            <GlassButton onClick={onAddRoom} variant="secondary">
              <Plus size={18} className="mr-2" />
              {language === 'pl' ? 'Dodaj Pierwszy Pokój' : 'Add First Room'}
            </GlassButton>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}

function InspirationsGallery({ userHash }: { userHash?: string }) {
  const { language } = useLanguage();
  const [urls, setUrls] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!userHash) { setUrls([]); return; }
        
        // First try localStorage (immediate)
        const localSession = localStorage.getItem('aura_session');
        if (localSession) {
          const parsed = JSON.parse(localSession);
          const insp = parsed?.inspirations || [];
          const imgUrls = insp.map((i: any) => i?.url).filter((u: string) => !!u);
          if (mounted) {
            setUrls(imgUrls);
            setLoading(false);
            return;
          }
        }
        
        // Fallback to Supabase
        const { data, error } = await getSupabase()
          .from('sessions')
          .select('session_json')
          .eq('user_hash', userHash)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        const insp = (data as any)?.session_json?.inspirations || [];
        const imgUrls = insp.map((i: any) => i?.url).filter((u: string) => !!u);
        if (mounted) setUrls(imgUrls);
      } catch (e) {
        console.warn('[Dashboard] inspirations fetch failed', e);
        if (mounted) setUrls([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userHash]);

  if (loading) return null;
  if (!urls.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-8"
    >
      <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite mb-4">
        {language === 'pl' ? 'Moje Inspiracje' : 'My Inspirations'}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {urls.slice(0, 12).map((url, idx) => (
          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden glass-panel">
            <Image src={url} alt={`Inspiration ${idx+1}`} fill className="object-cover" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function RoomCard({ room, index, onClick }: {
  room: Room;
  index: number;
  onClick: () => void;
}) {
  const { language } = useLanguage();

  const roomTypeIcons: Record<string, React.ReactNode> = {
    bedroom: <Home size={32} className="text-gold" />,
    living_room: <Home size={32} className="text-gold" />,
    kitchen: <Home size={32} className="text-gold" />,
    bathroom: <Home size={32} className="text-gold" />,
    home_office: <Home size={32} className="text-gold" />,
    dining_room: <Home size={32} className="text-gold" />,
    kids_room: <Home size={32} className="text-gold" />
  };

  const icon = roomTypeIcons[room.roomType] || <Home size={32} className="text-gold" />;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ scale: 1.05, y: -5 }}
      onClick={onClick}
      className="glass-panel rounded-xl overflow-hidden hover:border-gold/50 transition-all duration-300 group text-left"
    >
      {/* Thumbnail or Placeholder */}
      <div className="relative w-full h-32 bg-gradient-to-br from-platinum-100 to-pearl-100">
        {room.thumbnailUrl ? (
          <Image
            src={room.thumbnailUrl}
            alt={room.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {icon}
          </div>
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-gold/0 to-champagne/0 group-hover:from-gold/20 group-hover:to-champagne/20 transition-all duration-300" />
        
        {/* Sessions badge */}
        {room.sessionsCount > 0 && (
          <div className="absolute top-2 right-2 glass-panel px-2 py-1 rounded-full flex items-center gap-1">
            <ImageIcon size={12} className="text-gold" />
            <span className="text-xs font-semibold text-graphite">{room.sessionsCount}</span>
          </div>
        )}
      </div>

      {/* Room Info */}
      <div className="p-4">
        <h3 className="font-nasalization text-lg text-graphite mb-1 group-hover:text-gold transition-colors">
          {room.name}
        </h3>
        <p className="text-xs text-silver-dark font-modern mb-3">
          {getRoomTypeLabel(room.roomType, language)}
        </p>

        {room.lastSessionDate && (
          <div className="flex items-center gap-2 text-xs text-silver-dark">
            <Clock size={12} />
            <span>{getRelativeTime(room.lastSessionDate, language)}</span>
          </div>
        )}

        {room.sessionsCount === 0 && (
          <div className="text-xs text-blue-500 font-semibold">
            {language === 'pl' ? 'Nowy pokój' : 'New room'}
          </div>
        )}
      </div>

      {/* Arrow indicator */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight size={20} className="text-gold" />
      </div>
    </motion.button>
  );
}

function EmptyState({ onAddHousehold }: { onAddHousehold: () => void }) {
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

        <GlassButton onClick={onAddHousehold} className="px-8 py-4">
          <Plus size={20} className="mr-2" />
          {language === 'pl' ? 'Dodaj Pierwszą Przestrzeń' : 'Add First Space'}
        </GlassButton>
      </GlassCard>
    </motion.div>
  );
}

// ========== HELPER FUNCTIONS ==========

function getRoomTypeLabel(roomType: string, language: 'pl' | 'en'): string {
  const labels: Record<string, { pl: string; en: string }> = {
    bedroom: { pl: 'Sypialnia', en: 'Bedroom' },
    living_room: { pl: 'Salon', en: 'Living Room' },
    kitchen: { pl: 'Kuchnia', en: 'Kitchen' },
    bathroom: { pl: 'Łazienka', en: 'Bathroom' },
    home_office: { pl: 'Biuro domowe', en: 'Home Office' },
    dining_room: { pl: 'Jadalnia', en: 'Dining Room' },
    kids_room: { pl: 'Pokój dziecięcy', en: 'Kids Room' }
  };

  return labels[roomType]?.[language] || roomType;
}

function BigFiveResults({ userHash }: { userHash?: string }) {
  const { language } = useLanguage();
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
        const { data, error } = await getSupabase()
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
      className="mb-8"
    >
      <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite mb-4">
        {language === 'pl' ? 'Twój Profil Osobowości' : 'Your Personality Profile'}
      </h2>
      <GlassCard className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(bigFiveData.scores).map(([domain, score], index) => (
            <motion.div
              key={domain}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="mb-2">
                <div className="text-2xl font-bold text-gold mb-1">{Number(score)}%</div>
                <div className="text-sm font-nasalization text-graphite">
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
          ))}
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-silver-dark font-modern">
            {language === 'pl' ? 'Wyniki testu Big Five - używane do personalizacji wnętrz' : 'Big Five test results - used for interior personalization'}
          </p>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function getDomainLabel(domain: string, language: 'pl' | 'en'): string {
  const labels = {
    openness: { pl: 'Otwartość', en: 'Openness' },
    conscientiousness: { pl: 'Sumienność', en: 'Conscientiousness' },
    extraversion: { pl: 'Ekstrawersja', en: 'Extraversion' },
    agreeableness: { pl: 'Ugodowość', en: 'Agreeableness' },
    neuroticism: { pl: 'Neurotyczność', en: 'Neuroticism' }
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

