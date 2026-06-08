"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { PathSelectionButton } from "./PathSelectionButton";
import { DashboardButton } from "./DashboardButton";
import { ColorAdjustmentPanel } from "./ColorAdjustmentPanel";
import {
  MarketingNavLinks,
  mobileDrawerBorderClass,
  mobileDrawerTitleClass,
} from "./MarketingNavLinks";
import { MobileAuthMenuActions } from "@/components/auth/MobileAuthMenuActions";
import { LoginModal } from "@/components/auth/LoginModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useOverlayDismiss } from "@/hooks/useOverlayDismiss";
import { cn } from "@/lib/utils";
import {
  MOBILE_GLASS_SHEET_BACKDROP,
  MOBILE_GLASS_SHEET_CLOSE_BUTTON,
  MOBILE_GLASS_SHEET_CLOSE_ICON_SIZE,
  MOBILE_GLASS_SHEET_HEADER,
  MOBILE_GLASS_SHEET_ROOT,
  MOBILE_GLASS_SHEET_SCROLL,
  MOBILE_GLASS_SHEET_SHELL,
} from "@/lib/mobile-glass-sheet";

type GlassHeaderMobileDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  showPathSelection: boolean;
  showDashboard: boolean;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
};

export function GlassHeaderMobileDrawer({
  isOpen,
  onClose,
  showPathSelection,
  showDashboard,
  returnFocusRef,
}: GlassHeaderMobileDrawerProps) {
  const { tp } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState<"login" | "register">("login");

  useEffect(() => {
    setMounted(true);
  }, []);

  useOverlayDismiss({
    isOpen,
    onClose,
    containerRef: shellRef,
    returnFocusRef,
    closeOnOutsideClick: false,
  });

  useFocusTrap(panelRef, isOpen, { initialFocus: closeButtonRef });

  const openLoginModal = (mode: "login" | "register") => {
    setLoginModalMode(mode);
    setLoginModalOpen(true);
    onClose();
  };

  if (!mounted) return null;

  const transition = reduceMotion ? { duration: 0 } : { duration: 0.25, ease: "easeOut" as const };

  return createPortal(
    <>
    <AnimatePresence>
      {isOpen && (
        <div
          key="mobile-nav-drawer"
          ref={shellRef}
          data-app-overlay="true"
          data-overlay-layer="drawer"
          className={cn(MOBILE_GLASS_SHEET_SHELL, "z-[9990]")}
        >
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            className={cn("z-0", MOBILE_GLASS_SHEET_BACKDROP)}
            aria-label={tp("Zamknij menu", "Close menu")}
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            id="glass-header-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-nav-title"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={transition}
            className={cn(MOBILE_GLASS_SHEET_ROOT, "text-pearl-50")}
            data-app-overlay="true"
            data-overlay-layer="drawer"
          >
            <div className={cn(MOBILE_GLASS_SHEET_HEADER, "border-b pb-4", mobileDrawerBorderClass)}>
              <h2 id="mobile-nav-title" className={mobileDrawerTitleClass}>
                {tp("Menu", "Menu")}
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className={MOBILE_GLASS_SHEET_CLOSE_BUTTON}
                aria-label={tp("Zamknij menu", "Close menu")}
              >
                <X size={MOBILE_GLASS_SHEET_CLOSE_ICON_SIZE} aria-hidden="true" />
              </button>
            </div>

            <div className={cn(MOBILE_GLASS_SHEET_SCROLL, "px-1 py-2 sm:px-2")}>
              {(showPathSelection || showDashboard) && (
                <section className={cn("flex flex-col gap-1 border-b pb-4", mobileDrawerBorderClass)}>
                  {showPathSelection && (
                    <div className="w-full">
                      <PathSelectionButton variant="menuRow" onNavigate={onClose} />
                    </div>
                  )}
                  {showDashboard && (
                    <div className="w-full">
                      <DashboardButton variant="menuRow" onNavigate={onClose} />
                    </div>
                  )}
                </section>
              )}

              <section className={cn("border-b pb-4", mobileDrawerBorderClass)}>
                <MarketingNavLinks stacked onNavigate={onClose} />
              </section>

              <MobileAuthMenuActions onNavigate={onClose} onOpenLoginModal={openLoginModal} />

              <section className="pt-1">
                <DrawerToolRow label={tp("Dostępność", "Accessibility")}>
                  <ColorAdjustmentPanel preferSheetLayout />
                </DrawerToolRow>
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    <LoginModal
      isOpen={loginModalOpen}
      onClose={() => setLoginModalOpen(false)}
      initialMode={loginModalMode}
    />
    </>,
    document.body
  );
}

function DrawerToolRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3 rounded-xl px-1">
      <span className="font-modern text-base font-semibold text-pearl-50">{label}</span>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
