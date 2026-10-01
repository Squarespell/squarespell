/** Quiz-author content written into links, redirects and <style> blocks can never run script on our pages. */
import { describe, it, expect } from 'vitest';
import { safeHttpUrl, safeLinkUrl } from '../safeUrl';
import { safeColor, brandFontStack, safeStyleText } from '../safeCss';
import { addUtmParams } from '../urls';

describe('safe URLs', () => {
  it('passes http(s) through and drops script/data schemes', () => {
    expect(safeHttpUrl('https://shop.example/thanks')).toBe('https://shop.example/thanks');
    expect(safeHttpUrl('http://shop.example')).toBe('http://shop.example/');
    for (const bad of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,<script>1</script>', 'vbscript:x', '//evil.example', '/relative', '', null, 42]) {
      expect(safeHttpUrl(bad), String(bad)).toBe('');
    }
  });
  it('links also allow same-site paths, mailto: and tel:', () => {
    expect(safeLinkUrl('mailto:hi@shop.example')).toBe('mailto:hi@shop.example');
    expect(safeLinkUrl('tel:+15550100')).toBe('tel:+15550100');
    expect(safeLinkUrl('javascript:alert(1)')).toBe('');
    expect(safeLinkUrl('/book')).toBe('/book');
    expect(safeLinkUrl('//evil.example')).toBe('');
  });
  it('CTA links with UTM tags drop script schemes', () => {
    expect(addUtmParams('javascript:alert(1)', { source: 's' })).toBe('');
    expect(addUtmParams('https://shop.example/x', { source: 's' })).toBe('https://shop.example/x?utm_source=s');
  });
});

describe('safe CSS', () => {
  it('accepts real colors and falls back for anything else', () => {
    for (const ok of ['#fff', '#3154FF', '#3154ffcc', 'rgb(1, 2, 3)', 'rgba(1,2,3,0.5)', 'hsl(220 100% 60%)', 'white']) expect(safeColor(ok, 'F')).toBe(ok);
    for (const bad of ['red;}</style><script>alert(1)</script>', 'url(x)', 'expression(alert(1))', '#ff0000; background:url(x)', '', null]) expect(safeColor(bad, 'F')).toBe('F');
  });
  it('font names cannot close the style element', () => {
    expect(brandFontStack('Playfair Display')).toBe("'Playfair Display', system-ui, sans-serif");
    expect(brandFontStack("x'</style><script>alert(1)</script>")).toBe("'Inter', system-ui, sans-serif");
    expect(brandFontStack('sans-serif')).toBe("'Inter', system-ui, sans-serif");
  });
  it('custom CSS has every "<" escaped', () => {
    const out = safeStyleText('a{color:red}</style><script>alert(1)</script>');
    expect(out).not.toMatch(/</);
    expect(out).toContain('\\3c /style');
  });
});
