import { describe, it, expect } from 'vitest';
import { contrast, ensureContrast, fontFor, parseColor, readableOn, resolveQuizTheme, siteLookFromParams } from '../quizTheme';

describe('colors stay readable', () => {
  it('fixes white text saved on a white background (the "Private Site" quiz)', () => {
    const t = resolveQuizTheme({ branding: { colors: { text: '#ffffff', accent: '#e4e4e4', primary: '#3e3e3e', background: '#ffffff' }, font_family: 'inherit' } });
    expect(t.bg).toBe('#ffffff');
    expect(contrast(t.text, t.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.text, t.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.primary, t.bg)).toBeGreaterThanOrEqual(3);
    expect(contrast(t.onPrimary, t.primary)).toBeGreaterThanOrEqual(4.5);
    expect(t.font).toBe('Inter');
    expect(t.fontHref).toBeNull();
  });

  it('keeps colors that already read well', () => {
    const t = resolveQuizTheme({ branding: { colors: { background: '#0b0b0b', text: '#f5f5f5', primary: '#9acd32' } } });
    expect(t).toMatchObject({ bg: '#0b0b0b', text: '#f5f5f5', primary: '#9acd32', source: 'saved' });
  });

  it('a too-light button color is darkened, keeping its hue, until it shows on the background', () => {
    const fixed = ensureContrast('#e4e4e4', '#ffffff', 3);
    expect(contrast(fixed, '#ffffff')).toBeGreaterThanOrEqual(3);
    expect(fixed).not.toBe('#e4e4e4');
  });

  it('a surface that text cannot be read on falls back to the background', () => {
    const t = resolveQuizTheme({ branding: { colors: { background: '#ffffff', text: '#111111', surface: '#222222' } } });
    expect(t.surface).toBe('#ffffff');
  });

  it('picks near-black or white for labels', () => {
    expect(readableOn('#ffffff')).toBe('#111827');
    expect(readableOn('#000000')).toBe('#ffffff');
  });
});

describe('where the look comes from', () => {
  const branding = { colors: { background: '#ffffff', text: '#222222', primary: '#3e3e3e' }, font_family: 'Lora' };

  it('the theme color chosen in the editor beats the detected one', () => {
    expect(resolveQuizTheme({ branding, settings: { primary_color: '#0f7377' } }).primary).toBe('#0f7377');
  });

  it('matches the website by default when the loader sends its look', () => {
    const site = siteLookFromParams({ bg: '#101010', fg: '#fafafa', accent: '#8bc34a', font: 'Poppins' });
    const t = resolveQuizTheme({ branding, settings: {}, site });
    expect(t).toMatchObject({ mode: 'site', source: 'site', bg: '#101010', text: '#fafafa', primary: '#8bc34a', font: 'Poppins' });
    expect(t.fontHref).toContain('family=Poppins');
  });

  it('a custom look ignores the website look', () => {
    const site = siteLookFromParams({ bg: '#101010', fg: '#fafafa' });
    const t = resolveQuizTheme({ branding, settings: { style: { mode: 'custom', background: '#fff8e7', text: '#3b2f2f', primary: '#b5523b', font: 'Playfair Display' } }, site });
    expect(t).toMatchObject({ mode: 'custom', source: 'custom', bg: '#fff8e7', text: '#3b2f2f', primary: '#b5523b', font: 'Playfair Display' });
    expect(t.fontHref).toContain('family=Playfair+Display');
  });

  it('without the website look (quiz link, older embeds) the saved look is used', () => {
    expect(resolveQuizTheme({ branding, settings: { style: { mode: 'site' } } })).toMatchObject({ source: 'saved', bg: '#ffffff', text: '#222222', font: 'Lora' });
  });
});

describe('untrusted input', () => {
  it('drops anything that is not a plain color or font name', () => {
    expect(siteLookFromParams({ bg: '#fff</style><script>alert(1)</script>', fg: 'expression(alert(1))', font: 'x;}body{display:none' })).toBeNull();
    expect(siteLookFromParams({})).toBeNull();
    expect(siteLookFromParams(undefined)).toBeNull();
  });

  it('reads rgb(), short hex and names, and ignores transparent colors', () => {
    expect(parseColor('rgb(17, 24, 39)')).toEqual([17, 24, 39]);
    expect(parseColor('#abc')).toEqual([170, 187, 204]);
    expect(parseColor('white')).toEqual([255, 255, 255]);
    expect(parseColor('rgba(0, 0, 0, 0)')).toBeNull();
    expect(parseColor('#00000000')).toBeNull();
  });

  it('generic and system fonts need no download', () => {
    expect(fontFor('inherit').name).toBe('Inter');
    expect(fontFor('"Helvetica Neue", Arial, sans-serif')).toMatchObject({ name: 'Helvetica Neue', href: null });
  });
});
