"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";

interface VariableSpeed {
  min: number;
  max: number;
}

interface TextTypeProps {
  text: string | string[];
  as?: keyof JSX.IntrinsicElements;
  typingSpeed?: number;
  initialDelay?: number;
  pauseDuration?: number;
  deletingSpeed?: number;
  loop?: boolean;
  className?: string;
  showCursor?: boolean;
  hideCursorWhileTyping?: boolean;
  cursorCharacter?: string;
  cursorClassName?: string;
  cursorBlinkDuration?: number;
  textColors?: string[];
  variableSpeed?: VariableSpeed;
  onSentenceComplete?: (sentence: string, index: number) => void;
  startOnVisible?: boolean;
  reverseMode?: boolean;
  [key: string]: any;
}

const TextType = ({
  text,
  as: Component = "div",
  typingSpeed = 20,
  initialDelay = 10,
  pauseDuration = 200,
  deletingSpeed = 30,
  loop = true,
  className = "",
  showCursor = true,
  hideCursorWhileTyping = false,
  cursorCharacter = "|",
  cursorClassName = "",
  cursorBlinkDuration = 0.8,
  textColors = [],
  variableSpeed,
  onSentenceComplete,
  startOnVisible = false,
  reverseMode = false,
  ...props
}: TextTypeProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(!startOnVisible);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLElement>(null);
  const prevTextRef = useRef<string | string[]>(text);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const currentIndexRef = useRef<number>(0);
  const instanceIdRef = useRef<string>(
    `tt_${Date.now()}_${Math.random().toString(16).slice(2)}`
  );

  const textArray = useMemo(() => (Array.isArray(text) ? text : [text]), [text]);
  const currentFullText = textArray[currentTextIndex] || "";

  // #region agent log
  useEffect(() => {
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'audio-debug',hypothesisId:'H5',location:'TextType.tsx:mount',message:'TextType mounted V5',data:{instanceId:instanceIdRef.current,textType:Array.isArray(text)?'array':'string',textArrayLen:textArray.length,currentTextIndex,fullLen:currentFullText.length,typingSpeed,initialDelay,pauseDuration,loop,startOnVisible,reverseMode},timestamp:Date.now()})}).catch(()=>{});
    return () => {
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'audio-debug',hypothesisId:'H5',location:'TextType.tsx:unmount',message:'TextType unmounted V5',data:{instanceId:instanceIdRef.current,currentTextIndex,fullLen:currentFullText.length,currentIndex:currentIndexRef.current,isDeleting,isVisible,isTransitioning},timestamp:Date.now()})}).catch(()=>{});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // #endregion

  // Resetuj stan gdy zmienia się tekst wejściowy (np. z zewnątrz)
  useEffect(() => {
    const textChanged = JSON.stringify(text) !== JSON.stringify(prevTextRef.current);
    if (textChanged) {
      // Sprawdź czy nowy tekst jest rozszerzeniem poprzedniego
      const prevStr = Array.isArray(prevTextRef.current) ? prevTextRef.current.join('') : String(prevTextRef.current ?? '');
      const nextStr = Array.isArray(text) ? text.join('') : String(text ?? '');
      
      const isExtension = prevStr && nextStr.startsWith(prevStr) && nextStr.length > prevStr.length;
      
      if (isExtension) {
        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H6',location:'TextType.tsx:text-extended',message:'TextType input text extended -> NOT resetting',data:{instanceId:instanceIdRef.current,prevLen:prevStr.length,nextLen:nextStr.length,currentIndex:currentIndexRef.current},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        // Nie resetujemy! Pozwalamy animacji kontynuować od obecnego miejsca
        prevTextRef.current = text;
        return;
      }

      // #region agent log
      const prevWasArray = Array.isArray(prevTextRef.current);
      const nextIsArray = Array.isArray(text);
      const prevLen = prevWasArray ? (prevTextRef.current as string[]).join('\n').length : String(prevTextRef.current ?? '').length;
      const nextLen = nextIsArray ? (text as string[]).join('\n').length : String(text ?? '').length;
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H6',location:'TextType.tsx:text-changed',message:'TextType input text changed -> resetting',data:{instanceId:instanceIdRef.current,prevWasArray,nextIsArray,prevLen,nextLen,beforeCurrentIndex:currentIndexRef.current,beforeCurrentTextIndex:currentTextIndex,isDeleting,isVisible,isTransitioning},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      // Natychmiast ukryj tekst podczas przejścia
      setIsTransitioning(true);
      setCurrentIndex(0);
      currentIndexRef.current = 0;
      setIsDeleting(false);
      setCurrentTextIndex(0);
      // Natychmiastowe rozpoczęcie nowej animacji (bez opóźnienia)
      setIsTransitioning(false);
      prevTextRef.current = text;
    }
  }, [JSON.stringify(text)]);
  
  // Synchronizuj ref z currentIndex
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const getRandomSpeed = () => {
    if (!variableSpeed) return typingSpeed;
    const { min, max } = variableSpeed;
    return Math.random() * (max - min) + min;
  };

  useEffect(() => {
    if (!startOnVisible || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [startOnVisible]);

  useEffect(() => {
    if (!isVisible || isTransitioning) return;

    let timeout: NodeJS.Timeout;

    const animate = () => {
      const currentLength = currentFullText.length;

      if (isDeleting) {
        if (currentIndex > 0) {
          timeout = setTimeout(() => {
            setCurrentIndex((prev) => prev - 1);
          }, deletingSpeed);
        } else {
          setIsDeleting(false);
          const nextTextIndex = (currentTextIndex + 1) % textArray.length;
          
          if (!loop && nextTextIndex === 0 && textArray.length > 1) {
             return;
          }

          setCurrentTextIndex(nextTextIndex);
          timeout = setTimeout(animate, 500);
        }
      } else {
        if (currentIndex < currentLength) {
          // Użyj requestAnimationFrame dla szybszej animacji pisania
          const speed = variableSpeed ? getRandomSpeed() : typingSpeed;
          
          // Precyzyjny przelicznik: używa dokładnej wartości speed (obsługuje wartości dziesiętne)
          // Dla małych wartości wyświetlaj więcej znaków na raz, dla większych mniej
          let charsPerFrame: number;
          let frameTime: number;
          
          if (speed <= 5) {
            // Bardzo szybkie: wyświetlaj 4-8 znaków na raz, co 16ms (naturalne dla requestAnimationFrame)
            charsPerFrame = Math.max(4, Math.floor(40 / speed));
            frameTime = 16;
          } else if (speed <= 14) {
            // Średnie: wyświetlaj 2-3 znaki na raz, co dokładnie speed ms (obsługuje wartości dziesiętne)
            charsPerFrame = Math.max(2, Math.floor(30 / speed));
            frameTime = speed; // Dokładna wartość, może być np. 12.5ms
          } else {
            // Wolne i przejściowe: wyświetlaj po 1 znaku, co dokładnie speed ms (obsługuje wartości dziesiętne)
            // Teraz możesz użyć np. 15.5, 16.3, 20.7 itp. dla precyzyjnej kontroli
            charsPerFrame = 1;
            frameTime = speed; // Dokładna wartość, może być np. 15.5ms, 16.3ms
          }
          
          const animateTyping = (currentTime: number) => {
            if (lastTimeRef.current === 0) {
              lastTimeRef.current = currentTime;
            }
            
            const elapsed = currentTime - lastTimeRef.current;
            const currentIdx = currentIndexRef.current;
            
            if (elapsed >= frameTime && currentIdx < currentLength) {
              // Wyświetl znaki zgodnie z przelicznikiem
              const next = Math.min(currentIdx + charsPerFrame, currentLength);
              lastTimeRef.current = currentTime;
              setCurrentIndex(next);
              currentIndexRef.current = next;
              
              // Kontynuuj animację jeśli jeszcze nie skończyliśmy
              if (next < currentLength) {
                animationFrameRef.current = requestAnimationFrame(animateTyping);
              } else {
                animationFrameRef.current = null;
                lastTimeRef.current = 0;
              }
            } else if (currentIdx < currentLength) {
              // Kontynuuj animację
              animationFrameRef.current = requestAnimationFrame(animateTyping);
            } else {
              animationFrameRef.current = null;
              lastTimeRef.current = 0;
            }
          };
          
          // Resetuj czas i rozpocznij animację
          lastTimeRef.current = 0;
          animationFrameRef.current = requestAnimationFrame(animateTyping);
        } else {
          // Tekst skończony
          timeout = setTimeout(() => {
            // #region agent log
            void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'audio-debug',hypothesisId:'H7',location:'TextType.tsx:finished',message:'TextType finished currentFullText V5',data:{instanceId:instanceIdRef.current,currentTextIndex,fullLen:currentFullText.length,finalIndex:currentIndexRef.current,loop,textArrayLen:textArray.length},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            if (onSentenceComplete) {
              onSentenceComplete(currentFullText, currentTextIndex);
            }

            // Automatyczne zapętlenie tylko jeśli mamy listę tekstów wewnętrznie
            if (textArray.length > 1 && (loop || currentTextIndex < textArray.length - 1)) {
               setIsDeleting(true);
            }
          }, pauseDuration);
        }
      }
    };

    if (currentIndex === 0 && !isDeleting && initialDelay > 0 && currentTextIndex === 0) {
        timeout = setTimeout(animate, initialDelay);
    } else {
        animate();
    }

    return () => {
      clearTimeout(timeout);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastTimeRef.current = 0;
    };
  }, [
    currentIndex, 
    isDeleting, 
    currentTextIndex, 
    isVisible, 
    textArray, 
    typingSpeed, 
    deletingSpeed, 
    pauseDuration, 
    loop,
    initialDelay,
    currentFullText,
    onSentenceComplete,
    variableSpeed,
    isTransitioning
  ]);

  const textColor = textColors.length > 0 
    ? textColors[currentTextIndex % textColors.length] 
    : undefined;

  return React.createElement(
    Component,
    {
      ref: containerRef,
      className: `text-type ${reverseMode ? 'text-type-rtl' : ''} ${className}`,
      style: { 
        color: textColor, 
        position: 'relative', 
        ...props.style 
      },
      "aria-label": currentFullText,
      "aria-live": "polite",
      "aria-atomic": "false",
      ...props,
    },
    <>
      {/* Renderujemy tekst znak po znaku, zachowując miejsce na niewidoczne znaki */}
      {currentFullText.split("").map((char, index) => {
        const isVisibleChar = index < currentIndex;
        // Force spaces to be visible (opacity 1) to prevent layout collapsing
        // even if "invisible" to user, it must be "visible" to layout engine.
        // Although opacity: 0 usually preserves layout, some browsers/engines might quirk on spaces.
        const isSpace = char === ' ';
        // Podczas przejścia ukryj wszystkie znaki natychmiast
        const isActuallyVisible = !isTransitioning && (isVisibleChar || isSpace);
        
        const isCursorPosition = index === currentIndex; // Kursor jest PRZED tym znakiem (lub na jego miejscu)

        return (
          <React.Fragment key={index}>
            <span 
                style={{ 
                    opacity: isActuallyVisible ? 1 : 0,
                    position: 'relative',
                    transition: isTransitioning ? 'opacity 0.05s' : 'none'
                }}
            >
                {char}
                
                {isCursorPosition && showCursor && !hideCursorWhileTyping && !isTransitioning && (
                   <span 
                        style={{
                            position: 'absolute',
                            left: 0, // Kursor po lewej stronie znaku
                            bottom: 0,
                            width: '1px', // Minimalna szerokość wizualna
                            height: '1.2em',
                            backgroundColor: 'currentColor', // Kolor tekstu
                            animation: `blink ${cursorBlinkDuration}s step-end infinite`,
                            pointerEvents: 'none'
                        }}
                        className={cursorClassName}
                   />
                )}
            </span>
          </React.Fragment>
        );
      })}
      
      {/* Kursor na samym końcu tekstu (po ostatnim znaku) */}
      {currentIndex === currentFullText.length && showCursor && !isTransitioning && (
         <span style={{ position: 'relative', display: 'inline-block', width: 0 }}>
             <span 
                style={{
                    position: 'absolute',
                    left: 0,
                    bottom: 0,
                    width: '1px', // Minimalna szerokość
                    height: '1.2em',
                    backgroundColor: 'currentColor',
                    animation: `blink ${cursorBlinkDuration}s step-end infinite`
                }}
                className={cursorClassName}
             />
         </span>
      )}
      
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .text-type-rtl {
            direction: rtl;
        }
      `}</style>
    </>
  );
};

export default TextType;
