"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export const marketingNavLinkClass =
  "shrink-0 whitespace-nowrap px-1.5 py-1 font-modern text-[11px] text-graphite/80 underline-offset-4 transition-colors hover:text-graphite hover:underline sm:px-2 sm:text-xs";

/** Mobile drawer — warm dark glass + light copy (matches header / gold UI). */
export const mobileDrawerItemClass =
  "flex min-h-[52px] items-center rounded-xl px-3 py-3 font-modern text-base font-semibold text-pearl-50 transition-colors hover:bg-white/10 hover:text-gold-400 active:bg-white/15";

export const mobileDrawerSectionLabelClass =
  "mb-2 px-3 font-modern text-xs font-semibold uppercase tracking-[0.14em] text-gold-500/85";

export const mobileDrawerTitleClass =
  "font-modern text-xl font-semibold tracking-tight text-pearl-50";

export const mobileDrawerBorderClass = "border-white/20";

export const marketingNavLinkStackedClass = mobileDrawerItemClass;

type MarketingNavLinksProps = {
  stacked?: boolean;
  onNavigate?: () => void;
};

export function MarketingNavLinks({ stacked = false, onNavigate }: MarketingNavLinksProps) {
  const { tp } = useLanguage();
  const linkClass = stacked ? marketingNavLinkStackedClass : marketingNavLinkClass;

  return (
    <nav
      className={cn(
        stacked ? "flex flex-col gap-0.5" : "flex shrink-0 items-center gap-0.5 sm:gap-1"
      )}
      aria-label={tp("Linki informacyjne", "Site links")}
    >
      <Link href="/subscription/plans" className={linkClass} onClick={onNavigate}>
        {tp("Cennik", "Pricing")}
      </Link>
      <Link href="/o-projecie" className={linkClass} onClick={onNavigate}>
        {tp("O projekcie", "About")}
      </Link>
      <Link href="/contact" className={linkClass} onClick={onNavigate}>
        {tp("Kontakt", "Contact")}
      </Link>
    </nav>
  );
}
