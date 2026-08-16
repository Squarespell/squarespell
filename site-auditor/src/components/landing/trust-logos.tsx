import type { ReactElement } from 'react';
import { MarkSquarespace, MarkCircle, MarkStudiopress, MarkBigcartel, MarkFrahm } from '@/components/Icons';

const TRUST_LOGOS: Array<{ name: string; Mark: null | ((p: { className?: string }) => ReactElement) }> = [
  { name: 'SQUARESPACE', Mark: MarkSquarespace },
  { name: 'CIRCLE', Mark: MarkCircle },
  { name: 'STUDIOPRESS', Mark: MarkStudiopress },
  { name: 'bigcartel', Mark: MarkBigcartel },
  { name: 'Typeform', Mark: null },
  { name: 'FRAHM', Mark: MarkFrahm },
];

export function TrustLogos() {
  return (
    <div className="frame home-trust">
      <div className="home-trust-title">Trusted by Squarespace professionals &amp; businesses</div>
      <div className="home-trust-row">
        {TRUST_LOGOS.map((l) => (
          <div className="home-logo" key={l.name}>
            {l.Mark && <l.Mark />}
            {l.name}
          </div>
        ))}
      </div>
    </div>
  );
}
