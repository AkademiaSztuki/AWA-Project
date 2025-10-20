import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'
 
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #D4AF37 0%, #F5DEB3 50%, #E5E4E2 100%)',
          borderRadius: '4px',
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'white',
            textShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          A
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
