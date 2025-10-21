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
import { 
  Home, 
  Plus, 
  Settings, 
  Image as ImageIcon,
  Clock,
  Heart,
  Sparkles,
  ChevronRight
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
  const { sessionData } = useSessionData();
  const { language } = useLanguage();
  
  const [households, setHouseholds] = useState<Household[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setIsLoading(true);
    
    try {
      const userHash = sessionData?.userHash || 
                       (typeof window !== 'undefined' && window.sessionStorage?.getItem('aura_user_hash')) || 
                       '';
      
      if (!userHash) {
        console.log('No user hash found - showing empty dashboard');
        setHouseholds([]);
        setIsLoading(false);
        return;
      }

      console.log('[Dashboard] Loading data for user:', userHash);
      
      // Call Supabase function to get complete profile
      const { data, error } = await supabase
        .rpc('get_user_complete_profile', { p_user_hash: userHash });
      
      if (error) {
        console.error('[Dashboard] Supabase error:', error);
        // Fallback to empty state
        setHouseholds([]);
      } else if (data) {
        console.log('[Dashboard] Loaded profile data:', data);
        
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
        console.log('[Dashboard] No profile data found');
        setHouseholds([]);
      }
    } catch (error) {
      console.error('[Dashboard] Failed to load user data:', error);
      setHouseholds([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddHousehold = () => {
    router.push('/setup/household');
  };

  const handleAddRoom = (householdId: string) => {
    router.push(`/setup/room/${householdId}`);
  };

  const handleOpenRoom = (roomId: string) => {
    router.push(`/design/${roomId}`);
  };

  const handleEditProfile = () => {
    router.push('/setup/profile');
  };

  return (
    <div className="min-h-screen flex flex-col w-full relative overflow-hidden">
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

      <div className="flex-1 p-4 lg:p-8 pb-32">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl lg:text-4xl xl:text-5xl font-nasalization bg-gradient-to-r from-gold via-champagne to-platinum bg-clip-text text-transparent mb-2">
                  {language === 'pl' ? 'Moje Przestrzenie' : 'My Spaces'}
                </h1>
                <p className="text-base lg:text-lg text-graphite font-modern">
                  {language === 'pl' ? 'Zarządzaj swoimi wnętrzami' : 'Manage your interiors'}
                </p>
              </div>
              
              <div className="flex-shrink-0">
                <GlassButton onClick={handleEditProfile} variant="secondary">
                  <Settings size={20} className="mr-2" />
                  {language === 'pl' ? 'Profil' : 'Profile'}
                </GlassButton>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
                    <Home size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-nasalization text-graphite">{households.length}</p>
                    <p className="text-xs text-silver-dark font-modern">
                      {language === 'pl' ? 'Przestrzenie' : 'Spaces'}
                    </p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
                    <ImageIcon size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-nasalization text-graphite">
                      {households.reduce((sum, h) => sum + h.rooms.length, 0)}
                    </p>
                    <p className="text-xs text-silver-dark font-modern">
                      {language === 'pl' ? 'Pokoje' : 'Rooms'}
                    </p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
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
              className="glass-panel rounded-xl p-6 hover:bg-white/40 transition-all duration-300 group min-h-[200px] flex flex-col items-center justify-center gap-3"
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

