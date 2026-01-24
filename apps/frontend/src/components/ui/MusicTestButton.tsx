"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAmbientMusic } from '@/hooks/useAmbientMusic';
import { useDialogueVoice } from '@/hooks/useDialogueVoice';
import { GlassSlider } from './GlassSlider';
import { Volume2, VolumeX, Volume1, MessageCircle, MessageCircleOff, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export const MusicTestButton: React.FC = () => {
  const { language } = useLanguage();
  const { volume: musicVolume, setVolume: setMusicVolume, isPlaying, togglePlay } = useAmbientMusic();
  const dialogueVoice = useDialogueVoice();
  const { volume: voiceVolume, setVolume: setVoiceVolume, isEnabled: voiceEnabled, toggleEnabled: toggleVoiceEnabled } = dialogueVoice || { volume: 0.8, setVolume: () => {}, isEnabled: true, toggleEnabled: () => {} };
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [panelPosition, setPanelPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Calculate panel position based on button position
  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setPanelPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        });
      }
    };

    if (isOpen) {
      updatePosition();
      // Use a small timeout to ensure the DOM is stable
      const timer = setTimeout(updatePosition, 100);
      
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  const getMusicVolumeIcon = () => {
    if (musicVolume === 0) return <VolumeX size={16} aria-hidden="true" />;
    if (musicVolume < 0.3) return <Volume1 size={16} aria-hidden="true" />;
    return <Volume2 size={16} aria-hidden="true" />;
  };

  const handleMusicVolumeChange = (value: number) => {
    const newVolume = value / 100; // Convert from 0-100 to 0-1
    setMusicVolume(newVolume);
  };

  const handleVoiceVolumeChange = (value: number) => {
    const newVolume = value / 100; // Convert from 0-100 to 0-1
    
    // NATYCHMIASTOWA synchronizacja z audio elementami PRZED aktualizacją state
    const dialogueAudios = document.querySelectorAll('audio[data-type="dialogue"]') as NodeListOf<HTMLAudioElement>;
    dialogueAudios.forEach(audio => {
      audio.volume = newVolume;
    });
    
    // Użyj funkcji z hooka, która też zaktualizuje localStorage
    setVoiceVolume(newVolume);
  };

  // Synchronizuj głośność na żywo na wszystkich audio[data-type="dialogue"]
  useEffect(() => {
    const dialogueAudios = document.querySelectorAll('audio[data-type="dialogue"]') as NodeListOf<HTMLAudioElement>;
    dialogueAudios.forEach(audio => {
      audio.volume = voiceVolume;
    });
  }, [voiceVolume]);

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen && firstButtonRef.current) {
      // Small delay to ensure panel is rendered
      setTimeout(() => {
        firstButtonRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Trap focus within panel when open
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;

    const panel = panelRef.current;
    const focusableElements = panel.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    panel.addEventListener('keydown', handleTab);
    return () => panel.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  const musicVolumeId = 'music-volume-slider';
  const voiceVolumeId = 'voice-volume-slider';

  const t = (pl: string, en: string) => language === 'pl' ? pl : en;

  if (!mounted) {
    return (
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-all text-graphite flex-shrink-0 touch-target relative z-[110] pointer-events-auto focus:ring-2 focus:ring-gold-400 focus:outline-none"
        aria-label={t('Otwórz panel kontroli dźwięku', 'Open sound control panel')}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        type="button"
      >
        {(isPlaying || voiceEnabled) ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} className="opacity-60" aria-hidden="true" />}
      </button>
    );
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-all text-graphite flex-shrink-0 touch-target relative z-[110] pointer-events-auto focus:ring-2 focus:ring-gold-400 focus:outline-none"
        aria-label={t('Otwórz panel kontroli dźwięku', 'Open sound control panel')}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        type="button"
      >
        {(isPlaying || voiceEnabled) ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} className="opacity-60" aria-hidden="true" />}
      </button>

      {/* Panel via Portal */}
      {createPortal(
        <AnimatePresence initial={false}>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998]"
                aria-hidden="true"
              />
              
              {/* Panel Content */}
              <motion.div
                key="panel"
                ref={panelRef}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="glass-panel !fixed !z-[9999] rounded-[24px] p-4 sm:p-6 w-[min(320px,90vw)] max-w-[calc(100vw-2rem)] shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="music-panel-title"
                aria-describedby="music-panel-description"
                style={{ 
                  top: panelPosition.top > 0 ? `${panelPosition.top}px` : '80px',
                  right: panelPosition.right > 0 ? `${panelPosition.right}px` : '16px',
                  maxHeight: 'calc(100vh - 8rem)' 
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 id="music-panel-title" className="text-lg font-exo2 text-graphite">
                    {t('Dźwięk i Muzyka', 'Sound & Music')}
                  </h3>
                  <button
                    ref={firstButtonRef}
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 rounded-full glass-panel flex items-center justify-center hover:bg-white/10 transition-all focus:ring-2 focus:ring-gold-400 focus:outline-none"
                    aria-label={t('Zamknij panel kontroli dźwięku', 'Close sound control panel')}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>

                <div id="music-panel-description" className="sr-only">
                  {t(
                    'Panel umożliwia kontrolę głośności muzyki tła i głosu dialogu IDA.',
                    'Panel allows controlling background music volume and IDA dialogue voice volume.'
                  )}
                </div>

                <div className="space-y-6">
                  {/* Music Volume Slider */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label 
                        htmlFor={musicVolumeId}
                        className="block text-sm font-exo2 text-graphite"
                      >
                        {t('Muzyka', 'Music')}
                      </label>
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (musicVolume === 0) {
                            setMusicVolume(0.3);
                            if (typeof window !== 'undefined') {
                              (window as any).ambientMusicUserManuallyPaused = false;
                            }
                            const audioElement = document.querySelector('audio[data-type="ambient"]') as HTMLAudioElement;
                            if (audioElement) {
                              try {
                                await audioElement.play();
                              } catch (error) {
                                togglePlay();
                              }
                            } else {
                              togglePlay();
                            }
                          } else {
                            setMusicVolume(0);
                            const audioElement = document.querySelector('audio[data-type="ambient"]') as HTMLAudioElement;
                            if (audioElement && !audioElement.paused) {
                              audioElement.pause();
                              if (typeof window !== 'undefined') {
                                (window as any).ambientMusicUserManuallyPaused = true;
                              }
                            }
                          }
                        }}
                        className="w-8 h-8 rounded-full glass-panel flex items-center justify-center hover:bg-white/10 transition-all focus:ring-2 focus:ring-gold-400 focus:outline-none"
                        aria-label={musicVolume === 0 ? t('Włącz muzykę', 'Enable music') : t('Wycisz muzykę', 'Mute music')}
                      >
                        {getMusicVolumeIcon()}
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <GlassSlider
                        id={musicVolumeId}
                        min={0}
                        max={100}
                        value={Math.round(musicVolume * 100)}
                        onChange={handleMusicVolumeChange}
                        ariaLabel={t('Głośność muzyki', 'Music volume')}
                        ariaValueText={`${Math.round(musicVolume * 100)}%`}
                      />
                      <span className="text-xs text-graphite font-medium min-w-[40px] text-center flex-shrink-0" aria-live="polite">
                        {Math.round(musicVolume * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Voice Volume Slider */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label 
                        htmlFor={voiceVolumeId}
                        className="block text-sm font-exo2 text-graphite"
                      >
                        {t('Głos dialogu', 'Dialogue Voice')}
                      </label>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleVoiceEnabled();
                        }}
                        className="w-8 h-8 rounded-full glass-panel flex items-center justify-center hover:bg-white/10 transition-all focus:ring-2 focus:ring-gold-400 focus:outline-none"
                        aria-label={voiceEnabled ? t('Wyłącz głos', 'Disable voice') : t('Włącz głos', 'Enable voice')}
                      >
                        {voiceEnabled ? <MessageCircle size={16} aria-hidden="true" /> : <MessageCircleOff size={16} className="opacity-60" aria-hidden="true" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <GlassSlider
                        id={voiceVolumeId}
                        min={0}
                        max={100}
                        value={Math.round(voiceVolume * 100)}
                        onChange={handleVoiceVolumeChange}
                        ariaLabel={t('Głośność głosu dialogu', 'Dialogue voice volume')}
                        ariaValueText={`${Math.round(voiceVolume * 100)}%`}
                      />
                      <span className="text-xs text-graphite font-medium min-w-[40px] text-center flex-shrink-0" aria-live="polite">
                        {Math.round(voiceVolume * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default MusicTestButton; 