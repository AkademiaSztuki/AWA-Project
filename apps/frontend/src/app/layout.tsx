import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Inter, Audiowide, Exo_2 } from 'next/font/google';
import './globals.css';
import AmbientMusic from '@/components/ui/AmbientMusic';
import { LandscapeGuard } from '@/components/ui/LandscapeGuard';
import { ResponsiveLayoutWrapper } from '@/components/ui/ResponsiveLayoutWrapper';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { LayoutProvider } from '@/contexts/LayoutContext';
import { AnimationProvider } from '@/contexts/AnimationContext';
import { ColorAdjustmentProvider } from '@/contexts/ColorAdjustmentContext';
import { GlassHeader } from '@/components/ui/GlassHeader';
import { GlobalProtectedRoute } from '@/components/auth/GlobalProtectedRoute';
import type { Language } from '@/lib/questions/validated-scales';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const audiowide = Audiowide({ 
  weight: '400', 
  subsets: ['latin'], 
  variable: '--font-audiowide' 
});
const exo2 = Exo_2({ 
  subsets: ['latin'], 
  variable: '--font-exo2' 
});

export const metadata: Metadata = {
  title: 'IDA - Interior Design Assistant',
  description: 'Aplikacja badawcza do eksploracji współpracy człowieka z AI w projektowaniu wnętrz',
  keywords: ['AI', 'Interior Design', 'Research', 'Akademia Sztuk Pełnych'],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#1a1a1a', // Dopasowane do ciemnego tła projektu
};

const LANGUAGE_COOKIE = 'app_language';

const isLanguage = (value: string | undefined | null): value is Language =>
  value === 'pl' || value === 'en';

function detectInitialLanguage(): Language {
  const cookieStore = cookies();
  const cookieLang = cookieStore.get(LANGUAGE_COOKIE)?.value;
  if (isLanguage(cookieLang)) return cookieLang;

  const headerList = headers();
  const country =
    headerList.get('x-vercel-ip-country') ??
    headerList.get('cf-ipcountry') ??
    headerList.get('x-country');
  if (country?.toUpperCase() === 'PL') return 'pl';

  const acceptLanguage = headerList.get('accept-language')?.toLowerCase() ?? '';
  if (acceptLanguage.startsWith('pl')) return 'pl';

  return 'en';
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialLanguage = detectInitialLanguage();

  return (
    <html lang={initialLanguage} className={`${inter.variable} ${audiowide.variable} ${exo2.variable}`}>
      <body className="min-h-screen overflow-y-auto font-nasalization">
        {/* Skip to main content link for accessibility */}
        <a 
          href="#main-content" 
          className="skip-link"
          aria-label="Przejdź do głównej treści"
        >
          Przejdź do głównej treści
        </a>
        <LanguageProvider initialLanguage={initialLanguage}>
          <AuthProvider>
            <LayoutProvider>
              <AnimationProvider>
                <ColorAdjustmentProvider>
                  <LandscapeGuard>
                  <ResponsiveLayoutWrapper>
                    <AmbientMusic volume={0.3} audioFile="/audio/ambient.mp3" />
                    
                    <GlobalProtectedRoute>
                      <main 
                        id="main-content"
                        className="relative z-10 min-h-screen w-full px-1.5 sm:px-4 md:px-8"
                        role="main"
                        aria-label="Główna treść aplikacji"
                        style={{
                          /* Padding dla safe-area (notch) - tylko na treści, nie na tle */
                          /* Na mobile: pt-4 (1rem) + safe-area, na desktop: pt-8 (2rem) + safe-area */
                          paddingTop: 'calc(env(safe-area-inset-top, 0) + clamp(1rem, 2vw, 2rem))',
                          paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + clamp(2rem, 3vw, 3rem))',
                        }}
                      >
                        <div className="mx-auto w-full max-w-screen-2xl flex flex-col xl:grid xl:gap-10 xl:grid-cols-[minmax(320px,0.3fr)_minmax(400px,0.7fr)] items-start">
                          {/* Reserved column for IDA narrator - keeps content from overlapping */}
                          <div className="hidden xl:block min-h-[720px]" aria-hidden="true" />
                          <div className="w-full max-w-full lg:max-w-none lg:ml-auto space-y-2 sm:space-y-4">
                            <GlassHeader />
                            <div className="w-full">
                              {children}
                            </div>
                          </div>
                        </div>
                      </main>
                    </GlobalProtectedRoute>
                    <SpeedInsights />
                  </ResponsiveLayoutWrapper>
                </LandscapeGuard>
                </ColorAdjustmentProvider>
              </AnimationProvider>
            </LayoutProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}