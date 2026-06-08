"use client";

import { useEffect, useRef, type RefObject } from "react";

export const APP_OVERLAY_SELECTOR = '[data-app-overlay="true"]';

type UseOverlayDismissOptions = {
  isOpen: boolean;
  onClose: () => void;
  containerRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  lockScroll?: boolean;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
};

function isInsideAppOverlay(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(APP_OVERLAY_SELECTOR));
}

export function useOverlayDismiss({
  isOpen,
  onClose,
  containerRef,
  returnFocusRef,
  lockScroll = true,
  closeOnEscape = true,
  closeOnOutsideClick = true,
}: UseOverlayDismissOptions) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    if (lockScroll) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      if (lockScroll) {
        document.body.style.overflow = previousOverflow;
      }
    };
  }, [isOpen, lockScroll]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (!closeOnEscape || event.key !== "Escape") return;

      if (document.querySelector('[data-overlay-layer="tool"]')) return;

      onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, closeOnEscape, containerRef]);

  useEffect(() => {
    if (!isOpen || !closeOnOutsideClick) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (isInsideAppOverlay(target)) return;
      if (containerRef?.current?.contains(target as Node)) return;
      onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen, onClose, closeOnOutsideClick, containerRef]);

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      return;
    }
    if (!wasOpenRef.current) return;
    wasOpenRef.current = false;
    returnFocusRef?.current?.focus();
  }, [isOpen, returnFocusRef]);
}
