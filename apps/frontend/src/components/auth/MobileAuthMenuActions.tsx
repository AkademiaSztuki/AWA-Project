"use client";

import React from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  marketingNavLinkStackedClass,
  mobileDrawerBorderClass,
  mobileDrawerSectionLabelClass,
} from "@/components/ui/MarketingNavLinks";
import { cn } from "@/lib/utils";

type MobileAuthMenuActionsProps = {
  onNavigate?: () => void;
  onOpenLoginModal?: (mode: "login" | "register") => void;
};

export function MobileAuthMenuActions({
  onNavigate,
  onOpenLoginModal,
}: MobileAuthMenuActionsProps) {
  const { user, signOut, isLoading } = useAuth();
  const { language } = useLanguage();

  const signInLabel = language === "pl" ? "Zaloguj" : "Sign in";
  const registerLabel = language === "pl" ? "Zarejestruj się" : "Sign up";
  const signOutLabel = language === "pl" ? "Wyloguj" : "Sign out";
  const loadingLabel = language === "pl" ? "Ładowanie…" : "Loading…";
  const sectionLabel = language === "pl" ? "Konto" : "Account";

  const openModal = (mode: "login" | "register") => {
    onOpenLoginModal?.(mode);
  };

  const handleSignOut = async () => {
    onNavigate?.();
    await signOut();
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  return (
    <>
      <section className={cn("border-b pb-4", mobileDrawerBorderClass)} aria-label={sectionLabel}>
        <p className={mobileDrawerSectionLabelClass}>
          {sectionLabel}
        </p>
        {isLoading ? (
          <button
            type="button"
            disabled
            className={cn(marketingNavLinkStackedClass, "w-full opacity-70")}
          >
            {loadingLabel}
          </button>
        ) : user ? (
          <button
            type="button"
            onClick={handleSignOut}
            className={cn(marketingNavLinkStackedClass, "w-full gap-3")}
          >
            <LogOut size={18} aria-hidden="true" />
            {signOutLabel}
          </button>
        ) : (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => openModal("login")}
              className={cn(marketingNavLinkStackedClass, "w-full text-left")}
            >
              {signInLabel}
            </button>
            <button
              type="button"
              onClick={() => openModal("register")}
              className={cn(marketingNavLinkStackedClass, "w-full text-left")}
            >
              {registerLabel}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
