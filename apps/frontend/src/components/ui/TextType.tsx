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
  typingSpeed = 50,
  initialDelay = 0,
  pauseDuration = 2000,
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

  const textArray = useMemo(() => (Array.isArray(text) ? text : [text]), [text]);
  const currentFullText = textArray[currentTextIndex] || "";

  // Resetuj stan gdy zmienia się tekst wejściowy (np. z zewnątrz)
  useEffect(() => {
    const textChanged = JSON.stringify(text) !== JSON.stringify(prevTextRef.current);
    if (textChanged) {
      // Natychmiast ukryj tekst podczas przejścia
      setIsTransitioning(true);
      setCurrentIndex(0);
      setIsDeleting(false);
      setCurrentTextIndex(0);
      // Krótkie opóźnienie przed rozpoczęciem nowej animacji
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
      prevTextRef.current = text;
      return () => clearTimeout(timer);
    }
  }, [JSON.stringify(text)]);

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
          timeout = setTimeout(() => {
            setCurrentIndex((prev) => prev + 1);
          }, variableSpeed ? getRandomSpeed() : typingSpeed);
        } else {
          // Tekst skończony
          timeout = setTimeout(() => {
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

    return () => clearTimeout(timeout);
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
