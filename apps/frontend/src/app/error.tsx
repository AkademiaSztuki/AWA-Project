'use client';

import { useEffect } from 'react';
import {
  consumeClientNavigationFallback,
  hardNavigate,
  isChunkLoadError,
} from '@/lib/navigation/chunk-safe-navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const chunkError = isChunkLoadError(error);

  useEffect(() => {
    console.error(error);
    if (!chunkError) return;
    const href = consumeClientNavigationFallback() ?? window.location.href;
    hardNavigate(href);
  }, [chunkError, error]);

  const handleRetry = () => {
    if (chunkError) {
      const href = consumeClientNavigationFallback() ?? window.location.pathname;
      hardNavigate(href);
      return;
    }
    reset();
  };

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-xl font-semibold text-graphite">Coś poszło nie tak</h2>
      <p className="max-w-md text-center text-graphite/80">
        {chunkError
          ? 'Połączenie przerwało ładowanie strony. Spróbujemy ponownie — może to chwilę potrwać na wolnym internecie.'
          : 'Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę.'}
      </p>
      <button
        type="button"
        onClick={handleRetry}
        className="rounded-lg bg-gold px-6 py-2 font-medium text-white transition hover:opacity-90"
      >
        Spróbuj ponownie
      </button>
    </div>
  );
}
