/** Public quiz pages must never render owner-supplied branding or links in a way that can run script. */
import { describe, it, expect } from 'vitest';
import { safeCssColor, safeFontFamily, safeHttpUrl } from '../safeInput';

describe('safeCssColor', () => {
  it('keeps real colours', () => {
    for (const c of ['#fff', '#0D7377', '#0d737780', 'rgb(1, 2, 3)', 'rgba(0,0,0,0.1)', 'hsl(120 50% 50%)', 'transparent', 'red']) {
      expect(safeCssColor(c, 'X')).toBe(c);
    }
  });

  it('rejects anything that could leave the declaration or the style block', () => {
    const attacks = [
      'red;}</style><script>alert(1)</script>',
      '</style><img src=x onerror=alert(1)>',
      'url(javascript:alert(1))',
      'expression(alert(1))',
      '#fff;background:url(//evil)',
      'rgb(1,2,3);x',
      '"><svg onload=alert(1)>',
      'a'.repeat(100),
      '',
    ];
    for (const c of attacks) expect(safeCssColor(c, 'X'), c).toBe('X');
    expect(safeCssColor(undefined, 'X')).toBe('X');
    expect(safeCssColor({}, 'X')).toBe('X');
  });
});

describe('safeFontFamily', () => {
  it('keeps plain family names', () => {
    for (const f of ['Inter', 'DM Sans', 'Playfair-Display', 'Roboto_Mono']) expect(safeFontFamily(f, 'X')).toBe(f);
  });

  it('rejects quote, tag and declaration breakouts', () => {
    for (const f of ["x'; } </style><script>alert(1)</script>", 'Arial, sans-serif', '"><svg onload=alert(1)>', 'a'.repeat(80), '']) {
      expect(safeFontFamily(f, 'X'), f).toBe('X');
    }
    expect(safeFontFamily(null, 'X')).toBe('X');
  });
});

describe('safeHttpUrl', () => {
  it('keeps normal destinations', () => {
    for (const u of ['https://example.com/x?y=1', 'http://example.com', 'mailto:hi@example.com', 'tel:+15551234567', '#top', '/pricing']) {
      expect(safeHttpUrl(u)).toBe(u);
    }
  });

  it('drops script and other dangerous schemes and protocol-relative hosts', () => {
    const attacks = [
      'javascript:alert(1)',
      ' javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'java\nscript:alert(1)',
      'javascript:alert(1);//',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      '//evil.example',
      '/\\evil.example',
      'file:///etc/passwd',
    ];
    for (const u of attacks) expect(safeHttpUrl(u), u).toBe('');
    expect(safeHttpUrl(undefined)).toBe('');
    expect(safeHttpUrl(42)).toBe('');
  });
});
