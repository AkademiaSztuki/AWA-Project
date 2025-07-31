"use client";

import React, { useState } from 'react';
import { useAmbientMusic } from '@/hooks/useAmbientMusic';
import GlassSurface from './GlassSurface';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';

export const MusicTestButton: React.FC = () => {
  const { volume, setVolume, isPlaying, togglePlay } = useAmbientMusic();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const getVolumeIcon = () => {
    if (volume === 0) return <VolumeX className="w-5 h-5" />;
    if (volume < 0.3) return <Volume1 className="w-5 h-5" />;
    return <Volume2 className="w-5 h-5" />;
  };

  const getVolumeText = () => {
    if (volume === 0) return 'Wyciszone';
    if (volume < 0.3) return 'Cicho';
    if (volume < 0.7) return 'Średnio';
    return 'Głośno';
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const percentage = volume * 100;
  const thumbWidth = 48; // w-12 = 12 * 4px
  const thumbHalf = thumbWidth / 2; // 24px
  const leftPosition = percentage === 0 ? 0 : percentage === 100 ? `calc(100% - ${thumbWidth}px)` : `calc(${percentage}% - ${thumbHalf}px)`;

  return (
    <div 
      className="fixed left-4 top-4 z-50"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex items-center gap-3">
        {/* Główny przycisk */}
        <GlassSurface
          width={56}
          height={56}
          borderRadius={28}
          className="cursor-pointer select-none transition-all duration-300 hover:scale-110 shadow-xl"
          onClick={togglePlay}
        >
          <div className="flex items-center justify-center w-full h-full">
            {isPlaying ? (
              <Volume2 className="w-6 h-6 text-white" />
            ) : (
              <Volume2 className="w-6 h-6 text-white" />
            )}
          </div>
        </GlassSurface>

        {/* Panel kontroli głośności */}
        {isExpanded && (
          <div className="animate-in slide-in-from-left-2 duration-300">
            <GlassSurface
              width={220}
              height={56}
              borderRadius={28}
              className="flex items-center gap-3 px-4 shadow-xl"
            >
              {/* Ikona głośnika */}
              <button
                onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
                className="text-white hover:scale-110 transition-transform duration-200 flex-shrink-0"
                title={volume === 0 ? 'Włącz dźwięk' : 'Wycisz'}
              >
                {getVolumeIcon()}
              </button>

              {/* Custom Glass Slider */}
              <div className="flex-1 relative">
                <div className="relative w-full h-5 bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl rounded-[20px] overflow-hidden">
                  {/* Track background */}
                  <div className="absolute inset-0 bg-black/10 rounded-[20px]"></div>
                  
                  {/* Progress track */}
                  <div 
                    className="absolute top-1/2 transform -translate-y-1/2 h-1.5 bg-gradient-to-r from-yellow-400/60 to-yellow-300/40 rounded-full transition-all duration-300 ease-in-out"
                    style={{ width: `${percentage}%` }}
                  ></div>
                  
                  {/* Slider thumb */}
                  <div 
                    className={`absolute top-1/2 transform -translate-y-1/2 w-12 h-4 bg-white/20 backdrop-blur-xl border border-white/30 shadow-xl rounded-[16px] cursor-pointer transition-all duration-300 ease-in-out hover:scale-105 focus:ring-2 focus:ring-gold-400 ${
                      isDragging ? 'scale-110 border-gold/60 ring-2 ring-gold-400' : ''
                    }`}
                    style={{ left: leftPosition }}
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
                    value={volume}
                    onChange={handleVolumeChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Tekst głośności */}
              <span className="text-xs text-white/80 font-medium min-w-[40px] text-center flex-shrink-0">
                {Math.round(volume * 100)}%
              </span>
            </GlassSurface>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {isExpanded && (
        <div className="absolute top-16 left-0 bg-black/20 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-white/90 animate-in fade-in duration-200">
          {isPlaying ? 'Kliknij aby zatrzymać' : 'Kliknij aby odtworzyć'} • {getVolumeText()}
        </div>
      )}
    </div>
  );
};

export default MusicTestButton; 