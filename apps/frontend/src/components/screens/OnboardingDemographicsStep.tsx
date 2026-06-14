"use client";

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, GlassButton } from '@/components/ui';
import { EducationSelect } from '@/components/setup/EducationSelect';
import { useLanguage } from '@/contexts/LanguageContext';
import { GLASS_CARD_DESKTOP_GROW_STEP } from '@/lib/flow/glass-step-layout';

export type OnboardingDemographicsData = {
  ageRange: string;
  gender: string;
  education: string;
  country: string;
};

const COUNTRY_OPTIONS = [
  { code: 'PL', label: { pl: 'Polska', en: 'Poland' } },
  { code: 'DE', label: { pl: 'Niemcy', en: 'Germany' } },
  { code: 'CZ', label: { pl: 'Czechy', en: 'Czech Republic' } },
  { code: 'SK', label: { pl: 'Słowacja', en: 'Slovakia' } },
  { code: 'UA', label: { pl: 'Ukraina', en: 'Ukraine' } },
  { code: 'GB', label: { pl: 'Wielka Brytania', en: 'United Kingdom' } },
  { code: 'IE', label: { pl: 'Irlandia', en: 'Ireland' } },
  { code: 'SE', label: { pl: 'Szwecja', en: 'Sweden' } },
  { code: 'NO', label: { pl: 'Norwegia', en: 'Norway' } },
  { code: 'FI', label: { pl: 'Finlandia', en: 'Finland' } },
  { code: 'DK', label: { pl: 'Dania', en: 'Denmark' } },
  { code: 'FR', label: { pl: 'Francja', en: 'France' } },
  { code: 'ES', label: { pl: 'Hiszpania', en: 'Spain' } },
  { code: 'PT', label: { pl: 'Portugalia', en: 'Portugal' } },
  { code: 'IT', label: { pl: 'Włochy', en: 'Italy' } },
  { code: 'NL', label: { pl: 'Holandia', en: 'Netherlands' } },
  { code: 'BE', label: { pl: 'Belgia', en: 'Belgium' } },
  { code: 'AT', label: { pl: 'Austria', en: 'Austria' } },
  { code: 'CH', label: { pl: 'Szwajcaria', en: 'Switzerland' } },
  { code: 'LT', label: { pl: 'Litwa', en: 'Lithuania' } },
  { code: 'LV', label: { pl: 'Łotwa', en: 'Latvia' } },
  { code: 'EE', label: { pl: 'Estonia', en: 'Estonia' } },
  { code: 'US', label: { pl: 'Stany Zjednoczone', en: 'United States' } },
  { code: 'CA', label: { pl: 'Kanada', en: 'Canada' } },
  { code: 'AU', label: { pl: 'Australia', en: 'Australia' } },
  { code: 'NZ', label: { pl: 'Nowa Zelandia', en: 'New Zealand' } },
  { code: 'RO', label: { pl: 'Rumunia', en: 'Romania' } },
  { code: 'HU', label: { pl: 'Węgry', en: 'Hungary' } },
  { code: 'HR', label: { pl: 'Chorwacja', en: 'Croatia' } },
  { code: 'SI', label: { pl: 'Słowenia', en: 'Slovenia' } },
  { code: 'BG', label: { pl: 'Bułgaria', en: 'Bulgaria' } },
  { code: 'GR', label: { pl: 'Grecja', en: 'Greece' } },
];

function CountrySelect({
  value,
  onChange,
  language,
}: {
  value: string;
  onChange: (code: string) => void;
  language: 'pl' | 'en';
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel =
    COUNTRY_OPTIONS.find((option) => option.code === value)?.label[language] ?? value;
  const countryRootRef = useRef<HTMLDivElement>(null);

  const handleCountryRootBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null;
    if (next && countryRootRef.current?.contains(next)) return;
    setOpen(false);
  };

  return (
    <div ref={countryRootRef} className="relative min-w-0" onBlur={handleCountryRootBlur}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full rounded-lg border border-gold/60 bg-gradient-to-r from-gold/55 via-champagne/50 to-gold/35 p-3 text-sm font-modern text-graphite flex items-center justify-between focus:border-gold focus:outline-none backdrop-blur-lg shadow-sm"
      >
        <span>{selectedLabel}</span>
        <span className="text-graphite/70">▾</span>
      </button>

      {open && (
        <div className="absolute z-40 bottom-full mb-3 max-h-64 w-full min-w-0 overflow-hidden rounded-xl border border-white/25 bg-[#c7b07a] shadow-2xl ring-1 ring-gold/35 backdrop-blur-sm">
          <ul className="max-h-56 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain py-1 space-y-0.5 awa-scrollbar">
            {COUNTRY_OPTIONS.map((option) => (
              <li key={option.code}>
                <button
                  type="button"
                  className={`w-full text-left px-4 py-2 text-sm font-modern rounded-lg transition ${
                    value === option.code
                      ? 'bg-gold/80 text-white font-semibold shadow-inner drop-shadow-sm'
                      : 'text-graphite/90 hover:bg-gold/70 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.55)]'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(option.code);
                    setOpen(false);
                  }}
                >
                  {option.label[language]}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export interface OnboardingDemographicsStepProps {
  data: OnboardingDemographicsData;
  onUpdate: (data: OnboardingDemographicsData) => void;
  onBack: () => void;
  onSubmit: () => void;
  canProceed: boolean;
}

export default function OnboardingDemographicsStep({
  data,
  onUpdate,
  onBack,
  onSubmit,
  canProceed,
}: OnboardingDemographicsStepProps) {
  const { language } = useLanguage();

  const demographicsTexts = {
    pl: {
      title: 'Kilka Szybkich Pytań',
      subtitle: 'Pomogą nam lepiej zrozumieć różnorodność uczestników badania',
      age: 'Przedział wiekowy',
      gender: 'Płeć',
      education: 'Wykształcenie',
      country: 'Kraj zamieszkania',
      back: 'Wstecz',
      continue: 'Kontynuuj',
    },
    en: {
      title: 'A Few Quick Questions',
      subtitle: 'Help us better understand the diversity of study participants',
      age: 'Age range',
      gender: 'Gender',
      education: 'Education level',
      country: 'Country of residence',
      back: 'Back',
      continue: 'Continue',
    },
  };

  const texts = demographicsTexts[language];

  return (
    <motion.div initial={false} animate={{ opacity: 1, x: 0 }}>
      <GlassCard
        variant="flatOnMobile"
        className={`w-full p-4 sm:p-6 md:p-8 flex flex-col ${GLASS_CARD_DESKTOP_GROW_STEP} !shadow-none`}
      >
        <h1 className="text-xl md:text-2xl font-nasalization text-graphite drop-shadow-sm mb-2">
          {texts.title}
        </h1>
        <p className="text-graphite font-modern mb-4 sm:mb-6 text-sm">{texts.subtitle}</p>

        <div className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-sm font-semibold text-graphite mb-2">{texts.age}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {['18-24', '25-34', '35-44', '45-54', '55-64', '65+'].map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => onUpdate({ ...data, ageRange: range })}
                  className={`rounded-lg p-3 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                    data.ageRange === range
                      ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                      : 'bg-white/10 border border-white/30 text-graphite transition-all duration-200 ease-out hover:scale-[1.03] hover:bg-gold-400/22 hover:border-gold-400/50 hover:shadow-[0_0_30px_-8px_rgba(255,229,92,0.45)]'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-graphite mb-2">{texts.gender}</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'female', label: language === 'pl' ? 'Kobieta' : 'Female' },
                { id: 'male', label: language === 'pl' ? 'Mężczyzna' : 'Male' },
                { id: 'non-binary', label: language === 'pl' ? 'Niebinarna' : 'Non-binary' },
                {
                  id: 'prefer-not-say',
                  label: language === 'pl' ? 'Wolę nie mówić' : 'Prefer not to say',
                },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onUpdate({ ...data, gender: option.id })}
                  className={`rounded-lg p-3 sm:p-4 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                    data.gender === option.id
                      ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                      : 'bg-white/10 border border-white/30 text-graphite transition-all duration-200 ease-out hover:scale-[1.03] hover:bg-gold-400/22 hover:border-gold-400/50 hover:shadow-[0_0_30px_-8px_rgba(255,229,92,0.45)]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-graphite mb-2">
              {texts.education}
            </label>
            <EducationSelect
              value={data.education}
              onChange={(id) => onUpdate({ ...data, education: id })}
              language={language}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-graphite mb-2">{texts.country}</label>
            <CountrySelect
              value={data.country}
              onChange={(code) => onUpdate({ ...data, country: code })}
              language={language}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-5 sm:mt-6 pt-2">
          <GlassButton type="button" variant="secondary" onClick={onBack} className="w-full sm:w-auto">
            ← {texts.back}
          </GlassButton>

          <GlassButton
            type="button"
            disabled={!canProceed}
            onClick={onSubmit}
            size="lg"
            className="w-full sm:w-auto"
          >
            {texts.continue} →
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}
