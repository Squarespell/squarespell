/**
 * Generates the share card at public/og.png.
 *
 * This was a per-report image rendered on request, so a shared link showed that
 * site's actual score. It rendered correctly in development and in a local
 * production build, and failed on Vercel every time a real report was loaded,
 * with the throw happening inside the image stream where it cannot be caught
 * and the response becomes a 500 HTML page. A broken preview image is worse
 * than a generic one, and this is exactly the fault the audit reports on other
 * people's sites, so the card is now a fixed image built here and served as a
 * static file.
 *
 * Run with `npm run og` after changing the brand or the wording.
 */

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { ImageResponse } from 'next/og';
import { SERIF_REGULAR, SANS_REGULAR, SANS_SEMIBOLD } from '../src/lib/pdf/fonts';

function fontData(dataUrl: string): ArrayBuffer {
  const base64 = dataUrl.split(',')[1] || '';
  const buf = Buffer.from(base64, 'base64');
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

const card = (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      background: '#ffffff',
      padding: '64px 72px',
      fontFamily: 'Sans',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', fontSize: 24, fontWeight: 600, color: '#14171a' }}>
        Squarespell
        <span style={{ fontFamily: 'Serif', fontSize: 22, color: '#818a93', marginLeft: 14 }}>
          Site Auditor
        </span>
      </div>
      <div style={{ fontSize: 17, color: '#9aa2aa' }}>Free, no sign-up</div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontFamily: 'Serif', fontSize: 60, color: '#14171a', lineHeight: 1.15 }}>
        A real audit of your
      </div>
      <div style={{ fontFamily: 'Serif', fontSize: 60, color: '#0a875a', lineHeight: 1.15 }}>
        Squarespace website
      </div>
      <div style={{ fontSize: 26, color: '#5b636b', lineHeight: 1.45, marginTop: 22, maxWidth: 820 }}>
        We crawl your pages, measure a hundred things, and tell you what to fix first, with the
        evidence for every claim.
      </div>
    </div>

    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        borderTop: '1px solid #e6eaed',
        paddingTop: 22,
        fontSize: 17,
        color: '#9aa2aa',
      }}
    >
      <div>SEO, AI search, speed, conversion</div>
      <div>squarespell.com</div>
    </div>
  </div>
);

async function main() {
  const response = new ImageResponse(card, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Sans', data: fontData(SANS_REGULAR), weight: 400, style: 'normal' },
      { name: 'Sans', data: fontData(SANS_SEMIBOLD), weight: 600, style: 'normal' },
      { name: 'Serif', data: fontData(SERIF_REGULAR), weight: 400, style: 'normal' },
    ],
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  const out = path.join(process.cwd(), 'public', 'og.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buffer);
  console.log(`${out}  ${(buffer.length / 1024).toFixed(0)} KB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
