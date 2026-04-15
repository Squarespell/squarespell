// Quiz-native email templates rebuilt as Block[] arrays. Each template is
// designed around a specific moment in the quiz lead-gen lifecycle and
// relies on merge tags that only a quiz funnel can populate. Renders
// through renderBlocks(BrandKit, MergeContext).

import type { EmailTemplate, Block } from './blocks';

// --- Inline SVG hero illustrations -----------------------------------------
// Authored in Squarespell's dark/lime palette. Each is 1200x500, full-bleed
// in the hero block. They use currentColor so they adopt the brand's primary
// tone when a light BrandKit overrides backgrounds.

const HERO_POST_QUIZ = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="gA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#141416"/><stop offset="1" stop-color="#0b0b0c"/></linearGradient></defs><rect width="1200" height="500" fill="url(#gA)"/><circle cx="960" cy="120" r="200" fill="#d2ff1d" opacity="0.12"/><circle cx="1050" cy="380" r="120" fill="#d2ff1d" opacity="0.08"/><g transform="translate(140 140)"><rect x="0" y="0" width="420" height="60" rx="30" fill="#d2ff1d"/><text x="210" y="40" text-anchor="middle" font-family="Inter, sans-serif" font-size="22" font-weight="700" fill="#0b0b0c">YOUR RESULT IS READY</text><rect x="0" y="90" width="320" height="14" rx="7" fill="#ececec" opacity="0.2"/><rect x="0" y="118" width="260" height="14" rx="7" fill="#ececec" opacity="0.15"/><rect x="0" y="146" width="180" height="14" rx="7" fill="#ececec" opacity="0.1"/></g></svg>`;

const HERO_OUTCOME = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><rect width="1200" height="500" fill="#0b0b0c"/><g transform="translate(600 250)"><circle r="180" fill="none" stroke="#d2ff1d" stroke-width="2" opacity="0.3"/><circle r="140" fill="none" stroke="#d2ff1d" stroke-width="2" opacity="0.5"/><circle r="100" fill="none" stroke="#d2ff1d" stroke-width="2" opacity="0.7"/><circle r="60" fill="#d2ff1d"/><path d="M-22 0 L-6 16 L24 -16" stroke="#0b0b0c" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g><rect x="140" y="80" width="200" height="10" rx="5" fill="#d2ff1d" opacity="0.6"/><rect x="140" y="100" width="140" height="10" rx="5" fill="#ececec" opacity="0.3"/></svg>`;

const HERO_NURTURE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><rect width="1200" height="500" fill="#141416"/><g opacity="0.7"><rect x="80" y="120" width="300" height="260" rx="18" fill="#0b0b0c" stroke="#d2ff1d" stroke-width="2"/><rect x="110" y="150" width="120" height="10" rx="5" fill="#d2ff1d"/><rect x="110" y="175" width="220" height="8" rx="4" fill="#ececec" opacity="0.3"/><rect x="110" y="195" width="180" height="8" rx="4" fill="#ececec" opacity="0.3"/></g><g opacity="0.9"><rect x="450" y="120" width="300" height="260" rx="18" fill="#0b0b0c" stroke="#d2ff1d" stroke-width="2"/><rect x="480" y="150" width="120" height="10" rx="5" fill="#d2ff1d"/><rect x="480" y="175" width="220" height="8" rx="4" fill="#ececec" opacity="0.3"/><rect x="480" y="195" width="180" height="8" rx="4" fill="#ececec" opacity="0.3"/></g><g><rect x="820" y="120" width="300" height="260" rx="18" fill="#d2ff1d"/><rect x="850" y="150" width="120" height="10" rx="5" fill="#0b0b0c"/><rect x="850" y="175" width="220" height="8" rx="4" fill="#0b0b0c" opacity="0.6"/><rect x="850" y="195" width="180" height="8" rx="4" fill="#0b0b0c" opacity="0.6"/></g></svg>`;

const HERO_ABANDONER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><rect width="1200" height="500" fill="#0b0b0c"/><g transform="translate(600 250)"><circle r="160" fill="#141416" stroke="#d2ff1d" stroke-width="3"/><g transform="rotate(-30)"><rect x="-4" y="-110" width="8" height="120" rx="4" fill="#d2ff1d"/></g><g transform="rotate(60)"><rect x="-4" y="-80" width="8" height="90" rx="4" fill="#ececec"/></g><circle r="10" fill="#d2ff1d"/></g><rect x="140" y="90" width="220" height="12" rx="6" fill="#d2ff1d"/><rect x="140" y="115" width="160" height="8" rx="4" fill="#ececec" opacity="0.3"/></svg>`;

const HERO_BOOKING = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><rect width="1200" height="500" fill="#141416"/><g transform="translate(420 100)"><rect x="0" y="0" width="360" height="300" rx="16" fill="#0b0b0c" stroke="#d2ff1d" stroke-width="2"/><rect x="0" y="0" width="360" height="56" rx="16" fill="#d2ff1d"/><rect x="0" y="40" width="360" height="16" fill="#d2ff1d"/><text x="180" y="36" text-anchor="middle" font-family="Inter, sans-serif" font-size="20" font-weight="700" fill="#0b0b0c">BOOK A CALL</text><g transform="translate(24 84)"><rect width="44" height="44" rx="8" fill="#d2ff1d" opacity="0.2"/><rect x="52" width="44" height="44" rx="8" fill="#d2ff1d" opacity="0.2"/><rect x="104" width="44" height="44" rx="8" fill="#d2ff1d"/><rect x="156" width="44" height="44" rx="8" fill="#d2ff1d" opacity="0.2"/><rect x="208" width="44" height="44" rx="8" fill="#d2ff1d" opacity="0.2"/><rect x="260" width="44" height="44" rx="8" fill="#d2ff1d" opacity="0.2"/><rect y="56" width="44" height="44" rx="8" fill="#d2ff1d" opacity="0.2"/><rect x="52" y="56" width="44" height="44" rx="8" fill="#d2ff1d" opacity="0.2"/><rect x="104" y="56" width="44" height="44" rx="8" fill="#d2ff1d" opacity="0.2"/><rect x="156" y="56" width="44" height="44" rx="8" fill="#d2ff1d" opacity="0.2"/><rect x="208" y="56" width="44" height="44" rx="8" fill="#d2ff1d" opacity="0.2"/><rect x="260" y="56" width="44" height="44" rx="8" fill="#d2ff1d" opacity="0.2"/></g></g></svg>`;

const HERO_DISCOUNT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><rect width="1200" height="500" fill="#0b0b0c"/><g transform="translate(600 250)"><g><circle r="200" fill="#d2ff1d"/><circle r="160" fill="#0b0b0c"/><text y="12" text-anchor="middle" font-family="Inter, sans-serif" font-size="84" font-weight="800" fill="#d2ff1d">20%</text><text y="60" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" font-weight="600" fill="#ececec" letter-spacing="4">OFF</text></g></g><rect x="140" y="100" width="260" height="12" rx="6" fill="#d2ff1d"/><rect x="140" y="125" width="200" height="8" rx="4" fill="#ececec" opacity="0.3"/></svg>`;

// --- Templates --------------------------------------------------------------

const postQuizWelcome: EmailTemplate = {
  id: 'post-quiz-welcome',
  category: 'post-quiz',
  title: 'Post-quiz welcome',
  oneLiner: 'Delivers the result the moment the quiz ends. The most-opened email a quiz sends.',
  whyQuizNative: 'Headline is the outcome name. Stat shows their score. Body references their top answer. Impossible to build with a generic email tool.',
  defaultSubject: '{{first_name}}, your result is ready: {{outcome_name}}',
  defaultPreheader: 'Based on your answers to {{quiz_name}}.',
  mergeTags: ['first_name', 'outcome_name', 'outcome_description', 'outcome_score', 'quiz_name', 'answer:biggest_goal', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_POST_QUIZ, eyebrow: 'YOUR RESULT', headline: '{{outcome_name}}', subheadline: 'Based on your answers to {{quiz_name}}.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'heading-1', type: 'heading', level: 2, text: 'Hi {{first_name}}, here is what we found.' },
    { id: 'text-1', type: 'text', content: '{{outcome_description}} You told us your biggest goal was <strong>{{answer:biggest_goal}}</strong>, so we picked this result with that in mind.' },
    { id: 'spacer-2', type: 'spacer', height: 24 },
    { id: 'stat-1', type: 'stat', columns: 3, items: [
      { value: '{{outcome_score}}', label: 'Your match score' },
      { value: '4.9', label: 'Average rating' },
      { value: '5 min', label: 'To get started' },
    ]},
    { id: 'spacer-3', type: 'spacer', height: 32 },
    { id: 'button-1', type: 'button', label: 'See the full plan', url: '{{cta_url}}', variant: 'primary', align: 'left' },
    { id: 'divider-1', type: 'divider', style: 'solid' },
    { id: 'sig-1', type: 'signature', name: 'The {{brand_name}} team', title: 'Here if you need us', message: 'Reply to this email with any question, we read every one.' },
    { id: 'ps-1', type: 'postscript', content: 'P.S. Save this email. Your result link stays live for 30 days.' },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true },
  ],
};

const outcomeRecommendation: EmailTemplate = {
  id: 'outcome-recommendation',
  category: 'outcome',
  title: 'Outcome recommendation',
  oneLiner: 'Three recommendations tailored to the quiz outcome, shown in a card grid.',
  whyQuizNative: 'The three cards are chosen by outcome, not by broadcast. Each card CTA is outcome-specific and deep-linked.',
  defaultSubject: 'Three things we picked for your {{outcome_name}} result',
  defaultPreheader: 'Hand-picked for your answers, not a generic list.',
  mergeTags: ['first_name', 'outcome_name', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_OUTCOME, eyebrow: 'PICKED FOR YOU', headline: 'Three things that fit {{outcome_name}}', subheadline: 'Hand-selected based on your quiz answers.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'text-1', type: 'text', content: 'Hi {{first_name}}, instead of dropping you into a catalog, we narrowed it down to three things that match your result. Start with whichever feels most useful.' },
    { id: 'spacer-2', type: 'spacer', height: 24 },
    { id: 'cards-1', type: 'cardGrid', columns: 3, cards: [
      { id: 'c1', title: 'Start here', body: 'The single best first step for your result.', ctaLabel: 'Open', ctaUrl: '{{cta_url}}' },
      { id: 'c2', title: 'The template', body: 'A ready-made version you can duplicate in one click.', ctaLabel: 'Get it', ctaUrl: '{{cta_url}}' },
      { id: 'c3', title: 'Book a call', body: 'Talk to a human if you want a second opinion.', ctaLabel: 'Pick a time', ctaUrl: '{{cta_url}}' },
    ]},
    { id: 'spacer-3', type: 'spacer', height: 32 },
    { id: 'test-1', type: 'testimonial', quote: 'The quiz put me on the exact template I needed. Saved me a week of research.', authorName: 'Priya S.', authorTitle: 'Independent designer', rating: 5 },
    { id: 'spacer-4', type: 'spacer', height: 32 },
    { id: 'button-1', type: 'button', label: 'See all three', url: '{{cta_url}}', variant: 'primary', align: 'left' },
    { id: 'ps-1', type: 'postscript', content: 'P.S. These recommendations change as we learn more. Retake the quiz in a few months and the list will look different.' },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true },
  ],
};

const nurtureByAnswer: EmailTemplate = {
  id: 'nurture-by-answer',
  category: 'nurture',
  title: 'Nurture by answer',
  oneLiner: 'Day-3 follow-up that references the exact answer the recipient gave to a key question.',
  whyQuizNative: 'The subject line and body both quote back a specific quiz answer. A generic newsletter tool cannot do this.',
  defaultSubject: 'About {{answer:biggest_goal}} - here is what usually works',
  defaultPreheader: 'Following up on your quiz result.',
  mergeTags: ['first_name', 'answer:biggest_goal', 'outcome_name', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_NURTURE, eyebrow: 'FOLLOWING UP', headline: 'About {{answer:biggest_goal}}', subheadline: 'A short read on what has worked for people in your situation.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'text-1', type: 'text', content: 'Hi {{first_name}}, when you took our quiz you told us your biggest goal was <strong>{{answer:biggest_goal}}</strong>. That is the most common answer we see for people who land on {{outcome_name}}, and there is a short playbook that usually works.' },
    { id: 'heading-1', type: 'heading', level: 3, text: 'The three things to do first' },
    { id: 'text-2', type: 'text', content: '<strong>1.</strong> Pick one channel and stop trying to be everywhere.<br/><strong>2.</strong> Write one clear offer before you design anything.<br/><strong>3.</strong> Ship a v1 in a week, not a quarter.' },
    { id: 'spacer-2', type: 'spacer', height: 24 },
    { id: 'button-1', type: 'button', label: 'Read the full playbook', url: '{{cta_url}}', variant: 'secondary', align: 'left' },
    { id: 'divider-1', type: 'divider', style: 'solid' },
    { id: 'sig-1', type: 'signature', name: 'Hit reply any time', message: 'If any of this does not fit your situation, tell me what is different. I read every reply.' },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true },
  ],
};

const abandonerReengage: EmailTemplate = {
  id: 'abandoner-reengage',
  category: 'abandoner',
  title: 'Abandoner re-engage',
  oneLiner: 'Fires when someone gave an email mid-quiz but never finished. Offers to finish for them.',
  whyQuizNative: 'Only triggers because the quiz captured email before the last question. No other email tool knows a quiz was abandoned.',
  defaultSubject: '{{first_name}}, your result is one question away',
  defaultPreheader: 'You got most of the way - we saved your progress.',
  mergeTags: ['first_name', 'quiz_name', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_ABANDONER, eyebrow: 'ALMOST THERE', headline: 'One question left', subheadline: 'You got most of the way through {{quiz_name}} and we saved your place.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'text-1', type: 'text', content: 'Hi {{first_name}}, you stepped away before we showed your result. Your answers are saved. One more question and we can send you the match.' },
    { id: 'spacer-2', type: 'spacer', height: 24 },
    { id: 'stat-1', type: 'stat', columns: 2, items: [
      { value: '60 sec', label: 'To finish' },
      { value: 'Saved', label: 'Your progress' },
    ]},
    { id: 'spacer-3', type: 'spacer', height: 32 },
    { id: 'button-1', type: 'button', label: 'Pick up where I left off', url: '{{cta_url}}', variant: 'primary', align: 'left' },
    { id: 'ps-1', type: 'postscript', content: 'P.S. If you already got an answer elsewhere, no hard feelings. Reply STOP and we will not send another reminder.' },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true },
  ],
};

const consultationBooking: EmailTemplate = {
  id: 'consultation-booking',
  category: 'booking',
  title: 'Consultation booking',
  oneLiner: 'Invites the recipient to book a call, tuned to outcomes that signal high intent.',
  whyQuizNative: 'Only sent to outcomes flagged as consultation-ready. The generic email world blasts booking links to everyone.',
  defaultSubject: '{{first_name}}, want a 15-minute look at this?',
  defaultPreheader: 'Based on your {{outcome_name}} result.',
  mergeTags: ['first_name', 'outcome_name', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_BOOKING, eyebrow: 'OFFER', headline: '15 minutes, on us', subheadline: 'Your {{outcome_name}} result is the kind we love to talk through live.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'text-1', type: 'text', content: 'Hi {{first_name}}, I looked at your quiz answers and I think a short call would save you a month of second-guessing. No slides, no pitch, just a working session on your specific situation.' },
    { id: 'heading-1', type: 'heading', level: 3, text: 'What we will cover' },
    { id: 'text-2', type: 'text', content: 'Your current setup in your own words. The single biggest blocker. A concrete next step you can ship this week. That is it.' },
    { id: 'spacer-2', type: 'spacer', height: 32 },
    { id: 'button-1', type: 'button', label: 'Pick a time', url: '{{cta_url}}', variant: 'primary', align: 'left' },
    { id: 'divider-1', type: 'divider', style: 'solid' },
    { id: 'test-1', type: 'testimonial', quote: 'I thought it was a sales call. It was not. I walked away with three things I shipped the same week.', authorName: 'Marcus T.', authorTitle: 'Founder, early-stage SaaS', rating: 5 },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true },
  ],
};

const discountByOutcome: EmailTemplate = {
  id: 'discount-by-outcome',
  category: 'discount',
  title: 'Discount by outcome',
  oneLiner: '48-hour discount matched to the recipient\u2019s quiz outcome. Only sent to segments that need a nudge.',
  whyQuizNative: 'The discount amount and product are chosen per outcome. Not a broadcast blast.',
  defaultSubject: '{{first_name}}, 20% off the thing that fits your result',
  defaultPreheader: '48 hours, matched to {{outcome_name}}.',
  mergeTags: ['first_name', 'outcome_name', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_DISCOUNT, eyebrow: '48 HOURS ONLY', headline: '20% off, matched to {{outcome_name}}', subheadline: 'We picked the product that fits your quiz result and took 20% off for two days.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'text-1', type: 'text', content: 'Hi {{first_name}}, most offer emails are generic. This one is not. We looked at your {{outcome_name}} result and the 20% is tied to the one product that actually matches it.' },
    { id: 'spacer-2', type: 'spacer', height: 16 },
    { id: 'stat-1', type: 'stat', columns: 3, items: [
      { value: '20%', label: 'Off your match' },
      { value: '48 hrs', label: 'Until it expires' },
      { value: '1-click', label: 'Code applies itself' },
    ]},
    { id: 'spacer-3', type: 'spacer', height: 32 },
    { id: 'button-1', type: 'button', label: 'Claim my 20%', url: '{{cta_url}}', variant: 'primary', align: 'left' },
    { id: 'ps-1', type: 'postscript', content: 'P.S. No code to remember. The link applies the discount automatically.' },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true, legalNote: 'Offer expires 48 hours from send. One use per account.' },
  ],
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

// Keyed category labels for filter chips and gallery headers.
export const CATEGORY_LABELS: Record<string, string> = {
  'post-quiz': 'Post-quiz',
  'outcome': 'By outcome',
  'nurture': 'Nurture',
  'abandoner': 'Abandoner',
  'booking': 'Booking',
  'discount': 'Discount',
};
