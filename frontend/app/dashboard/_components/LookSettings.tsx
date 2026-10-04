'use client';

/**
 * "Look" in the quiz editor's Design tab: match the website automatically, or pick custom colors and a font.
 * Saved as settings.style ({ mode, background, text, primary, font }); the embed, the hosted quiz page and the renderer read it
 * through lib/quizTheme, which also keeps every combination readable. The preview uses the same function, so what the
 * owner sees here is what visitors get.
 */
import { DASHBOARD_COLORS as C } from './dashboardColors';
import { resolveQuizTheme, FONT_CHOICES, QuizStyle } from '@/lib/quizTheme';

interface Props {
  settings: any;
  branding?: any;
  onChange: (next: any) => void;
}

/** The color input only accepts #rrggbb; while a code is being typed it keeps showing the last valid color. */
const hex6 = (v: unknown, fallback: string) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback);

const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 };

export function LookSettings({ settings, branding, onChange }: Props) {
  const style: QuizStyle = (settings && settings.style) || {};
  const mode = style.mode === 'custom' ? 'custom' : 'site';
  const theme = resolveQuizTheme({ branding, settings });

  function setStyle(patch: QuizStyle) {
    onChange(Object.assign({}, settings, { style: Object.assign({}, style, patch) }));
  }
  function choose(next: 'site' | 'custom') {
    if (next === mode) return;
    if (next === 'custom') {
      // Start from what visitors see now, so switching does not change anything until the owner edits a color.
      setStyle({ mode: 'custom', background: style.background || theme.bg, text: style.text || theme.text, primary: style.primary || theme.primary, font: style.font || theme.font });
    } else {
      setStyle({ mode: 'site' });
    }
  }

  const option = (value: 'site' | 'custom', title: string, body: string) => (
    <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 12px', marginBottom: 8, borderRadius: 10, cursor: 'pointer', border: '1px solid ' + (mode === value ? C.ACCENT : C.BORDER), background: mode === value ? C.ACCENT_LIGHT : '#fff' }}>
      <input type="radio" name="quiz-look" checked={mode === value} onChange={() => choose(value)} style={{ marginTop: 3 }} />
      <span>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.TEXT }}>{title}</span>
        <span style={{ display: 'block', fontSize: 12, color: C.TEXT_MUTED, marginTop: 2, lineHeight: 1.45 }}>{body}</span>
      </span>
    </label>
  );

  const fallbackFor = { background: theme.bg, text: theme.text, primary: theme.primary };
  const colorRow = (key: 'background' | 'text' | 'primary', name: string, value: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <input type="color" aria-label={name + ' color'} value={hex6(value, fallbackFor[key])} onChange={(e) => setStyle({ [key]: e.target.value } as QuizStyle)}
        style={{ width: 36, height: 36, borderRadius: 8, border: '2px solid ' + C.BORDER, cursor: 'pointer', padding: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 500, color: C.TEXT_MUTED, flex: 1 }}>{name}</span>
      <input type="text" aria-label={name + ' color code'} value={value} onChange={(e) => setStyle({ [key]: e.target.value } as QuizStyle)}
        style={{ width: 80, padding: '5px 8px', border: '1px solid ' + C.BORDER, borderRadius: 6, fontSize: 12, fontWeight: 600, color: C.TEXT, textAlign: 'center', fontFamily: C.FONT }} />
    </div>
  );

  const adjusted = mode === 'custom' && !!style.text && theme.text.toLowerCase() !== String(style.text).toLowerCase();

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={label}>Look</div>
      {option('site', 'Match my website', 'On a website connected in Websites, the quiz takes your site’s background, text color, button color and font automatically.')}
      {option('custom', 'Custom', 'Choose the colors and font yourself. They apply everywhere the quiz appears.')}

      {mode === 'custom' ? (
        <div style={{ marginTop: 14 }}>
          {colorRow('background', 'Background', style.background || theme.bg)}
          {colorRow('text', 'Text', style.text || theme.text)}
          {colorRow('primary', 'Buttons', style.primary || theme.primary)}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: C.TEXT_MUTED, flex: 1 }}>Font</span>
            <select aria-label="Font" value={style.font || theme.font} onChange={(e) => setStyle({ font: e.target.value })}
              style={{ width: 170, padding: '7px 8px', border: '1px solid ' + C.BORDER, borderRadius: 6, fontSize: 12, color: C.TEXT, fontFamily: C.FONT, background: '#fff' }}>
              {(FONT_CHOICES.indexOf(style.font || theme.font) === -1 ? [style.font || theme.font] : []).concat(FONT_CHOICES).map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: C.TEXT_MUTED, lineHeight: 1.45, marginBottom: 10 }}>Where your website’s look is not available (the quiz link, older embed code), the quiz uses this button color:</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="color" aria-label="Button color" value={hex6(settings?.primary_color, theme.primary)}
              onChange={(e) => onChange(Object.assign({}, settings, { primary_color: e.target.value }))}
              style={{ width: 36, height: 36, borderRadius: 8, border: '2px solid ' + C.BORDER, cursor: 'pointer', padding: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: C.TEXT_MUTED, flex: 1 }}>Buttons</span>
            <input type="text" aria-label="Button color code" value={settings?.primary_color || theme.primary}
              onChange={(e) => onChange(Object.assign({}, settings, { primary_color: e.target.value }))}
              style={{ width: 80, padding: '5px 8px', border: '1px solid ' + C.BORDER, borderRadius: 6, fontSize: 12, fontWeight: 600, color: C.TEXT, textAlign: 'center', fontFamily: C.FONT }} />
          </div>
        </div>
      )}

      {/* Preview, drawn with the same rules visitors get. */}
      <div aria-label="Preview of the quiz look" style={{ marginTop: 16, borderRadius: 12, border: '1px solid ' + C.BORDER, padding: 16, background: theme.bg, color: theme.text, fontFamily: theme.fontStack }}>
        {theme.fontHref ? <link rel="stylesheet" href={theme.fontHref} /> : null}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', opacity: 0.7, marginBottom: 6 }}>QUESTION 01</div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Which option fits you best?</div>
        <div style={{ border: '1px solid ' + theme.primary, borderRadius: 8, padding: '8px 10px', fontSize: 13, marginBottom: 10, background: theme.surface }}>A&nbsp;&nbsp;An answer</div>
        <div style={{ display: 'inline-block', background: theme.primary, color: theme.onPrimary, borderRadius: 100, padding: '8px 16px', fontSize: 12, fontWeight: 600 }}>Continue</div>
        {mode === 'site' ? <div style={{ fontSize: 11, opacity: 0.7, marginTop: 10 }}>On your website this preview takes your site’s colors and font.</div> : null}
      </div>
      {adjusted ? <div role="status" style={{ fontSize: 12, color: '#B45309', marginTop: 8 }}>Your text color was hard to read on this background, so it is adjusted for visitors.</div> : null}
    </div>
  );
}
