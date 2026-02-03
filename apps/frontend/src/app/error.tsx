'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-xl font-semibold text-graphite">Coś poszło nie tak</h2>
      <p className="max-w-md text-center text-graphite/80">
        Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę.
      </p>
      <button
        onClick={() => reset()}
        className="rounded-lg bg-gold px-6 py-2 font-medium text-white transition hover:opacity-90"
      >
        Spróbuj ponownie
      </button>
    </div>
  );
}
