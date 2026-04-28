'use client';

/**
 * Catches render errors in the root layout. Must provide its own html/body (replaces the root when active).
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling#handling-errors-in-root-layouts
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pl">
      <body
        className="min-h-screen font-sans text-stone-900 antialiased"
        style={{
          background: 'radial-gradient(ellipse at 60% 40%, rgb(199, 152, 51) 0%, rgb(136, 136, 136) 100%)',
        }}
      >
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
          <h1 className="text-xl font-semibold text-stone-900">IDA — wystąpił krytyczny błąd</h1>
          <p className="max-w-md text-center text-stone-800/90 text-sm">
            {process.env.NODE_ENV === 'development' && error?.message
              ? error.message
              : 'Odśwież stronę lub wróć za chwilę.'}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-amber-500"
          >
            Spróbuj ponownie
          </button>
        </div>
      </body>
    </html>
  );
}
