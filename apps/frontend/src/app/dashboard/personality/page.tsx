"use client";

import React, { useEffect, useState } from 'react';
import { useSessionData } from '@/hooks/useSessionData';
import { BigFiveDetailed } from '@/components/dashboard/BigFiveDetailed';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { getUserProfile } from '@/lib/supabase-deep-personalization';
import { safeLocalStorage } from '@/lib/supabase';

export default function PersonalityDetailPage() {
  const { sessionData } = useSessionData();
  const router = useRouter();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [bigFiveData, setBigFiveData] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Priority 1: Check sessionData (already loaded from Supabase user_profiles)
        const sessionBigFive = (sessionData as any)?.bigFive;
        if (sessionBigFive?.scores) {
          // #region agent log
          void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'sync-check',
              hypothesisId: 'H16',
              location: 'dashboard/personality/page.tsx:sessionData-check',
              message: 'Using sessionData.bigFive',
              data: {
                hasSessionBigFive: !!sessionBigFive,
                hasScores: !!sessionBigFive?.scores,
                hasDomains: !!sessionBigFive?.scores?.domains,
                domainsKeys: sessionBigFive?.scores?.domains ? Object.keys(sessionBigFive.scores.domains) : [],
                domainsValues: sessionBigFive?.scores?.domains ? Object.values(sessionBigFive.scores.domains) : [],
                scoresKeys: sessionBigFive?.scores ? Object.keys(sessionBigFive.scores) : [],
                scoresO: sessionBigFive?.scores?.O,
                scoresC: sessionBigFive?.scores?.C
              },
              timestamp: Date.now()
            })
          }).catch(() => {});
          // #endregion
          
          // Check if scores has direct O/C/E/A/N keys (old format) or domains object (new format)
          let normalizedBigFive = sessionBigFive;
          if (sessionBigFive.scores && !sessionBigFive.scores.domains) {
            // Old format: scores has direct O/C/E/A/N keys
            const directDomains: Record<string, number> = {};
            if (sessionBigFive.scores.O !== undefined) directDomains.O = sessionBigFive.scores.O;
            if (sessionBigFive.scores.C !== undefined) directDomains.C = sessionBigFive.scores.C;
            if (sessionBigFive.scores.E !== undefined) directDomains.E = sessionBigFive.scores.E;
            if (sessionBigFive.scores.A !== undefined) directDomains.A = sessionBigFive.scores.A;
            if (sessionBigFive.scores.N !== undefined) directDomains.N = sessionBigFive.scores.N;
            
            if (Object.keys(directDomains).length > 0) {
              normalizedBigFive = {
                ...sessionBigFive,
                scores: {
                  domains: directDomains,
                  facets: sessionBigFive.scores.facets || {}
                }
              };
            }
          }
          
          // Ensure scores.domains exists and has O/C/E/A/N format
          if (normalizedBigFive.scores.domains && Object.keys(normalizedBigFive.scores.domains).length > 0) {
            if (mounted) {
              setBigFiveData(normalizedBigFive);
              setLoading(false);
              return;
            }
          }
        }
        
        // Priority 2: Fetch from Supabase user_profiles (primary source)
        const userHash = (sessionData as any)?.userHash;
        if (userHash) {
          const userProfile = await getUserProfile(userHash);
          if (userProfile?.personality) {
            // Map personality from user_profiles to bigFive format
            // IPIP-NEO-120 format only (O/C/E/A/N)
            const rawDomains = userProfile.personality.domains || {};
            let domains: Record<string, number> = {};
            
            // Check if domains use O/C/E/A/N format (IPIP-NEO-120)
            if (rawDomains.O !== undefined || rawDomains.C !== undefined || rawDomains.E !== undefined || rawDomains.A !== undefined || rawDomains.N !== undefined) {
              domains = rawDomains as Record<string, number>;
            } else {
              // Map from openness/conscientiousness format to O/C/E/A/N
              const domainMapping: Record<string, string> = {
                'openness': 'O',
                'conscientiousness': 'C',
                'extraversion': 'E',
                'agreeableness': 'A',
                'neuroticism': 'N'
              };
              Object.entries(rawDomains).forEach(([key, value]) => {
                const mappedKey = domainMapping[key.toLowerCase()] || key;
                if (typeof value === 'number') {
                  domains[mappedKey] = value;
                }
              });
            }
            
            // Force IPIP-NEO-120 if we have O/C/E/A/N domains or facets
            const hasOCEANFormat = domains.O !== undefined || domains.C !== undefined || domains.E !== undefined || domains.A !== undefined || domains.N !== undefined;
            const hasFacets = userProfile.personality.facets && (
              userProfile.personality.facets.O || 
              userProfile.personality.facets.C || 
              userProfile.personality.facets.E || 
              userProfile.personality.facets.A || 
              userProfile.personality.facets.N
            );
            const instrument = (hasOCEANFormat || hasFacets) ? 'IPIP-NEO-120' : (userProfile.personality.instrument || 'IPIP-NEO-120');
            
            const mappedBigFive = {
              instrument: instrument,
              scores: {
                domains: domains,
                facets: userProfile.personality.facets || {}
              },
              completedAt: userProfile.personality.completedAt
            };
            
            // #region agent log
            void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: 'debug-session',
                runId: 'sync-check',
                hypothesisId: 'H14',
                location: 'dashboard/personality/page.tsx:load-from-user_profiles',
                message: 'Loaded Big Five from user_profiles.personality',
                data: {
                  hasPersonality: true,
                  originalInstrument: userProfile.personality.instrument,
                  hasOCEANFormat: hasOCEANFormat,
                  hasFacets: !!hasFacets,
                  finalInstrument: mappedBigFive.instrument,
                  rawDomainsKeys: Object.keys(rawDomains),
                  rawDomainsValues: Object.values(rawDomains),
                  mappedDomainsKeys: Object.keys(domains),
                  mappedDomainsValues: Object.values(domains),
                  domainsO: domains.O,
                  domainsC: domains.C,
                  domainsE: domains.E,
                  domainsA: domains.A,
                  domainsN: domains.N
                },
                timestamp: Date.now()
              })
            }).catch(() => {});
            // #endregion
            
            if (mounted) {
              setBigFiveData(mappedBigFive);
              setLoading(false);
              return;
            }
          }
        }
        
        // Priority 3: Try localStorage
        const localSession = safeLocalStorage.getItem('aura_session');
        if (localSession) {
          const parsed = JSON.parse(localSession);
          const bigFive = parsed?.bigFive;
          if (mounted && bigFive?.scores) {
            setBigFiveData(bigFive);
            setLoading(false);
            return;
          }
        }
        
        if (mounted) {
          setBigFiveData(null);
          setLoading(false);
        }
      } catch (e) {
        console.error('[PersonalityPage] Failed to load Big Five:', e);
        if (mounted) {
          setBigFiveData(null);
          setLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, [sessionData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-silver-dark font-modern">{language === 'pl' ? 'Ładowanie...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!bigFiveData?.scores) {
    return (
      <div className="min-h-screen flex flex-col w-full relative">
        <div className="absolute inset-0 bg-gradient-radial from-pearl-50 via-platinum-50 to-silver-100 -z-10" />
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <GlassCard className="p-8 text-center">
              <h1 className="text-3xl font-nasalization bg-gradient-to-r from-gold via-champagne to-platinum bg-clip-text text-transparent mb-3">
                {language === 'pl' ? 'Big Five' : 'Big Five'}
              </h1>
              <p className="text-graphite font-modern mb-6">
                {language === 'pl' ? 'Nie znaleziono wyników. Wykonaj test, aby zobaczyć szczegółową analizę.' : 'No results found. Take the test to see detailed analysis.'}
              </p>
              <GlassButton onClick={() => router.push('/flow/big-five')}>
                {language === 'pl' ? 'Rozpocznij test Big Five' : 'Start Big Five Test'}
              </GlassButton>
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  // #region agent log
  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'sync-check',
      hypothesisId: 'H17',
      location: 'dashboard/personality/page.tsx:before-BigFiveDetailed',
      message: 'Passing data to BigFiveDetailed',
      data: {
        hasBigFiveData: !!bigFiveData,
        hasScores: !!bigFiveData?.scores,
        scoresType: typeof bigFiveData?.scores,
        hasDomains: !!bigFiveData?.scores?.domains,
        domainsKeys: bigFiveData?.scores?.domains ? Object.keys(bigFiveData.scores.domains) : [],
        domainsValues: bigFiveData?.scores?.domains ? Object.values(bigFiveData.scores.domains) : [],
        scoresKeys: bigFiveData?.scores ? Object.keys(bigFiveData.scores) : [],
        instrument: bigFiveData?.instrument,
        domainsO: bigFiveData?.scores?.domains?.O,
        domainsC: bigFiveData?.scores?.domains?.C,
        domainsE: bigFiveData?.scores?.domains?.E,
        domainsA: bigFiveData?.scores?.domains?.A,
        domainsN: bigFiveData?.scores?.domains?.N,
        scoresStringified: JSON.stringify(bigFiveData?.scores)
      },
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion

  return (
    <BigFiveDetailed
      scores={bigFiveData.scores}
      responses={bigFiveData.responses}
      completedAt={bigFiveData.completedAt}
    />
  );
}
