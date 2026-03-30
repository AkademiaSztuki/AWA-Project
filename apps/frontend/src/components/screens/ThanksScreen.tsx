"use client";

import React, { useEffect, useRef } from 'react';
import { GlassCard } from '../ui/GlassCard';
import GlassSurface from '../ui/GlassSurface';
import { useSessionData } from '@/hooks/useSessionData';
import { AwaDialogue } from '@/components/awa';
import { gcpApi } from '@/lib/gcp-api-client';
import { pruneLargeStringsForSessionExport } from '@/lib/prune-session-export';

function pushSessionExportToServer(userHash: string, sessionObject: unknown, approxRawChars: number): void {
  const pruned = pruneLargeStringsForSessionExport(sessionObject);
  try {
    void gcpApi.participants.saveSessionExport(userHash, pruned).then((res) => {
      const prunedChars = JSON.stringify(pruned).length;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/18b9349d-1699-4e68-9929-30c79f24c497', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '855d7b' },
        body: JSON.stringify({
          sessionId: '855d7b',
          hypothesisId: 'H_session_export_auto',
          location: 'ThanksScreen.tsx:pushSessionExportToServer',
          message: 'session_export_persist',
          data: {
            source: 'thanks_auto',
            ok: res.ok,
            status: res.status ?? null,
            approxRawChars,
            prunedPayloadChars: prunedChars,
          },
          timestamp: Date.now(),
          runId: 'thanks-session-export',
        }),
      }).catch(() => {});
      // #endregion
      if (!res.ok && res.status !== 503) {
        console.warn('[ThanksScreen] session_export_json save failed:', res.error);
      }
    });
  } catch {
    console.warn('[ThanksScreen] Could not send session export to server');
  }
}

export function ThanksScreen() {
  const { sessionData, isInitialized } = useSessionData();
  const lastAutoSentPayloadRef = useRef<string | null>(null);

  const serializedSession =
    isInitialized && sessionData?.userHash ? JSON.stringify(sessionData, null, 2) : '';

  useEffect(() => {
    if (!isInitialized || !serializedSession) return;
    let hash: string;
    let parsed: unknown;
    try {
      parsed = JSON.parse(serializedSession) as unknown;
      const o = parsed as { userHash?: string };
      hash = typeof o.userHash === 'string' ? o.userHash : '';
    } catch {
      return;
    }
    if (!hash) return;
    if (lastAutoSentPayloadRef.current === serializedSession) return;
    lastAutoSentPayloadRef.current = serializedSession;
    pushSessionExportToServer(hash, parsed, serializedSession.length);
  }, [isInitialized, serializedSession]);

  return (
    <div className="min-h-screen flex flex-col w-full">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl mx-auto">
        <GlassCard variant="flatOnMobile" className="w-full p-6 md:p-8 lg:bg-white/10 lg:backdrop-blur-xl lg:border lg:border-white/20 lg:shadow-xl rounded-2xl max-h-[min(90vh,800px)] overflow-auto">
          <div className="text-center">
            <h1 className="text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-exo2 font-bold text-gray-800 mb-3 lg:mb-4">
              Dziękuję za Twoją podróż!
            </h1>

            <p className="text-base lg:text-lg xl:text-xl 2xl:text-2xl text-gray-700 font-modern mb-4 lg:mb-6 leading-relaxed">
              Twój udział w badaniu nad współpracą człowieka z AI jest nieoceniony 
              dla rozwoju naukowego w dziedzinie projektowania wnętrz.
            </p>

            <div className="text-sm text-gray-500 mb-8 font-modern">
              <p>
                Twoje dane zostały anonimowo zebrane dla celów badania doktorskiego 
                na Akademii Sztuki w Szczecinie o współpracy człowieka z AI w projektowaniu.
              </p>
            </div>

            <div className="flex justify-center">
              <GlassSurface
                width={260}
                height={56}
                borderRadius={32}
                className="cursor-pointer select-none transition-transform duration-200 hover:scale-105 shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400 flex items-center justify-center text-base font-exo2 font-bold text-white rounded-2xl"
                onClick={() => {
                  window.location.href = '/dashboard';
                }}
                aria-label="Wróć do dashboard"
                style={{ opacity: 1 }}
              >
                Wróć do dashboard
              </GlassSurface>
            </div>
          </div>
        </GlassCard>
        </div>
      </div>

      <div className="w-full">
        <AwaDialogue 
          currentStep="thanks" 
          fullWidth={true}
          autoHide={true}
        />
      </div>
    </div>
  );
}
