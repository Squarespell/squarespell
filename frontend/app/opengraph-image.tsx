import { ImageResponse } from 'next/og';

// Default Open Graph / social preview image for every public page (Next file convention: /opengraph-image).
export const runtime = 'edge';
export const alt = 'Squarespell Quiz - AI quiz funnels built from your website';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          padding: '80px',
          background: '#0f3f45',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', fontSize: 76, fontWeight: 700 }}>Squarespell Quiz</div>
        <div style={{ display: 'flex', marginTop: 24, fontSize: 38, color: '#bfe6e8' }}>AI quiz funnels built from your website</div>
      </div>
    ),
    { ...size },
  );
}
