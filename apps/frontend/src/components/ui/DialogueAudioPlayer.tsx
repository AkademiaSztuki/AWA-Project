import React, { useEffect, useRef } from 'react';

interface DialogueAudioPlayerProps {
  src: string;
  volume: number;
  autoPlay?: boolean;
  onEnded?: () => void;
}

let userHasInteracted = false;

if (typeof window !== 'undefined') {
  const enableAutoplay = () => {
    userHasInteracted = true;
    window.removeEventListener('click', enableAutoplay);
    window.removeEventListener('touchstart', enableAutoplay);
  };
  
  window.addEventListener('click', enableAutoplay, { once: true });
  window.addEventListener('touchstart', enableAutoplay, { once: true });
}

const DialogueAudioPlayer: React.FC<DialogueAudioPlayerProps> = ({ src, volume, autoPlay = true, onEnded }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playAttemptedRef = useRef<boolean>(false);
  const previousSrcRef = useRef<string>('');
  const retryOnInteractionRef = useRef<boolean>(false);

  // Listen for user interactions to retry audio playback on mobile
  useEffect(() => {
    if (!autoPlay) return;

    const handleUserInteraction = () => {
      userHasInteracted = true;
      // If audio is ready but not playing, try to play it
      if (audioRef.current && retryOnInteractionRef.current && autoPlay) {
        const audio = audioRef.current;
        // Wait for audio to be ready, but don't wait too long
        if (audio.paused) {
          if (audio.readyState >= 2) {
            // Audio is ready, try to play immediately
            console.log('[DialogueAudioPlayer] User interaction detected, retrying audio playback (ready)');
            playAttemptedRef.current = true;
            retryOnInteractionRef.current = false;
            audio.play().catch((error) => {
              console.warn('DialogueAudioPlayer: Play failed on interaction retry', error);
              // Keep retry flag true for next interaction
              retryOnInteractionRef.current = true;
              playAttemptedRef.current = false;
            });
          } else {
            // Audio not ready yet, wait for it
            console.log('[DialogueAudioPlayer] User interaction detected, waiting for audio to be ready');
            const tryPlayWhenReady = () => {
              if (audioRef.current && audioRef.current.readyState >= 2 && audioRef.current.paused && retryOnInteractionRef.current) {
                console.log('[DialogueAudioPlayer] Audio ready, retrying playback');
                playAttemptedRef.current = true;
                retryOnInteractionRef.current = false;
                audioRef.current.play().catch((error) => {
                  console.warn('DialogueAudioPlayer: Play failed after ready', error);
                  retryOnInteractionRef.current = true;
                  playAttemptedRef.current = false;
                });
              }
            };
            audio.addEventListener('canplay', tryPlayWhenReady, { once: true });
            // Also try after a short delay in case canplay already fired
            setTimeout(() => {
              if (audio.readyState >= 2 && audio.paused && retryOnInteractionRef.current) {
                tryPlayWhenReady();
              }
            }, 100);
          }
        }
      }
    };

    // Add listeners for various user interactions
    window.addEventListener('click', handleUserInteraction, { passive: true });
    window.addEventListener('touchstart', handleUserInteraction, { passive: true });
    window.addEventListener('touchend', handleUserInteraction, { passive: true });

    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
      window.removeEventListener('touchend', handleUserInteraction);
    };
  }, [autoPlay]);

  useEffect(() => {
    if (audioRef.current) {
      const previousSrc = previousSrcRef.current;
      const srcChanged = previousSrc !== src;
      const wasPlaying = audioRef.current && !audioRef.current.paused && audioRef.current.currentTime > 0;
      const isNearEnd = audioRef.current.duration > 0 && (audioRef.current.duration - audioRef.current.currentTime) < 0.5;
      
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'audio-debug',hypothesisId:'A20',location:'DialogueAudioPlayer.tsx:src-change',message:'Src change detected',data:{previousSrc,newSrc:src,srcChanged,wasPlaying,isNearEnd,currentTime:audioRef.current?.currentTime||0,duration:audioRef.current?.duration||0},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      
      // If src changed and previous audio was playing and not near end, wait for it to finish
      if (srcChanged && wasPlaying && !isNearEnd && previousSrc) {
        console.log('[DialogueAudioPlayer] Previous audio still playing, waiting for it to finish before changing src');
        const checkInterval = setInterval(() => {
          if (audioRef.current && (audioRef.current.paused || audioRef.current.ended || audioRef.current.currentTime >= audioRef.current.duration - 0.1)) {
            clearInterval(checkInterval);
            // Now safe to change src
            if (audioRef.current) {
              audioRef.current.src = src;
              audioRef.current.volume = volume;
              previousSrcRef.current = src;
              
              if (autoPlay) {
                audioRef.current.currentTime = 0;
                playAttemptedRef.current = false;
                retryOnInteractionRef.current = false; // Reset retry flag
                const tryPlay = () => {
                  if (audioRef.current && autoPlay && !playAttemptedRef.current) {
                    playAttemptedRef.current = true;
                    retryOnInteractionRef.current = false; // Reset retry flag when attempting to play
              audioRef.current.play().catch((error) => {
                console.warn('DialogueAudioPlayer: Auto-play blocked, waiting for interaction', error);
                // Mark that we should retry on next user interaction
                retryOnInteractionRef.current = true;
                playAttemptedRef.current = false; // Allow retry
                if (userHasInteracted) {
                  // Try immediately
                  setTimeout(() => {
                    if (audioRef.current && !audioRef.current.paused) return;
                    audioRef.current?.play().catch(() => {
                      // If still blocked, keep retryOnInteractionRef true for next interaction
                      retryOnInteractionRef.current = true;
                    });
                  }, 100);
                  // Also try after a longer delay for mobile browsers
                  setTimeout(() => {
                    if (audioRef.current && retryOnInteractionRef.current && audioRef.current.paused) {
                      audioRef.current?.play().catch(() => {
                        retryOnInteractionRef.current = true;
                      });
                    }
                  }, 500);
                }
              });
            }
          };
          if (audioRef.current.readyState >= 2) {
            tryPlay();
          } else {
            audioRef.current.addEventListener('canplay', tryPlay, { once: true });
          }
              }
            }
          }
        }, 100);
        
        // Timeout after 30 seconds to prevent infinite waiting
        setTimeout(() => {
          clearInterval(checkInterval);
          if (audioRef.current && previousSrcRef.current !== src) {
            console.warn('[DialogueAudioPlayer] Timeout waiting for previous audio, forcing src change');
            audioRef.current.src = src;
            audioRef.current.volume = volume;
            previousSrcRef.current = src;
            if (autoPlay) {
              audioRef.current.currentTime = 0;
              playAttemptedRef.current = false;
              retryOnInteractionRef.current = false; // Reset retry flag
              const tryPlay = () => {
                if (audioRef.current && autoPlay && !playAttemptedRef.current) {
                  playAttemptedRef.current = true;
                  retryOnInteractionRef.current = false; // Reset retry flag when attempting to play
                  audioRef.current.play().catch((error) => {
                    console.warn('DialogueAudioPlayer: Auto-play blocked', error);
                    // Mark that we should retry on next user interaction
                    retryOnInteractionRef.current = true;
                    playAttemptedRef.current = false; // Allow retry
                    if (userHasInteracted) {
                      // Try immediately
                      setTimeout(() => {
                        if (audioRef.current && !audioRef.current.paused) return;
                        audioRef.current?.play().catch(() => {
                          // If still blocked, keep retryOnInteractionRef true for next interaction
                          retryOnInteractionRef.current = true;
                        });
                      }, 100);
                      // Also try after a longer delay for mobile browsers
                      setTimeout(() => {
                        if (audioRef.current && retryOnInteractionRef.current && audioRef.current.paused) {
                          audioRef.current?.play().catch(() => {
                            retryOnInteractionRef.current = true;
                          });
                        }
                      }, 500);
                    }
                  });
                }
              };
              if (audioRef.current.readyState >= 2) {
                tryPlay();
              } else {
                audioRef.current.addEventListener('canplay', tryPlay, { once: true });
              }
            }
          }
        }, 30000);
        
        return () => clearInterval(checkInterval);
      } else {
        // Normal case: src didn't change or previous audio finished/near end
        audioRef.current.src = src;
        audioRef.current.volume = volume;
        previousSrcRef.current = src;

        if (autoPlay) {
          audioRef.current.currentTime = 0;
          playAttemptedRef.current = false;
          retryOnInteractionRef.current = false; // Reset retry flag

          const tryPlay = () => {
            if (audioRef.current && autoPlay && !playAttemptedRef.current) {
              playAttemptedRef.current = true;
              retryOnInteractionRef.current = false; // Reset retry flag when attempting to play
              audioRef.current.play().catch((error) => {
                console.warn('DialogueAudioPlayer: Auto-play blocked, waiting for interaction', error);
                // Mark that we should retry on next user interaction
                retryOnInteractionRef.current = true;
                playAttemptedRef.current = false; // Allow retry
                // Retry on interaction if blocked - try multiple times for mobile
                if (userHasInteracted) {
                  // Try immediately
                  setTimeout(() => {
                    if (audioRef.current && !audioRef.current.paused) return;
                    audioRef.current?.play().catch(() => {
                      // If still blocked, keep retryOnInteractionRef true for next interaction
                      retryOnInteractionRef.current = true;
                    });
                  }, 100);
                  // Also try after a longer delay for mobile browsers
                  setTimeout(() => {
                    if (audioRef.current && retryOnInteractionRef.current && audioRef.current.paused) {
                      audioRef.current?.play().catch(() => {
                        retryOnInteractionRef.current = true;
                      });
                    }
                  }, 500);
                }
              });
            }
          };

          if (audioRef.current.readyState >= 2) {
            tryPlay();
          } else {
            audioRef.current.addEventListener('canplay', tryPlay, { once: true });
          }
        } else {
          audioRef.current.pause();
        }
      }
    }
  }, [src, autoPlay, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !onEnded) return;
    
    const handleEnded = () => {
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'audio-debug',hypothesisId:'A19',location:'DialogueAudioPlayer.tsx:audio-ended',message:'Audio ended event fired',data:{src,currentTime:audio.currentTime,duration:audio.duration,ended:audio.ended},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      // Reset retry flag when audio ends
      retryOnInteractionRef.current = false;
      playAttemptedRef.current = false;
      onEnded();
    };
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [onEnded, src]);

  return (
    <audio ref={audioRef} style={{ display: 'none' }} />
  );
};

export default DialogueAudioPlayer;
