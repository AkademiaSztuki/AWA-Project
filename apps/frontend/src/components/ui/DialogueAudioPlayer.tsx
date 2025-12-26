import React, { useEffect, useRef } from 'react';

interface DialogueAudioPlayerProps {
  src: string;
  volume: number;
  autoPlay?: boolean;
  onEnded?: () => void;
}

const DialogueAudioPlayer: React.FC<DialogueAudioPlayerProps> = ({ src, volume, autoPlay = true, onEnded }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevSrcRef = useRef<string | null>(null);

  // console.log('DialogueAudioPlayer: Rendering with props:', { src, volume, autoPlay });

  // Ustaw src i volume na każdą zmianę
  useEffect(() => {
    // console.log('DialogueAudioPlayer: audioRef.current exists:', !!audioRef.current);
    if (audioRef.current) {
      const prevSrc = prevSrcRef.current;
      prevSrcRef.current = src;
      // console.log('DialogueAudioPlayer: Setting src and volume:', { src, volume });
      
      // Stop current playback before changing src
      if (!audioRef.current.paused) {
        audioRef.current.pause();
      }
      
      audioRef.current.src = src;
      audioRef.current.volume = volume;
      
      if (autoPlay) {
        audioRef.current.currentTime = 0;
        // Wait for load before playing
        audioRef.current.addEventListener('canplay', () => {
          if (audioRef.current && autoPlay) {
            // #region agent log
            void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3',location:'DialogueAudioPlayer.tsx:canplay->play',message:'Attempting dialogue play after canplay',data:{src,prevSrc,paused:audioRef.current?.paused,readyState:audioRef.current?.readyState,currentTime:audioRef.current?.currentTime,volume:audioRef.current?.volume},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            audioRef.current.play().catch((error) => {
              // #region agent log
              void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4',location:'DialogueAudioPlayer.tsx:play:catch',message:'Dialogue play() rejected',data:{src,prevSrc,name:(error as any)?.name,message:(error as any)?.message},timestamp:Date.now()})}).catch(()=>{});
              // #endregion
              console.error('DialogueAudioPlayer: Failed to play audio:', error);
            });
          }
        }, { once: true });
      }
    }
  }, [src, autoPlay]);

  // Synchronizuj volume na każdą zmianę
  useEffect(() => {
    if (audioRef.current) {
      // console.log('DialogueAudioPlayer: Syncing volume to:', volume);
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Event telemetry (pause/ended/error)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const report = (event: string, extra?: Record<string, unknown>) => {
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'DialogueAudioPlayer.tsx:audio-event',message:`Dialogue audio event: ${event}`,data:{src:audio.currentSrc||src,paused:audio.paused,ended:audio.ended,readyState:audio.readyState,currentTime:audio.currentTime,duration:audio.duration,volume:audio.volume,...(extra||{})},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    };

    const onPause = () => report('pause');
    const onEndedInternal = () => report('ended');
    const onError = () => report('error');

    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEndedInternal);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEndedInternal);
      audio.removeEventListener('error', onError);
    };
  }, [src]);

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