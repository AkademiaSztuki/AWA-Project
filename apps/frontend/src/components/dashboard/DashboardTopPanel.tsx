'use client';

import type { MouseEvent, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Home, Image as ImageIcon, Plus, Sparkles } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';

type DashboardTopPanelProps = {
  language: 'pl' | 'en';
  onAddSpace: () => void;
  spacesCount: number;
  generatedCount: number;
  inspirationsCount: number;
  creditsSlot: ReactNode;
};

export function DashboardTopPanel({
  language,
  onAddSpace,
  spacesCount,
  generatedCount,
  inspirationsCount,
  creditsSlot,
}: DashboardTopPanelProps) {
  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);
  const hasCredits = creditsSlot != null;

  const stats = [
    {
      href: '#dashboard-rooms',
      icon: Home,
      value: spacesCount,
      label: t('Pokoje', 'Rooms'),
      desktopBlock: 'start' as ScrollLogicalPosition,
    },
    {
      href: '#dashboard-generated-images',
      icon: ImageIcon,
      value: generatedCount,
      label: t('Obrazy', 'Images'),
      desktopBlock: 'center' as ScrollLogicalPosition,
    },
    {
      href: '#dashboard-inspirations',
      icon: Sparkles,
      value: inspirationsCount,
      label: t('Inspiracje', 'Inspirations'),
      desktopBlock: 'center' as ScrollLogicalPosition,
    },
  ];

  const handleStatClick = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
    desktopBlock: ScrollLogicalPosition,
  ) => {
    const target = document.querySelector(href);
    if (!target) return;

    event.preventDefault();
    const isDesktop = window.matchMedia('(min-width: 1280px)').matches;
    target.scrollIntoView({ behavior: 'smooth', block: isDesktop ? desktopBlock : 'start' });
    window.history.replaceState(null, '', href);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="mb-6"
    >
      <GlassCard
        variant="flatOnMobile"
        className="overflow-hidden border border-gold/20 p-5 sm:p-6 lg:p-7"
      >
        <div
          className={
            hasCredits
              ? 'grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 lg:items-start'
              : 'grid grid-cols-1'
          }
        >
          <div className={hasCredits ? 'min-w-0 lg:col-span-7' : 'min-w-0'}>
            <h1 className="font-nasalization text-2xl leading-tight text-graphite sm:text-3xl">
              {t('Co chcesz wygenerować?', 'What do you want to generate?')}
            </h1>
            <p className="mt-2 font-modern text-sm leading-relaxed text-silver-dark sm:text-base">
              {t(
                'Dodaj pomieszczenie i przejdź do konfiguracji — stamtąd uruchomisz generowanie wnętrza.',
                'Add a room and continue setup—that’s where you start interior generation.',
              )}
            </p>
            <GlassButton
              type="button"
              onClick={onAddSpace}
              className="mt-4 w-full min-[480px]:w-auto min-[480px]:min-w-[200px] px-5 py-3 text-sm sm:px-6 sm:py-3.5"
            >
              <Plus size={20} className="mr-2 flex-shrink-0" aria-hidden />
              {t('Dodaj pomieszczenie', 'Add a room')}
            </GlassButton>
          </div>

          {hasCredits && (
            <div className="min-w-0 lg:col-span-5">{creditsSlot}</div>
          )}
        </div>

        <div className="mt-6 border-t border-gold/15 pt-6">
          <p className="mb-3 text-[10px] font-modern font-semibold uppercase tracking-wider text-silver-dark/90">
            {t('Podsumowanie', 'At a glance')}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {stats.map(({ href, icon: Icon, value, label, desktopBlock }) => (
              <a
                key={href}
                href={href}
                onClick={(e) => handleStatClick(e, href, desktopBlock)}
                className="group block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                aria-label={t(`Przejdź do sekcji: ${label}`, `Jump to section: ${label}`)}
              >
                <div className="min-h-0 rounded-2xl border border-white/12 bg-white/[0.05] p-2.5 transition-all duration-200 group-hover:border-gold/40 group-hover:bg-white/[0.1] sm:p-3.5">
                  <div className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:items-center sm:gap-2.5 sm:text-left">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-champagne sm:h-9 sm:w-9">
                      <Icon size={15} className="text-white sm:h-4 sm:w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-nasalization text-lg leading-none text-graphite sm:text-xl">
                        {value}
                      </p>
                      <p className="truncate text-[9px] font-modern text-silver-dark sm:text-[11px]">
                        {label}
                      </p>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
