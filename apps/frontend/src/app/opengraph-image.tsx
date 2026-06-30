import { ImageResponse } from 'next/og';
import { SITE_FULL_NAME } from '@/lib/seo/site';

export const runtime = 'edge';
export const alt = SITE_FULL_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2a24 40%, #c79833 100%)',
          color: '#f5f0e6',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '900px' }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#e8c96a',
            }}
          >
            IDA
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
            }}
          >
            Zaprojektuj wnętrze z AI dopasowane do Twojej osobowości
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.4,
              color: 'rgba(245, 240, 230, 0.88)',
              maxWidth: '820px',
            }}
          >
            Personalizacja wnętrz na podstawie psychologii, preferencji estetycznych i generatywnej
            sztucznej inteligencji.
          </div>
        </div>
        <div style={{ fontSize: 22, color: 'rgba(245, 240, 230, 0.7)' }}>www.project-ida.com</div>
      </div>
    ),
    { ...size },
  );
}
