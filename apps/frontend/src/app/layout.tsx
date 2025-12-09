import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Inter, Audiowide, Exo_2 } from 'next/font/google';
import './globals.css';
import AuroraBackgroundClient from '@/components/ui/AuroraBackgroundClient';
import ParticlesBackground from '@/components/ui/ParticlesBackground';
import AuroraBubbles from '@/components/ui/AuroraBubbles';
import AmbientMusic from '@/components/ui/AmbientMusic';
import MusicTestButton from '@/components/ui/MusicTestButton';
import { AwaBackground } from '@/components/awa';
import { LandscapeGuard } from '@/components/ui/LandscapeGuard';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { LayoutProvider } from '@/contexts/LayoutContext';
import { GlassHeader } from '@/components/ui/GlassHeader';
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
  title: 'Aura - AI Interior Design Dialogue',
  description: 'Aplikacja badawcza do eksploracji współpracy człowieka z AI w projektowaniu wnętrz',
  keywords: ['AI', 'Interior Design', 'Research', 'Akademia Sztuk Pięknych'],
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
        <LanguageProvider initialLanguage={initialLanguage}>
          <AuthProvider>
            <LayoutProvider>
              <LandscapeGuard>
                <AwaBackground />
                <AuroraBackgroundClient />
                <AuroraBubbles />
                <ParticlesBackground />
                <AmbientMusic volume={0.4} audioFile="/audio/ambient.mp3" />
                
                <main className="relative z-10 min-h-screen w-full px-4 pt-8 pb-12 md:px-8">
                  <div className="mx-auto w-full max-w-[1600px] grid gap-10 lg:grid-cols-[minmax(420px,0.3fr)_minmax(480px,0.7fr)] items-start">
                    {/* Reserved column for IDA narrator - keeps content from overlapping */}
                    <div className="hidden lg:block min-h-[720px]" aria-hidden="true" />
                    <div className="w-full max-w-3xl lg:max-w-none lg:ml-auto space-y-4">
                      <GlassHeader />
                      {children}
                    </div>
                  </div>
                </main>
                <SpeedInsights />
              </LandscapeGuard>
            </LayoutProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}