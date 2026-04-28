"use client";

import { useMemo, useRef, useState, type FocusEvent } from "react";

export type EducationGroupId =
  | "basic_secondary"
  | "higher_first"
  | "higher_second"
  | "doctoral_career";

export type EducationOption = {
  id: string;
  group: EducationGroupId;
  label: { pl: string; en: string };
};

const GROUP_ORDER: EducationGroupId[] = [
  "basic_secondary",
  "higher_first",
  "higher_second",
  "doctoral_career",
];

const GROUP_LABELS: Record<EducationGroupId, { pl: string; en: string }> = {
  basic_secondary: {
    pl: "Podstawowe i średnie",
    en: "Basic & secondary",
  },
  higher_first: {
    pl: "Studia I stopnia",
    en: "Undergraduate (1st cycle)",
  },
  higher_second: {
    pl: "Studia II stopnia",
    en: "Graduate (2nd cycle)",
  },
  doctoral_career: {
    pl: "Doktorat i kariera akademicka",
    en: "Doctorate & academic career",
  },
};

/** Stable IDs stored in session / participants.education */
export const EDUCATION_OPTIONS: EducationOption[] = [
  {
    id: "primary-basic",
    group: "basic_secondary",
    label: {
      pl: "Szkoła podstawowa",
      en: "Primary school",
    },
  },
  {
    id: "lower-secondary",
    group: "basic_secondary",
    label: {
      pl: "Szkoła branżowa I stopnia / inne przed maturą",
      en: "Lower secondary / pre‑A-level vocational",
    },
  },
  {
    id: "vocational-matura",
    group: "basic_secondary",
    label: {
      pl: "Średnie zawodowe z maturą / technikum",
      en: "Upper secondary vocational (incl. technical school)",
    },
  },
  {
    id: "high-school",
    group: "basic_secondary",
    label: {
      pl: "Średnie ogólnokształcące (matura)",
      en: "Upper secondary general (e.g. high school / A-levels)",
    },
  },
  {
    id: "bachelor",
    group: "higher_first",
    label: {
      pl: "Licencjat lub inżynier (I stopień)",
      en: "Bachelor's / BEng / first-cycle degree",
    },
  },
  {
    id: "master",
    group: "higher_second",
    label: {
      pl: "Magister, magister inżynier lub równoważne (II stopień)",
      en: "Master's / MSc / second-cycle or long-cycle degree",
    },
  },
  {
    id: "doctorate",
    group: "doctoral_career",
    label: {
      pl: "Doktorat (PhD / stopień doktora)",
      en: "Doctorate (PhD)",
    },
  },
  {
    id: "postdoctoral",
    group: "doctoral_career",
    label: {
      pl: "Staż lub praca postdoktorska",
      en: "Postdoctoral training / position",
    },
  },
  {
    id: "habilitation",
    group: "doctoral_career",
    label: {
      pl: "Doktor habilitowany (dr hab.)",
      en: "Habilitation (e.g. Polish dr hab.)",
    },
  },
  {
    id: "professor",
    group: "doctoral_career",
    label: {
      pl: "Tytuł profesora (naukowy)",
      en: "Full professor title",
    },
  },
];

export function EducationSelect({
  value,
  onChange,
  language,
}: {
  value: string;
  onChange: (id: string) => void;
  language: "pl" | "en";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const handleRootBlur = (e: FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null;
    if (next && rootRef.current?.contains(next)) return;
    setOpen(false);
  };

  const selectedLabel = useMemo(() => {
    const found = EDUCATION_OPTIONS.find((o) => o.id === value);
    if (found) return found.label[language];
    return language === "pl" ? "Wybierz wykształcenie…" : "Select education…";
  }, [value, language]);

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return EDUCATION_OPTIONS;
    return EDUCATION_OPTIONS.filter((option) => {
      const pl = option.label.pl.toLowerCase();
      const en = option.label.en.toLowerCase();
      return (
        pl.includes(term) ||
        en.includes(term) ||
        option.id.toLowerCase().includes(term)
      );
    });
  }, [query]);

  const grouped = useMemo(() => {
    const map: Record<EducationGroupId, EducationOption[]> = {
      basic_secondary: [],
      higher_first: [],
      higher_second: [],
      doctoral_career: [],
    };
    for (const option of filteredOptions) {
      map[option.group].push(option);
    }
    return map;
  }, [filteredOptions]);

  return (
    <div ref={rootRef} className="relative min-w-0" onBlur={handleRootBlur}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full rounded-lg border border-gold/60 bg-gradient-to-r from-gold/55 via-champagne/50 to-gold/35 p-3 text-sm font-modern text-graphite flex items-center justify-between focus:border-gold focus:outline-none backdrop-blur-lg shadow-sm"
      >
        <span className={value ? "" : "text-graphite/60"}>{selectedLabel}</span>
        <span className="text-graphite/70">▾</span>
      </button>

      {open && (
        <div className="absolute z-40 bottom-full mb-3 max-h-80 w-full overflow-hidden rounded-xl border border-white/25 bg-[#c7b07a] shadow-2xl ring-1 ring-gold/35 backdrop-blur-sm">
          <div className="border-b border-white/20 px-3 py-2 bg-[#c1a86e]/80">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                language === "pl"
                  ? "Szukaj (np. magister, PhD, habilitacja)…"
                  : "Search (e.g. master, PhD, habilitation)…"
              }
              className="w-full rounded-lg bg-white/80 px-3 py-1.5 text-xs font-modern text-graphite placeholder:text-graphite/50 focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>
          <div className="max-h-60 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain px-1 py-1 space-y-2 awa-scrollbar">
            {GROUP_ORDER.map((group) => {
              const options = grouped[group];
              if (options.length === 0) return null;
              return (
                <div key={group}>
                  <div className="px-3 py-1 text-[11px] font-modern uppercase tracking-wide text-graphite/70">
                    {GROUP_LABELS[group][language]}
                  </div>
                  <ul className="py-0.5 space-y-0.5">
                    {options.map((option) => (
                      <li key={option.id}>
                        <button
                          type="button"
                          className={`w-full text-left px-4 py-1.5 text-sm font-modern rounded-lg transition ${
                            value === option.id
                              ? "bg-gold/80 text-white font-semibold shadow-inner drop-shadow-sm"
                              : "text-graphite/90 hover:bg-gold/70 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.55)]"
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            onChange(option.id);
                            setOpen(false);
                            setQuery("");
                          }}
                        >
                          {option.label[language]}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            {filteredOptions.length === 0 && (
              <p className="px-4 py-3 text-xs font-modern text-graphite/80 text-center">
                {language === "pl" ? "Brak wyników" : "No matches"}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
