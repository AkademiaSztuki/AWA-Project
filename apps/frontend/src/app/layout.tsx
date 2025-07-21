import type { Metadata } from 'next';
import { Inter, Audiowide, Exo_2 } from 'next/font/google';
import './globals.css';

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
      <body className="min-h-screen bg-gradient-to-br from-pearl-50 via-pearl-100 to-silver-300 font-modern">
        <div id="gradient-bg" className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-radial from-gold-400/20 via-pearl-100/40 to-silver-400/30 animate-gradient-xy"></div>
        </div>
        {children}
      </body>
    </html>
  );
}