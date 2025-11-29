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
      className="relative z-50"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex items-center gap-3">
        {/* Główny przycisk */}
        <div
          className="w-10 h-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full cursor-pointer select-none transition-all duration-300 hover:scale-110 shadow-lg flex items-center justify-center hover:bg-white/20"
          onClick={togglePlay}
        >
          <Volume2 className="w-5 h-5 text-graphite" />
        </div>

        {/* Panel kontroli głośności */}
        {isExpanded && (
          <div className="absolute top-full right-0 pt-4 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
            <div
              style={{ width: 280 }}
              className="flex flex-col gap-3 p-4 shadow-2xl bg-white/90 backdrop-blur-2xl border border-white/50 rounded-[20px]"
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
                  <div className="relative w-full h-5 bg-gray-100/50 backdrop-blur-sm border border-white/60 shadow-inner rounded-full overflow-hidden">
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
                <span className="text-xs text-graphite font-medium min-w-[30px] text-center flex-shrink-0">
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
                  className="text-graphite hover:scale-110 transition-transform duration-200 flex-shrink-0"
                  title={voiceEnabled ? 'Wyłącz głos' : 'Włącz głos'}
                >
                  {voiceEnabled ? <MessageCircle className="w-5 h-5 text-graphite" /> : <MessageCircleOff className="w-5 h-5 text-silver-dark" />}
                </button>

                {/* Custom Glass Slider dla głosu */}
                <div className="flex-1 relative">
                  <div className="text-xs text-graphite mb-1 font-modern">Voice: {Math.round(voicePercentage)}%</div>
                  <div className="relative w-full h-4 bg-gray-100/50 backdrop-blur-sm border border-white/60 shadow-inner rounded-full overflow-hidden">
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
                <span className="text-xs text-graphite font-medium min-w-[30px] text-center flex-shrink-0">
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