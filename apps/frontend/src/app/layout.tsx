import type { Metadata } from 'next';
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
import { LanguageProvider, LanguageToggle } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { UserAuthButton } from '@/components/auth/UserAuthButton';
import { DashboardButton } from '@/components/ui/DashboardButton';
import { PathSelectionButton } from '@/components/ui/PathSelectionButton';

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" className={`${inter.variable} ${audiowide.variable} ${exo2.variable}`}>
      <body className="h-screen font-nasalization">
        <LanguageProvider>
          <AuthProvider>
            <LandscapeGuard>
            {/* Global navigation in top-right corner */}
            <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
              <PathSelectionButton />
              <DashboardButton />
              <UserAuthButton />
              <LanguageToggle />
            </div>
              
              <AwaBackground />
              <AuroraBackgroundClient />
              <AuroraBubbles />
              <ParticlesBackground />
              <AmbientMusic volume={0.4} audioFile="/audio/ambient.mp3" />
              <MusicTestButton />
              <div className="flex items-center justify-end h-screen w-full">
                <div className="w-full max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl lg:mr-32">
                  {children}
                </div>
              </div>
              <SpeedInsights />
            </LandscapeGuard>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}