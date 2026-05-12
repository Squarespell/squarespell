// Starter email templates. Each returns an HTML string that's email-safe
// (inline styles, tables-free-where-possible, 600px container, no external CSS).
// Variables: {{firstName}}, {{outcomeTitle}}, {{quizTitle}}, {{ctaUrl}}, {{brand}}.

export type EmailTemplate = {
  id: string;
  name: string;
  description: string;
  category: 'result' | 'welcome' | 'nurture' | 'promo';
  subjectSuggestion: string;
  html: string;
};

const shell = (inner: string) => `
<div style="background:#f5f5f7;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:14px;padding:36px;color:#111;">
    ${inner}
    <p style="margin-top:32px;font-size:12px;color:#999;">You're getting this because you took our quiz. <a href="{{unsubscribeUrl}}" style="color:#999;">Unsubscribe</a></p>
  </div>
</div>`;

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'quiz-result',
    name: 'Quiz result',
    description: 'Deliver the quiz outcome with a clear next step.',
    category: 'result',
    subjectSuggestion: 'Your result is in, {{firstName}}',
    html: shell(`
      <h1 style="margin:0 0 12px;font-size:26px;">Your result: {{outcomeTitle}}</h1>
      <p style="margin:0 0 20px;color:#444;line-height:1.55;">Hi {{firstName}}, thanks for taking {{quizTitle}}. Based on your answers, here's what we recommend next.</p>
      <a href="{{ctaUrl}}" style="display:inline-block;background:#0f7377;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;">See your plan</a>
    `),
  },
  {
    id: 'welcome',
    name: 'Welcome',
    description: 'Intro email sent after signup or quiz completion.',
    category: 'welcome',
    subjectSuggestion: 'Welcome, {{firstName}} 👋',
    html: shell(`
      <h1 style="margin:0 0 12px;font-size:26px;">Welcome to {{brand}}</h1>
      <p style="margin:0 0 20px;color:#444;line-height:1.55;">Hi {{firstName}}, we're glad you're here. Here's what to expect from us: honest advice, zero spam, and the occasional useful tip.</p>
      <a href="{{ctaUrl}}" style="display:inline-block;background:#0f7377;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;">Get started</a>
    `),
  },
  {
    id: 'nurture',
    name: 'Nurture',
    description: 'Low-pressure follow-up with helpful content.',
    category: 'nurture',
    subjectSuggestion: 'One thing worth reading',
    html: shell(`
      <h1 style="margin:0 0 12px;font-size:24px;">Something you might like</h1>
      <p style="margin:0 0 16px;color:#444;line-height:1.6;">Hi {{firstName}}, we put together a short read on the topic that matched your quiz result. No pitch, just useful.</p>
      <a href="{{ctaUrl}}" style="color:#0f7377;font-weight:600;text-decoration:underline;">Read it here</a>
    `),
  },
  {
    id: 'promo',
    name: 'Promo',
    description: 'Limited-time offer with a clear CTA.',
    category: 'promo',
    subjectSuggestion: '{{firstName}}, this is for you',
    html: shell(`
      <div style="background:#111;color:#fff;padding:28px;border-radius:12px;margin-bottom:20px;text-align:center;">
        <div style="font-size:13px;letter-spacing:2px;color:#0f7377;margin-bottom:8px;">LIMITED OFFER</div>
        <div style="font-size:28px;font-weight:700;">20% off - 48 hours only</div>
      </div>
      <p style="margin:0 0 20px;color:#444;line-height:1.55;">{{firstName}}, we picked something we think fits your result ({{outcomeTitle}}). It's on us for the next 48 hours.</p>
      <a href="{{ctaUrl}}" style="display:inline-block;background:#0f7377;color:#ffffff;padding:14px 24px;border-radius:10px;text-decoration:none;font-weight:700;">Claim 20% off</a>
    `),
  },
  {
    id: 'thank-you',
    name: 'Thank you',
    description: 'Short, warm post-purchase or post-action note.',
    category: 'welcome',
    subjectSuggestion: 'Thanks, {{firstName}}',
    html: shell(`
      <h1 style="margin:0 0 12px;font-size:24px;">Thank you, {{firstName}} 🙏</h1>
      <p style="margin:0 0 16px;color:#444;line-height:1.6;">Just a quick note to say we appreciate you. If you ever want to reply and tell us how it's going, we'd love to hear it.</p>
    `),
  },
  {
    id: 'blank',
    name: 'Blank canvas',
    description: 'Start from scratch with a clean container.',
    category: 'nurture',
    subjectSuggestion: '',
    html: shell(`<p>Start writing here…</p>`),
  },
];
