// Quiz-native email templates
// Every template uses merge tags tied to the quiz: {{quiz_name}}, {{outcome_name}},
// {{answer:question_slug}}, {{first_name}}, {{brand_name}}, {{cta_url}}.
// These are rendered server-side at send time.

export type TemplateCategory =
  | 'post-quiz'
  | 'outcome'
  | 'nurture'
  | 'abandoner'
  | 'booking'
  | 'discount';

export interface EmailTemplate {
  id: string;
  category: TemplateCategory;
  title: string;
  oneLiner: string;
  whyQuizNative: string;
  defaultSubject: string;
  defaultPreheader: string;
  mergeTags: string[];
  html: string;
}

function wrap(body: string): string {
  return (
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '</head><body style="margin:0;padding:0;background:#0b0b0c;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;color:#ececec;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b0b0c;">' +
    '<tr><td align="center" style="padding:32px 16px;">' +
    '<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#141416;border:1px solid #222;border-radius:12px;overflow:hidden;">' +
    body +
    '</table>' +
    '<div style="max-width:560px;margin:16px auto 0;color:#7a7a80;font-size:12px;line-height:18px;text-align:center;">' +
    '<div>{{footer_address}}</div>' +
    '<div style="margin-top:4px;">{{footer_unsubscribe}}</div>' +
    '</div>' +
    '</td></tr></table></body></html>'
  );
}

function headerBlock(brand: string): string {
  return (
    '<tr><td style="padding:20px 24px;border-bottom:1px solid #222;">' +
    '<span style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#9a9a9f;">' +
    brand +
    '</span></td></tr>'
  );
}

function button(label: string, url: string): string {
  return (
    '<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 8px;"><tr><td style="border-radius:8px;background:#d2ff1d;">' +
    '<a href="' + url + '" target="_blank" style="display:inline-block;padding:12px 20px;color:#0b0b0c;font-weight:600;text-decoration:none;font-size:15px;border-radius:8px;">' +
    label +
    '</a></td></tr></table>'
  );
}

const postQuizWelcome: EmailTemplate = {
  id: 'post-quiz-welcome',
  category: 'post-quiz',
  title: 'Post-quiz welcome',
  oneLiner: 'Sent the moment a visitor finishes the quiz.',
  whyQuizNative: 'Greets by name the second they finish and repeats their outcome back to them. Impossible without the quiz.',
  defaultSubject: 'Your {{quiz_name}} result: {{outcome_name}}',
  defaultPreheader: 'Here is what your answers told us.',
  mergeTags: ['first_name', 'quiz_name', 'outcome_name', 'brand_name', 'cta_url'],
  html: wrap(
    headerBlock('{{brand_name}}') +
    '<tr><td style="padding:28px 24px 8px;">' +
    '<h1 style="margin:0 0 8px;font-size:22px;line-height:28px;color:#fff;font-weight:600;">Hi {{first_name}}, thanks for taking {{quiz_name}}.</h1>' +
    '<p style="margin:0 0 12px;color:#c7c7cc;font-size:15px;line-height:22px;">Your result is <strong style="color:#d2ff1d;">{{outcome_name}}</strong>. Based on how you answered, here is what that means and what to do next.</p>' +
    '<p style="margin:0;color:#c7c7cc;font-size:15px;line-height:22px;">Over the next few days I will share a few things tailored to your result. If anything lands, just hit reply, a real person reads every message.</p>' +
    button('See your full result', '{{cta_url}}') +
    '</td></tr>'
  ),
};

const outcomeRecommendation: EmailTemplate = {
  id: 'outcome-recommendation',
  category: 'outcome',
  title: 'Outcome recommendation',
  oneLiner: 'Recommends the product or service matched to their quiz result.',
  whyQuizNative: 'Recommends the package that maps to their outcome. Different outcome, different recommendation.',
  defaultSubject: 'The right fit for a {{outcome_name}}',
  defaultPreheader: 'A short recommendation based on your quiz.',
  mergeTags: ['first_name', 'outcome_name', 'quiz_name', 'cta_url', 'brand_name'],
  html: wrap(
    headerBlock('{{brand_name}}') +
    '<tr><td style="padding:28px 24px 8px;">' +
    '<h1 style="margin:0 0 8px;font-size:22px;line-height:28px;color:#fff;font-weight:600;">For a {{outcome_name}}, this is where most people start.</h1>' +
    '<p style="margin:0 0 12px;color:#c7c7cc;font-size:15px;line-height:22px;">{{first_name}}, your {{quiz_name}} answers pointed clearly at {{outcome_name}}. Most people in that bucket get the fastest traction with the option below.</p>' +
    '<ul style="margin:0 0 12px;padding:0 0 0 18px;color:#c7c7cc;font-size:15px;line-height:24px;">' +
    '<li>Matched to your top two answers.</li>' +
    '<li>Built for the stage of the journey you described.</li>' +
    '<li>Skippable anytime, no contract.</li>' +
    '</ul>' +
    button('See the recommendation', '{{cta_url}}') +
    '</td></tr>'
  ),
};

const nurtureByAnswer: EmailTemplate = {
  id: 'nurture-by-answer',
  category: 'nurture',
  title: 'Nurture by answer',
  oneLiner: 'Follow-up message pegged to a specific question in the quiz.',
  whyQuizNative: 'References the exact answer the person gave to a specific question. Generic drip emails cannot do this.',
  defaultSubject: 'About what you said on question {{answer:question_number}}',
  defaultPreheader: 'A quick follow-up on your answer.',
  mergeTags: ['first_name', 'answer:question_slug', 'quiz_name', 'cta_url'],
  html: wrap(
    headerBlock('{{brand_name}}') +
    '<tr><td style="padding:28px 24px 8px;">' +
    '<h1 style="margin:0 0 8px;font-size:22px;line-height:28px;color:#fff;font-weight:600;">You said: &ldquo;{{answer:question_slug}}&rdquo;</h1>' +
    '<p style="margin:0 0 12px;color:#c7c7cc;font-size:15px;line-height:22px;">That is the single most common answer we see from people who end up succeeding fastest, {{first_name}}. Here is the one thing I would do first if I were you.</p>' +
    '<div style="margin:0 0 12px;padding:16px;background:#1b1b1e;border-left:3px solid #d2ff1d;color:#ececec;font-size:15px;line-height:22px;">Pick one concrete action this week. Write it on paper. Do not scale it, do not automate it, just do it once by hand.</div>' +
    '<p style="margin:0;color:#c7c7cc;font-size:15px;line-height:22px;">Reply and tell me what you picked, I will send back the next step.</p>' +
    button('Read the full write-up', '{{cta_url}}') +
    '</td></tr>'
  ),
};

const abandonerReengage: EmailTemplate = {
  id: 'abandoner-reengage',
  category: 'abandoner',
  title: 'Quiz abandoner re-engage',
  oneLiner: 'Sent to visitors who started the quiz but did not finish.',
  whyQuizNative: 'Only makes sense when you know someone saw question 2 but never reached question 5.',
  defaultSubject: 'You were close on {{quiz_name}}',
  defaultPreheader: 'Pick up where you left off.',
  mergeTags: ['first_name', 'quiz_name', 'cta_url'],
  html: wrap(
    headerBlock('{{brand_name}}') +
    '<tr><td style="padding:28px 24px 8px;">' +
    '<h1 style="margin:0 0 8px;font-size:22px;line-height:28px;color:#fff;font-weight:600;">You were a few questions away, {{first_name}}.</h1>' +
    '<p style="margin:0 0 12px;color:#c7c7cc;font-size:15px;line-height:22px;">You started {{quiz_name}} but stepped away before the result. Two minutes gets you the personalized answer.</p>' +
    '<p style="margin:0;color:#c7c7cc;font-size:15px;line-height:22px;">No pressure, the link just picks up where you left off.</p>' +
    button('Finish the quiz', '{{cta_url}}') +
    '</td></tr>'
  ),
};

const consultationBooking: EmailTemplate = {
  id: 'consultation-booking',
  category: 'booking',
  title: 'Consultation booking',
  oneLiner: 'Invites high-intent quiz takers to book a call.',
  whyQuizNative: 'Only sent to outcomes that score as high-intent, with the call agenda pre-loaded from their answers.',
  defaultSubject: 'Free 20-minute call about your {{outcome_name}} result',
  defaultPreheader: 'Pick a time, the agenda is ready.',
  mergeTags: ['first_name', 'outcome_name', 'cta_url', 'brand_name'],
  html: wrap(
    headerBlock('{{brand_name}}') +
    '<tr><td style="padding:28px 24px 8px;">' +
    '<h1 style="margin:0 0 8px;font-size:22px;line-height:28px;color:#fff;font-weight:600;">{{first_name}}, want to talk through your {{outcome_name}} result?</h1>' +
    '<p style="margin:0 0 12px;color:#c7c7cc;font-size:15px;line-height:22px;">Your answers mapped to a pattern I see a lot. Twenty minutes on a call and you will leave with a one-page plan, no sales pitch.</p>' +
    '<p style="margin:0;color:#c7c7cc;font-size:15px;line-height:22px;">Pick a slot below, the call agenda is already pre-filled from your quiz.</p>' +
    button('Book a time', '{{cta_url}}') +
    '</td></tr>'
  ),
};

const discountByOutcome: EmailTemplate = {
  id: 'discount-by-outcome',
  category: 'discount',
  title: 'Discount by outcome',
  oneLiner: 'Offer matched to the respondent\'s outcome.',
  whyQuizNative: 'Different outcomes unlock different offers. One-size discount emails waste margin on customers who would have bought anyway.',
  defaultSubject: '15% off, matched to your {{outcome_name}} result',
  defaultPreheader: 'Only for your result.',
  mergeTags: ['first_name', 'outcome_name', 'cta_url', 'brand_name'],
  html: wrap(
    headerBlock('{{brand_name}}') +
    '<tr><td style="padding:28px 24px 8px;">' +
    '<h1 style="margin:0 0 8px;font-size:22px;line-height:28px;color:#fff;font-weight:600;">A specific offer for a {{outcome_name}}.</h1>' +
    '<p style="margin:0 0 12px;color:#c7c7cc;font-size:15px;line-height:22px;">{{first_name}}, because your quiz landed on {{outcome_name}}, the plan tailored to that result is 15% off this week.</p>' +
    '<div style="margin:0 0 12px;padding:12px 16px;background:#1b1b1e;border:1px dashed #d2ff1d;color:#d2ff1d;font-size:15px;line-height:22px;text-align:center;letter-spacing:0.08em;font-weight:600;">USE CODE: {{outcome_name}}15</div>' +
    button('Claim the offer', '{{cta_url}}') +
    '</td></tr>'
  ),
};

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  postQuizWelcome,
  outcomeRecommendation,
  nurtureByAnswer,
  abandonerReengage,
  consultationBooking,
  discountByOutcome,
];

export function getTemplateById(id: string): EmailTemplate | undefined {
  for (var i = 0; i < EMAIL_TEMPLATES.length; i++) {
    if (EMAIL_TEMPLATES[i].id === id) return EMAIL_TEMPLATES[i];
  }
  return undefined;
}
