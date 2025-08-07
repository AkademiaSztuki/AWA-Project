import React, { useEffect, useRef } from 'react';

interface DialogueAudioPlayerProps {
  src: string;
  volume: number;
  autoPlay?: boolean;
  onEnded?: () => void;
}

const DialogueAudioPlayer: React.FC<DialogueAudioPlayerProps> = ({ src, volume, autoPlay = true, onEnded }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  console.log('DialogueAudioPlayer: Rendering with props:', { src, volume, autoPlay });

  // Ustaw src i volume na każdą zmianę
  useEffect(() => {
    console.log('DialogueAudioPlayer: audioRef.current exists:', !!audioRef.current);
    if (audioRef.current) {
      console.log('DialogueAudioPlayer: Setting src and volume:', { src, volume });
      audioRef.current.src = src;
      audioRef.current.volume = volume;
      if (autoPlay) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((error) => {
          console.error('DialogueAudioPlayer: Failed to play audio:', error);
        });
      }
    }
  }, [src, autoPlay]);

  // Synchronizuj volume na każdą zmianę
  useEffect(() => {
    if (audioRef.current) {
      console.log('DialogueAudioPlayer: Syncing volume to:', volume);
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Obsługa zakończenia
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !onEnded) return;
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('ended', onEnded);
    };
  }, [onEnded, src]);

  return (
    <audio ref={audioRef} style={{ display: 'none' }} data-type="dialogue" />
  );
};

export default DialogueAudioPlayer;