import { cookies, headers } from 'next/headers';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildRootJsonLd } from '@/lib/seo/json-ld';
import { buildRootMetadata } from '@/lib/seo/metadata';
import { Inter, Audiowide, Exo_2, Atkinson_Hyperlegible } from 'next/font/google';
import './globals.css';
import 'simplebar-react/dist/simplebar.min.css';
import AmbientMusic from '@/components/ui/AmbientMusic';
import { LandscapeGuard } from '@/components/ui/LandscapeGuard';
import { ResponsiveLayoutWrapper } from '@/components/ui/ResponsiveLayoutWrapper';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { LayoutProvider } from '@/contexts/LayoutContext';
import { AnimationProvider } from '@/contexts/AnimationContext';
import { ColorAdjustmentProvider } from '@/contexts/ColorAdjustmentContext';
import { WcagSettingsProvider } from '@/contexts/WcagSettingsContext';
import { A11yMotionConfig } from '@/components/ui/A11yMotionConfig';
import { DialogueVoiceProvider } from '@/contexts/DialogueVoiceContext';
import { GlobalProtectedRoute } from '@/components/auth/GlobalProtectedRoute';
import { FullFlowProgressProviderGate } from '@/components/flow/FullFlowProgressProviderGate';
import { AppContentFrame } from '@/components/layout/AppContentFrame';
import { ChunkLoadRecovery } from '@/components/navigation/ChunkLoadRecovery';
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

const atkinson = Atkinson_Hyperlegible({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-atkinson',
});

export const metadata = buildRootMetadata();

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  // Złoty odcień zgodny z radial-gradient na html/body (globals.css) — unika „czarnego” paska UI
  themeColor: '#c79833',
};

const LANGUAGE_COOKIE = 'app_language';

const isLanguage = (value: string | undefined | null): value is Language =>
  value === 'pl' || value === 'en';

type InitialLanguageDetection = {
  language: Language;
  source: 'country' | 'accept-language' | 'cookie' | 'default';
};

function detectInitialLanguage(): InitialLanguageDetection {
  const headerList = headers();
  const country =
    headerList.get('x-vercel-ip-country') ??
    headerList.get('cf-ipcountry') ??
    headerList.get('x-country');
  if (country) {
    return {
      language: country.toUpperCase() === 'PL' ? 'pl' : 'en',
      source: 'country',
    };
  }

  const acceptLanguage = headerList.get('accept-language')?.toLowerCase() ?? '';
  if (acceptLanguage.startsWith('pl')) {
    return { language: 'pl', source: 'accept-language' };
  }

  const cookieStore = cookies();
  const cookieLang = cookieStore.get(LANGUAGE_COOKIE)?.value;
  if (isLanguage(cookieLang)) return { language: cookieLang, source: 'cookie' };

  return { language: 'en', source: 'default' };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialLanguage = detectInitialLanguage();

  return (
    <html lang={initialLanguage.language} className={`${inter.variable} ${atkinson.variable} ${audiowide.variable} ${exo2.variable}`}>
      <body className="min-h-[100dvh] font-nasalization">
        <JsonLd data={buildRootJsonLd()} />
        {/* Skip to main content link for accessibility */}
        <a 
          href="#main-content" 
          className="skip-link"
          aria-label="Przejdź do głównej treści"
        >
          Przejdź do głównej treści
        </a>
        <LanguageProvider initialLanguage={initialLanguage.language} initialLanguageSource={initialLanguage.source}>
          <AuthProvider>
            <LayoutProvider>
              <AnimationProvider>
                <WcagSettingsProvider>
                <A11yMotionConfig>
                <ColorAdjustmentProvider>
                  <DialogueVoiceProvider>
                  <LandscapeGuard>
                  <ResponsiveLayoutWrapper>
                    <ChunkLoadRecovery />
                    <AmbientMusic volume={0.3} audioFile="/audio/ambient.mp3" />
                    
                    <GlobalProtectedRoute>
                      <FullFlowProgressProviderGate>
                      <AppContentFrame>{children}</AppContentFrame>
                      </FullFlowProgressProviderGate>
                    </GlobalProtectedRoute>
                    <Analytics />
                    <SpeedInsights />
                  </ResponsiveLayoutWrapper>
                </LandscapeGuard>
                  </DialogueVoiceProvider>
                </ColorAdjustmentProvider>
                </A11yMotionConfig>
                </WcagSettingsProvider>
              </AnimationProvider>
            </LayoutProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}