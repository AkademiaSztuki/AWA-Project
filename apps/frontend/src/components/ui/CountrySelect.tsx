"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppLanguage, countryFlagEmoji, getAllCountryCodes, getCountryName } from '@/lib/countries';

interface CountrySelectProps {
  value?: string; // ISO 3166-1 alpha-2 code, e.g., "PL"
  onChange: (code: string) => void;
  placeholder?: string;
  className?: string;
}

export function CountrySelect({ value, onChange, placeholder, className }: CountrySelectProps) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  const countryCodes = useMemo(() => getAllCountryCodes(), []);

  const options = useMemo(() => {
    const lang = language as AppLanguage;
    const mapped = countryCodes.map((code) => ({
      code,
      name: getCountryName(code, lang),
      flag: countryFlagEmoji(code),
    }));
    // Sort by localized name
    mapped.sort((a, b) => a.name.localeCompare(b.name, language));
    return mapped;
  }, [countryCodes, language]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) =>
      opt.name.toLowerCase().includes(q) || opt.code.toLowerCase().includes(q)
    );
  }, [options, query]);

  const selected = useMemo(() => options.find((o) => o.code === (value || '')), [options, value]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={className}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-modern transition-all border 
          ${isOpen ? 'border-gold/60 bg-gold/10' : 'border-white/30 bg-white/10 hover:bg-gold/10 hover:border-gold/50'}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 text-graphite">
          {selected ? (
            <>
              <span className="text-base leading-none">{selected.flag}</span>
              <span className="font-semibold">{selected.name}</span>
              <span className="text-xs text-silver-dark">({selected.code})</span>
            </>
          ) : (
            <span className="text-silver-dark">
              {placeholder || (language === 'pl' ? 'Wybierz kraj' : 'Select country')}
            </span>
          )}
        </div>
        <svg
          className={`h-4 w-4 text-silver-dark transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="relative mt-2">
          <div className="absolute z-50 w-full glass-panel rounded-lg border border-white/20 bg-platinum/40 backdrop-blur-sm shadow-xl">
            <div className="p-2 border-b border-white/10">
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={language === 'pl' ? 'Szukaj kraju...' : 'Search country...'}
                className="w-full bg-white/60 focus:bg-white/80 text-graphite placeholder-silver-dark rounded-md px-3 py-2 text-sm outline-none"
              />
            </div>
            <ul role="listbox" className="max-h-64 overflow-auto">
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-sm text-silver-dark">
                  {language === 'pl' ? 'Brak wyników' : 'No results'}
                </li>
              )}
              {filtered.map((opt) => (
                <li key={opt.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={opt.code === value}
                    onClick={() => {
                      onChange(opt.code);
                      setIsOpen(false);
                      setQuery('');
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors 
                      ${opt.code === value ? 'bg-gold/20 text-graphite' : 'hover:bg-gold/10 text-graphite'}
                    `}
                  >
                    <span className="text-base leading-none">{opt.flag}</span>
                    <span className="font-semibold flex-1">{opt.name}</span>
                    <span className="text-xs text-silver-dark">{opt.code}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
