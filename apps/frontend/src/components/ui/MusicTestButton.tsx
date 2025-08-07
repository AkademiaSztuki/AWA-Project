"use client";

import React, { useState, useEffect } from 'react';
import { useAmbientMusic } from '@/hooks/useAmbientMusic';
import { useDialogueVoice } from '@/hooks/useDialogueVoice';
import GlassSurface from './GlassSurface';
import { Volume2, VolumeX, Volume1, MessageCircle, MessageCircleOff } from 'lucide-react';

export const MusicTestButton: React.FC = () => {
  const { volume: musicVolume, setVolume: setMusicVolume, isPlaying, togglePlay } = useAmbientMusic();
  const dialogueVoice = useDialogueVoice();
  const { volume: voiceVolume, setVolume: setVoiceVolume, isEnabled: voiceEnabled, toggleEnabled: toggleVoiceEnabled } = dialogueVoice || { volume: 0.8, setVolume: () => {}, isEnabled: true, toggleEnabled: () => {} };
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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

  const handleMusicVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    console.log('MusicTestButton: handleMusicVolumeChange called with:', newVolume);
    setMusicVolume(newVolume);
  };

  const musicPercentage = musicVolume * 100;
  const voicePercentage = voiceVolume * 100;
  const thumbWidth = 48;
  const thumbHalf = thumbWidth / 2;
  const musicLeftPosition = musicPercentage === 0 ? 0 : musicPercentage === 100 ? `calc(100% - ${thumbWidth}px)` : `calc(${musicPercentage}% - ${thumbHalf}px)`;
  const voiceLeftPosition = voicePercentage === 0 ? 0 : voicePercentage === 100 ? `calc(100% - ${thumbWidth}px)` : `calc(${voicePercentage}% - ${thumbHalf}px)`;

  const handleVoiceVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
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

  return (
    <div 
      className="fixed left-4 top-4 z-[9999]"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex items-center gap-3">
        {/* Główny przycisk */}
        <div
          className="w-14 h-14 bg-white/20 backdrop-blur-xl border border-white/40 rounded-full cursor-pointer select-none transition-all duration-300 hover:scale-110 shadow-xl flex items-center justify-center"
          onClick={togglePlay}
        >
          <Volume2 className="w-6 h-6 text-white" />
        </div>

        {/* Panel kontroli głośności */}
        {isExpanded && (
          <div className="animate-in slide-in-from-left-2 duration-300">
            <div
              style={{ width: 280, height: 120 }}
              className="flex flex-col gap-3 p-4 shadow-xl bg-white/30 backdrop-blur-xl border-2 border-white/50 rounded-[28px]"
            >
              {/* Muzyka - górny rząd */}
              <div className="flex items-center gap-3">
                {/* Ikona głośnika */}
                <button
                  onClick={() => setMusicVolume(musicVolume === 0 ? 0.5 : 0)}
                  className="text-white hover:scale-110 transition-transform duration-200 flex-shrink-0"
                  title={musicVolume === 0 ? 'Włącz muzykę' : 'Wycisz muzykę'}
                >
                  {getMusicVolumeIcon()}
                </button>

                {/* Custom Glass Slider dla muzyki */}
                <div className="flex-1 relative">
                  <div className="relative w-full h-5 bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-xl rounded-[20px] overflow-hidden">
                    {/* Track background */}
                    <div className="absolute inset-0 bg-black/40 rounded-[20px]"></div>
                    {/* Progress track */}
                    <div 
                      className="absolute top-1/2 transform -translate-y-1/2 h-1.5 bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-full transition-all duration-300 ease-in-out"
                      style={{ width: `${musicPercentage}%` }}
                    ></div>
                    {/* Slider thumb */}
                    <div 
                      className={`absolute top-1/2 transform -translate-y-1/2 w-12 h-4 bg-white/80 backdrop-blur-xl border-2 border-white shadow-xl rounded-[16px] cursor-pointer transition-all duration-300 ease-in-out hover:scale-105 focus:ring-2 focus:ring-gold-400 ${
                        isDragging ? 'scale-110 border-gold/60 ring-2 ring-gold-400' : ''
                      }`}
                      style={{ left: musicLeftPosition }}
                      onMouseDown={() => setIsDragging(true)}
                      onMouseUp={() => setIsDragging(false)}
                      onMouseLeave={() => setIsDragging(false)}
                    >
                    </div>
                    {/* Hidden input for accessibility */}
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={musicVolume}
                      onChange={handleMusicVolumeChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
                {/* Tekst głośności muzyki */}
                <span className="text-xs text-white font-medium min-w-[40px] text-center flex-shrink-0">
                  {Math.round(musicVolume * 100)}%
                </span>
              </div>

              {/* Głos dialogu - dolny rząd */}
              <div className="flex items-center gap-3">
                {/* Ikona mowy/dialogu */}
                <button
                  onClick={() => {
                    console.log('MusicTestButton: toggleVoiceEnabled button clicked');
                    toggleVoiceEnabled();
                  }}
                  className="text-white hover:scale-110 transition-transform duration-200 flex-shrink-0"
                  title={voiceEnabled ? 'Wyłącz głos' : 'Włącz głos'}
                >
                  {voiceEnabled ? <MessageCircle className="w-5 h-5" /> : <MessageCircleOff className="w-5 h-5" />}
                </button>

                {/* Custom Glass Slider dla głosu */}
                <div className="flex-1 relative">
                  <div className="text-xs text-white mb-1">Voice Slider: {voicePercentage}%</div>
                  <div className="relative w-full h-5 bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-xl rounded-[20px] overflow-hidden">
                    {/* Track background */}
                    <div className="absolute inset-0 bg-black/40 rounded-[20px]"></div>
                    {/* Progress track */}
                    <div 
                      className="absolute top-1/2 transform -translate-y-1/2 h-1.5 bg-gradient-to-r from-blue-400 to-blue-300 rounded-full transition-all duration-300 ease-in-out"
                      style={{ width: `${voicePercentage}%` }}
                    ></div>
                    {/* Slider thumb */}
                    <div 
                      className={`absolute top-1/2 transform -translate-y-1/2 w-12 h-4 bg-white/80 backdrop-blur-xl border-2 border-white shadow-xl rounded-[16px] cursor-pointer transition-all duration-300 ease-in-out hover:scale-105 focus:ring-2 focus:ring-blue-400 ${
                        isDragging ? 'scale-110 border-blue/60 ring-2 ring-blue-400' : ''
                      }`}
                      style={{ left: voiceLeftPosition }}
                      onMouseDown={() => setIsDragging(true)}
                      onMouseUp={() => setIsDragging(false)}
                      onMouseLeave={() => setIsDragging(false)}
                    >
                    </div>
                    {/* Hidden input for accessibility */}
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={voiceVolume}
                      onChange={handleVoiceVolumeChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onInput={(e) => console.log('MusicTestButton: input event triggered:', e.currentTarget.value)}
                    />
                  </div>
                </div>
                {/* Tekst głośności głosu */}
                <span className="text-xs text-white font-medium min-w-[40px] text-center flex-shrink-0">
                  {Math.round(voiceVolume * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicTestButton; 