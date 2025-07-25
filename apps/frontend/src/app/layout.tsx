import type { Metadata } from 'next';
import { Inter, Audiowide, Exo_2 } from 'next/font/google';
import './globals.css';
import AuroraBackgroundClient from '@/components/ui/AuroraBackgroundClient';
import { AwaBackground } from '@/components/awa';

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
      <body className="h-screen font-modern">
        <AwaBackground />
        <AuroraBackgroundClient />
        <div className="flex items-center justify-end h-screen w-full">
          <div className="w-full max-w-3xl lg:mr-32">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}