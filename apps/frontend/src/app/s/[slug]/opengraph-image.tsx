import { ImageResponse } from 'next/og';
import { sniffImageMime } from '@/lib/share/image-mime';

export const runtime = 'nodejs';
export const alt = 'Przed i po — koncepcja wnętrza IDA';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 86400;

function getGcpBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_GCP_API_BASE_URL;
  return url && url.length > 0 ? url.replace(/\/$/, '') : null;
}

function toDataUrl(buffer: ArrayBuffer): string {
  const mime = sniffImageMime(buffer);
  return `data:${mime};base64,${Buffer.from(buffer).toString('base64')}`;
}

async function fetchShareImage(kind: 'image' | 'before', slug: string): Promise<string | null> {
  const base = getGcpBaseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/share/cards/${encodeURIComponent(slug)}/${kind}`, {
      cache: 'force-cache',
    });
    if (!res.ok) return null;
    return toDataUrl(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function ShareOpenGraphImage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug?.trim();
  const [afterSrc, beforeSrc] = slug
    ? await Promise.all([fetchShareImage('image', slug), fetchShareImage('before', slug)])
    : [null, null];

  const hasPair = Boolean(beforeSrc && afterSrc);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 36,
          background: 'linear-gradient(135deg, #FFFEF7 0%, #F6EFE3 48%, #E8D9B8 100%)',
          color: '#374151',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 999,
              background: 'rgba(199, 152, 51, 0.85)',
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            IDA
          </div>
          <div style={{ display: 'flex', fontSize: 22, fontWeight: 600, color: 'rgba(55, 65, 81, 0.8)' }}>
            project-ida.com
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flex: 1,
            gap: 18,
            minHeight: 0,
          }}
        >
          {hasPair ? (
            <div style={{ display: 'flex', flex: 1, gap: 18, minHeight: 0 }}>
              <div
                style={{
                  display: 'flex',
                  position: 'relative',
                  flex: 1,
                  overflow: 'hidden',
                  borderRadius: 24,
                  border: '2px solid rgba(199, 152, 51, 0.4)',
                  background: 'rgba(255,255,255,0.45)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={beforeSrc as string}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    display: 'flex',
                    position: 'absolute',
                    left: 16,
                    bottom: 16,
                    padding: '6px 14px',
                    borderRadius: 999,
                    background: 'rgba(255, 254, 247, 0.94)',
                    border: '1px solid rgba(199, 152, 51, 0.55)',
                    color: '#1F2937',
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  Przed
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  position: 'relative',
                  flex: 1,
                  overflow: 'hidden',
                  borderRadius: 24,
                  border: '2px solid rgba(199, 152, 51, 0.4)',
                  background: 'rgba(255,255,255,0.45)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={afterSrc as string}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    display: 'flex',
                    position: 'absolute',
                    left: 16,
                    bottom: 16,
                    padding: '6px 14px',
                    borderRadius: 999,
                    background: 'rgba(255, 254, 247, 0.94)',
                    border: '1px solid rgba(199, 152, 51, 0.55)',
                    color: '#1F2937',
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  Po
                </div>
              </div>
            </div>
          ) : afterSrc ? (
            <div
              style={{
                display: 'flex',
                position: 'relative',
                flex: 1,
                overflow: 'hidden',
                borderRadius: 24,
                border: '2px solid rgba(199, 152, 51, 0.4)',
                background: 'rgba(255,255,255,0.45)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={afterSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div
                style={{
                  display: 'flex',
                  position: 'absolute',
                  left: 16,
                  bottom: 16,
                  padding: '6px 14px',
                  borderRadius: 999,
                  background: 'rgba(255, 254, 247, 0.94)',
                  border: '1px solid rgba(199, 152, 51, 0.55)',
                  color: '#1F2937',
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                IDA
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 24,
                background: 'rgba(255,255,255,0.5)',
                fontSize: 36,
                fontWeight: 700,
              }}
            >
              IDA
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 18,
            fontSize: 22,
            fontWeight: 600,
            color: '#374151',
          }}
        >
          Wygeneruj swoją koncepcję · project-ida.com
        </div>
      </div>
    ),
    { ...size },
  );
}
