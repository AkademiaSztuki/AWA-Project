"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAmbientMusic } from '@/hooks/useAmbientMusic';
import { useDialogueVoice } from '@/hooks/useDialogueVoice';
import GlassSurface from './GlassSurface';
import { Volume2, VolumeX, Volume1, MessageCircle, MessageCircleOff } from 'lucide-react';

export const MusicTestButton: React.FC = () => {
  const { volume: musicVolume, setVolume: setMusicVolume, isPlaying, togglePlay } = useAmbientMusic();
  
  // Debug: log isPlaying state
  useEffect(() => {
    console.log('MusicTestButton: isPlaying changed to:', isPlaying);
  }, [isPlaying]);
  const dialogueVoice = useDialogueVoice();
  const { volume: voiceVolume, setVolume: setVoiceVolume, isEnabled: voiceEnabled, toggleEnabled: toggleVoiceEnabled } = dialogueVoice || { volume: 0.8, setVolume: () => {}, isEnabled: true, toggleEnabled: () => {} };
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });
  const isMobileRef = useRef(false);

  // Sprawdź czy jesteśmy na mobile
  useEffect(() => {
    const checkMobile = () => {
      isMobileRef.current = window.innerWidth < 640;
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  console.log('MusicTestButton: dialogueVoice hook result:', dialogueVoice);
  console.log('MusicTestButton: voiceVolume:', voiceVolume, 'voiceEnabled:', voiceEnabled);
  console.log('MusicTestButton: setVoiceVolume function:', typeof setVoiceVolume);

  const getMusicVolumeIcon = () => {
    if (musicVolume === 0) return <VolumeX className="w-5 h-5" />;
    if (musicVolume < 0.3) return <Volume1 className="w-5 h-5" />;
    return <Volume2 className="w-5 h-5" />;
  };

  const getMusicVolumeText = () => {
    if (musicVolume === 0) return 'Wyciszone';
    if (musicVolume < 0.3) return 'Cicho';
    if (musicVolume < 0.7) return 'Średnio';
    return 'Głośno';
  };

  const handleMusicVolumeChange = (e: React.ChangeEvent<HTMLInputElement> | React.FormEvent<HTMLInputElement>) => {
    const target = e.currentTarget as HTMLInputElement;
    const newVolume = parseFloat(target.value);
    console.log('MusicTestButton: handleMusicVolumeChange called with:', newVolume);
    setMusicVolume(newVolume);
  };

  const musicPercentage = musicVolume * 100;
  const voicePercentage = voiceVolume * 100;
  const thumbWidth = 16;
  const thumbHalf = thumbWidth / 2;
  const calcLeft = (pct: number) =>
    pct === 0 ? 0 : pct === 100 ? `calc(100% - ${thumbWidth}px)` : `calc(${pct}% - ${thumbHalf}px)`;
  const musicLeftPosition = calcLeft(musicPercentage);
  const voiceLeftPosition = calcLeft(voicePercentage);

  const handleVoiceVolumeChange = (e: React.ChangeEvent<HTMLInputElement> | React.FormEvent<HTMLInputElement>) => {
    const target = e.currentTarget as HTMLInputElement;
    const newVolume = parseFloat(target.value);
    console.log('MusicTestButton: handleVoiceVolumeChange called with:', newVolume, 'setVoiceVolume function exists:', !!setVoiceVolume);
    setVoiceVolume(newVolume);
  };

  // Synchronizuj głośność na żywo na wszystkich audio[data-type="dialogue"]
  useEffect(() => {
    const dialogueAudios = document.querySelectorAll('audio[data-type="dialogue"]') as NodeListOf<HTMLAudioElement>;
    dialogueAudios.forEach(audio => {
      audio.volume = voiceVolume;
    });
  }, [voiceVolume]);

  // Update panel position when expanded or scrolled
  useEffect(() => {
    if (!isExpanded || !buttonRef.current) return;

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth < 640;
      const panelWidth = isMobile ? 240 : 280;
      
      let left = rect.left;
      let top = rect.bottom + 8;
      
      // If it would overflow on the right, shift it left
      if (left + panelWidth > window.innerWidth - 12) {
        left = window.innerWidth - panelWidth - 12;
      }
      
      // Ensure it doesn't overflow on the left
      left = Math.max(12, left);
      
      // On mobile, ensure panel doesn't go below viewport
      if (isMobile && top + 200 > window.innerHeight) {
        top = rect.top - 200 - 8; // Show above button instead
      }
      
      setPanelPosition({ top, left });
    };

    updatePosition();
    
    // Update on scroll/resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isExpanded]);

  // Close panel when clicking/touching outside - obsługa mobile
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      const button = buttonRef.current;
      const panel = panelRef.current;
      
      if (button && panel && !button.contains(target) && !panel.contains(target)) {
        setIsExpanded(false);
      }
    };

    // Obsługa zarówno mouse jak i touch
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isExpanded]);

  // Blokuj scroll podczas przeciągania slidera na mobile
  useEffect(() => {
    if (!isDragging) return;

    const preventScroll = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventScroll, { passive: false });
    
    return () => {
      document.removeEventListener('touchmove', preventScroll);
    };
  }, [isDragging]);

  return (
    <div 
      className="relative z-[200] pointer-events-auto"
      style={{ position: 'relative' }}
      onMouseEnter={() => {
        if (window.innerWidth >= 1024) setIsExpanded(true);
      }}
      // Usunięto onMouseLeave - panel zamyka się tylko przez handleClickOutside lub gdy mysz opuszcza sam panel
    >
      <div className="flex items-center gap-3 relative">
        {/* Główny przycisk - TYLKO otwiera/zamyka panel, NIE przełącza dźwięku */}
        <button
          ref={buttonRef}
          type="button"
          data-music-button
          disabled={false}
          className="w-10 h-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full cursor-pointer select-none transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg flex items-center justify-center hover:bg-white/20 text-graphite touch-target relative z-[210] pointer-events-auto"
          style={{ 
            pointerEvents: 'auto', 
            cursor: 'pointer',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent'
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('MusicTestButton: button clicked, isExpanded:', isExpanded);
            
            // TYLKO toggle panel - NIE przełączaj dźwięku
            setIsExpanded(prev => {
              console.log('MusicTestButton: setting isExpanded to:', !prev);
              return !prev;
            });
          }}
        >
          {(isPlaying || voiceEnabled) ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 opacity-60" />}
        </button>

        {/* Panel kontroli głośności */}
        {isExpanded && typeof window !== 'undefined' && document.body && createPortal(
          <div 
            ref={panelRef}
            data-music-panel
            className="fixed z-[300] pointer-events-auto"
            style={{ 
              top: `${panelPosition.top}px`,
              left: `${panelPosition.left}px`,
            }}
            onMouseEnter={() => {
              if (window.innerWidth >= 1024) setIsExpanded(true);
            }}
            onMouseLeave={() => {
              // Only close on desktop when mouse leaves panel
            }}
          >
            <div
              className="flex flex-col gap-3 p-4 shadow-2xl bg-[#c7b07a]/95 backdrop-blur-md border border-white/25 ring-1 ring-gold/35 rounded-[20px] w-[240px] sm:w-[280px] pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
            >
              {/* Muzyka - górny rząd */}
              <div className="flex items-center gap-3">
                {/* Ikona głośnika - teraz przełącza dźwięk */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (musicVolume === 0) {
                      setMusicVolume(0.5);
                      if (!isPlaying) {
                        togglePlay();
                      }
                    } else {
                      setMusicVolume(0);
                      if (isPlaying) {
                        togglePlay();
                      }
                    }
                  }}
                  className="text-white hover:scale-110 active:scale-95 transition-transform duration-200 flex-shrink-0 touch-manipulation"
                  style={{ 
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                    minWidth: '44px',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={musicVolume === 0 ? 'Włącz muzykę' : 'Wycisz muzykę'}
                >
                  {getMusicVolumeIcon()}
                </button>

                {/* Custom Glass Slider dla muzyki */}
                <div className="flex-1 relative" style={{ minHeight: '44px', display: 'flex', alignItems: 'center' }}>
                  <div className="relative w-full h-5 bg-white/25 backdrop-blur-sm border border-white/30 shadow-inner rounded-full overflow-hidden touch-none">
                    {/* Track background */}
                    <div className="absolute inset-0 bg-black/5 rounded-full"></div>
                    {/* Progress track */}
                    <div 
                      className="absolute top-1/2 transform -translate-y-1/2 h-full bg-gradient-to-r from-gold to-champagne rounded-full transition-all duration-300 ease-in-out"
                      style={{ width: `${musicPercentage}%` }}
                    ></div>
                    {/* Slider thumb */}
                    <div 
                      className={`absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white border border-gold/30 shadow-sm rounded-full cursor-pointer transition-all duration-300 ease-in-out hover:scale-110 focus:ring-2 focus:ring-gold-400 ${
                        isDragging ? 'scale-125 border-gold ring-2 ring-gold-400' : ''
                      }`}
                      style={{ left: musicLeftPosition }}
                      onMouseDown={() => setIsDragging(true)}
                      onMouseUp={() => setIsDragging(false)}
                      onMouseLeave={() => setIsDragging(false)}
                    >
                    </div>
                    {/* Hidden input for accessibility - z obsługą touch */}
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={musicVolume}
                      onChange={handleMusicVolumeChange}
                      onInput={handleMusicVolumeChange}
                      onTouchStart={() => setIsDragging(true)}
                      onTouchEnd={() => setIsDragging(false)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-none"
                      style={{ 
                        touchAction: 'none',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                    />
                  </div>
                </div>
                {/* Tekst głośności muzyki */}
                <span className="text-xs text-graphite font-medium min-w-[30px] text-center flex-shrink-0">
                  {Math.round(musicVolume * 100)}%
                </span>
              </div>

              {/* Głos dialogu - dolny rząd */}
              <div className="flex items-center gap-3">
                {/* Ikona mowy/dialogu */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('MusicTestButton: toggleVoiceEnabled button clicked');
                    toggleVoiceEnabled();
                  }}
                  className="text-white hover:scale-110 active:scale-95 transition-transform duration-200 flex-shrink-0 touch-manipulation"
                  style={{ 
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                    minWidth: '44px',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={voiceEnabled ? 'Wyłącz głos' : 'Włącz głos'}
                >
                  {voiceEnabled ? <MessageCircle className="w-5 h-5" /> : <MessageCircleOff className="w-5 h-5 text-white/60" />}
                </button>

                {/* Custom Glass Slider dla głosu */}
                <div className="flex-1 relative" style={{ minHeight: '44px', display: 'flex', alignItems: 'center' }}>
                  <div className="text-xs text-graphite mb-1 font-modern">Voice: {Math.round(voicePercentage)}%</div>
                  <div className="relative w-full h-4 bg-white/25 backdrop-blur-sm border border-white/30 shadow-inner rounded-full overflow-hidden touch-none">
                    {/* Track background */}
                    <div className="absolute inset-0 bg-black/5 rounded-full"></div>
                    {/* Progress track */}
                    <div 
                      className="absolute top-1/2 transform -translate-y-1/2 h-full bg-gradient-to-r from-platinum to-silver rounded-full transition-all duration-300 ease-in-out"
                      style={{ width: `${voicePercentage}%` }}
                    ></div>
                    {/* Slider thumb */}
                    <div 
                      className={`absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white border border-silver/30 shadow-sm rounded-full cursor-pointer transition-all duration-300 ease-in-out hover:scale-110 focus:ring-2 focus:ring-silver ${
                        isDragging ? 'scale-125 border-silver ring-2 ring-silver' : ''
                      }`}
                      style={{ left: voiceLeftPosition }}
                      onMouseDown={() => setIsDragging(true)}
                      onMouseUp={() => setIsDragging(false)}
                      onMouseLeave={() => setIsDragging(false)}
                    >
                    </div>
                    {/* Hidden input for accessibility - z obsługą touch */}
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={voiceVolume}
                      onChange={handleVoiceVolumeChange}
                      onInput={handleVoiceVolumeChange}
                      onTouchStart={() => setIsDragging(true)}
                      onTouchEnd={() => setIsDragging(false)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-none"
                      style={{ 
                        touchAction: 'none',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                    />
                  </div>
                </div>
                {/* Tekst głośności głosu */}
                <span className="text-xs text-graphite font-medium min-w-[30px] text-center flex-shrink-0">
                  {Math.round(voiceVolume * 100)}%
                </span>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};

export default MusicTestButton; 