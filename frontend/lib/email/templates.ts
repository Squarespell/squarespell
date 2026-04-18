// Quiz-native email templates rebuilt as Block[] arrays. Each template is
// designed around a specific moment in the quiz lead-gen lifecycle and
// relies on merge tags that only a quiz funnel can populate. Renders
// through renderBlocks(BrandKit, MergeContext).

import type { EmailTemplate, Block, SiteType } from './blocks';

// --- Inline SVG hero illustrations -----------------------------------------
// Authored in Squarespell's dark/lime palette. Each is 1200x500, full-bleed
// in the hero block. They use currentColor so they adopt the brand's primary
// tone when a light BrandKit overrides backgrounds.

const HERO_POST_QUIZ = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="gA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F7F7F5"/></linearGradient></defs><rect width="1200" height="500" fill="url(#gA)"/><circle cx="960" cy="120" r="200" fill="#0D7377" opacity="0.12"/><circle cx="1050" cy="380" r="120" fill="#0D7377" opacity="0.08"/><g transform="translate(140 140)"><rect x="0" y="0" width="420" height="60" rx="30" fill="#0D7377"/><text x="210" y="40" text-anchor="middle" font-family="Inter, sans-serif" font-size="22" font-weight="700" fill="#F7F7F5">YOUR RESULT IS READY</text><rect x="0" y="90" width="320" height="14" rx="7" fill="#1A1A1A" opacity="0.2"/><rect x="0" y="118" width="260" height="14" rx="7" fill="#1A1A1A" opacity="0.15"/><rect x="0" y="146" width="180" height="14" rx="7" fill="#1A1A1A" opacity="0.1"/></g></svg>`;

const HERO_OUTCOME = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><rect width="1200" height="500" fill="#F7F7F5"/><g transform="translate(600 250)"><circle r="180" fill="none" stroke="#0D7377" stroke-width="2" opacity="0.3"/><circle r="140" fill="none" stroke="#0D7377" stroke-width="2" opacity="0.5"/><circle r="100" fill="none" stroke="#0D7377" stroke-width="2" opacity="0.7"/><circle r="60" fill="#0D7377"/><path d="M-22 0 L-6 16 L24 -16" stroke="#F7F7F5" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g><rect x="140" y="80" width="200" height="10" rx="5" fill="#0D7377" opacity="0.6"/><rect x="140" y="100" width="140" height="10" rx="5" fill="#1A1A1A" opacity="0.3"/></svg>`;

const HERO_NURTURE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><rect width="1200" height="500" fill="#FFFFFF"/><g opacity="0.7"><rect x="80" y="120" width="300" height="260" rx="18" fill="#F7F7F5" stroke="#0D7377" stroke-width="2"/><rect x="110" y="150" width="120" height="10" rx="5" fill="#0D7377"/><rect x="110" y="175" width="220" height="8" rx="4" fill="#1A1A1A" opacity="0.3"/><rect x="110" y="195" width="180" height="8" rx="4" fill="#1A1A1A" opacity="0.3"/></g><g opacity="0.9"><rect x="450" y="120" width="300" height="260" rx="18" fill="#F7F7F5" stroke="#0D7377" stroke-width="2"/><rect x="480" y="150" width="120" height="10" rx="5" fill="#0D7377"/><rect x="480" y="175" width="220" height="8" rx="4" fill="#1A1A1A" opacity="0.3"/><rect x="480" y="195" width="180" height="8" rx="4" fill="#1A1A1A" opacity="0.3"/></g><g><rect x="820" y="120" width="300" height="260" rx="18" fill="#0D7377"/><rect x="850" y="150" width="120" height="10" rx="5" fill="#F7F7F5"/><rect x="850" y="175" width="220" height="8" rx="4" fill="#F7F7F5" opacity="0.6"/><rect x="850" y="195" width="180" height="8" rx="4" fill="#F7F7F5" opacity="0.6"/></g></svg>`;

const HERO_ABANDONER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><rect width="1200" height="500" fill="#F7F7F5"/><g transform="translate(600 250)"><circle r="160" fill="#FFFFFF" stroke="#0D7377" stroke-width="3"/><g transform="rotate(-30)"><rect x="-4" y="-110" width="8" height="120" rx="4" fill="#0D7377"/></g><g transform="rotate(60)"><rect x="-4" y="-80" width="8" height="90" rx="4" fill="#1A1A1A"/></g><circle r="10" fill="#0D7377"/></g><rect x="140" y="90" width="220" height="12" rx="6" fill="#0D7377"/><rect x="140" y="115" width="160" height="8" rx="4" fill="#1A1A1A" opacity="0.3"/></svg>`;

const HERO_BOOKING = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><rect width="1200" height="500" fill="#FFFFFF"/><g transform="translate(420 100)"><rect x="0" y="0" width="360" height="300" rx="16" fill="#F7F7F5" stroke="#0D7377" stroke-width="2"/><rect x="0" y="0" width="360" height="56" rx="16" fill="#0D7377"/><rect x="0" y="40" width="360" height="16" fill="#0D7377"/><text x="180" y="36" text-anchor="middle" font-family="Inter, sans-serif" font-size="20" font-weight="700" fill="#F7F7F5">BOOK A CALL</text><g transform="translate(24 84)"><rect width="44" height="44" rx="8" fill="#0D7377" opacity="0.2"/><rect x="52" width="44" height="44" rx="8" fill="#0D7377" opacity="0.2"/><rect x="104" width="44" height="44" rx="8" fill="#0D7377"/><rect x="156" width="44" height="44" rx="8" fill="#0D7377" opacity="0.2"/><rect x="208" width="44" height="44" rx="8" fill="#0D7377" opacity="0.2"/><rect x="260" width="44" height="44" rx="8" fill="#0D7377" opacity="0.2"/><rect y="56" width="44" height="44" rx="8" fill="#0D7377" opacity="0.2"/><rect x="52" y="56" width="44" height="44" rx="8" fill="#0D7377" opacity="0.2"/><rect x="104" y="56" width="44" height="44" rx="8" fill="#0D7377" opacity="0.2"/><rect x="156" y="56" width="44" height="44" rx="8" fill="#0D7377" opacity="0.2"/><rect x="208" y="56" width="44" height="44" rx="8" fill="#0D7377" opacity="0.2"/><rect x="260" y="56" width="44" height="44" rx="8" fill="#0D7377" opacity="0.2"/></g></g></svg>`;

const HERO_DISCOUNT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><rect width="1200" height="500" fill="#F7F7F5"/><g transform="translate(600 250)"><g><circle r="200" fill="#0D7377"/><circle r="160" fill="#F7F7F5"/><text y="12" text-anchor="middle" font-family="Inter, sans-serif" font-size="84" font-weight="800" fill="#0D7377">20%</text><text y="60" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" font-weight="600" fill="#1A1A1A" letter-spacing="4">OFF</text></g></g><rect x="140" y="100" width="260" height="12" rx="6" fill="#0D7377"/><rect x="140" y="125" width="200" height="8" rx="4" fill="#1A1A1A" opacity="0.3"/></svg>`;

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

// --- Site-type hero illustrations --------------------------------------------

const HERO_PORTFOLIO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><rect width="1200" height="500" fill="#F7F7F5"/><g transform="translate(100 60)"><rect width="300" height="200" rx="12" fill="#FFFFFF" stroke="#0D7377" stroke-width="2"/><rect x="12" y="12" width="276" height="140" rx="6" fill="#E4E3E0"/><rect x="12" y="164" width="120" height="8" rx="4" fill="#0D7377"/><rect x="12" y="180" width="80" height="6" rx="3" fill="#1A1A1A" opacity="0.3"/></g><g transform="translate(440 60)"><rect width="300" height="200" rx="12" fill="#FFFFFF" stroke="#0D7377" stroke-width="2"/><rect x="12" y="12" width="276" height="140" rx="6" fill="#E4E3E0"/><rect x="12" y="164" width="100" height="8" rx="4" fill="#0D7377"/><rect x="12" y="180" width="60" height="6" rx="3" fill="#1A1A1A" opacity="0.3"/></g><g transform="translate(780 60)"><rect width="300" height="200" rx="12" fill="#0D7377"/><rect x="12" y="12" width="276" height="140" rx="6" fill="#F7F7F5"/><rect x="12" y="164" width="140" height="8" rx="4" fill="#F7F7F5"/><rect x="12" y="180" width="90" height="6" rx="3" fill="#F7F7F5" opacity="0.5"/></g><g transform="translate(100 300)"><rect width="460" height="140" rx="12" fill="#FFFFFF"/><circle cx="70" cy="70" r="40" fill="#0D7377" opacity="0.3"/><rect x="130" y="40" width="200" height="10" rx="5" fill="#0D7377"/><rect x="130" y="60" width="280" height="8" rx="4" fill="#1A1A1A" opacity="0.2"/><rect x="130" y="78" width="240" height="8" rx="4" fill="#1A1A1A" opacity="0.15"/></g></svg>`;

const HERO_RESTAURANT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><rect width="1200" height="500" fill="#FFFFFF"/><circle cx="600" cy="250" r="180" fill="#F7F7F5" stroke="#0D7377" stroke-width="2"/><circle cx="600" cy="250" r="140" fill="#FFFFFF"/><g transform="translate(600 250)"><rect x="-60" y="-80" width="8" height="100" rx="4" fill="#0D7377"/><rect x="-40" y="-70" width="8" height="90" rx="4" fill="#0D7377" opacity="0.8"/><rect x="-20" y="-60" width="8" height="80" rx="4" fill="#0D7377" opacity="0.6"/><rect x="12" y="-80" width="4" height="100" rx="2" fill="#1A1A1A" opacity="0.5"/><rect x="24" y="-70" width="4" height="80" rx="2" fill="#1A1A1A" opacity="0.4"/><rect x="36" y="-60" width="4" height="60" rx="2" fill="#1A1A1A" opacity="0.3"/><ellipse cx="0" cy="40" rx="80" ry="20" fill="#0D7377" opacity="0.15"/></g><rect x="140" y="80" width="180" height="12" rx="6" fill="#0D7377"/><rect x="140" y="102" width="120" height="8" rx="4" fill="#1A1A1A" opacity="0.3"/><rect x="880" y="80" width="180" height="12" rx="6" fill="#0D7377" opacity="0.5"/><rect x="880" y="102" width="120" height="8" rx="4" fill="#1A1A1A" opacity="0.2"/></svg>`;

const HERO_SHOP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><rect width="1200" height="500" fill="#F7F7F5"/><g transform="translate(340 80)"><rect width="520" height="340" rx="16" fill="#FFFFFF" stroke="#0D7377" stroke-width="2"/><rect x="20" y="20" width="230" height="200" rx="10" fill="#E4E3E0"/><rect x="270" y="20" width="230" height="200" rx="10" fill="#E4E3E0"/><rect x="20" y="236" width="120" height="10" rx="5" fill="#0D7377"/><rect x="20" y="256" width="80" height="8" rx="4" fill="#1A1A1A" opacity="0.3"/><rect x="20" y="280" width="100" height="36" rx="8" fill="#0D7377"/><text x="70" y="304" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="700" fill="#F7F7F5">ADD</text><rect x="270" y="236" width="140" height="10" rx="5" fill="#0D7377"/><rect x="270" y="256" width="100" height="8" rx="4" fill="#1A1A1A" opacity="0.3"/><rect x="270" y="280" width="100" height="36" rx="8" fill="#0D7377"/><text x="320" y="304" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="700" fill="#F7F7F5">ADD</text></g></svg>`;

const HERO_BLOG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><rect width="1200" height="500" fill="#FFFFFF"/><g transform="translate(160 60)"><rect width="880" height="380" rx="14" fill="#F7F7F5"/><rect x="40" y="40" width="340" height="14" rx="7" fill="#0D7377"/><rect x="40" y="68" width="500" height="10" rx="5" fill="#1A1A1A" opacity="0.25"/><rect x="40" y="90" width="460" height="10" rx="5" fill="#1A1A1A" opacity="0.2"/><rect x="40" y="112" width="420" height="10" rx="5" fill="#1A1A1A" opacity="0.15"/><rect x="40" y="152" width="360" height="12" rx="6" fill="#0D7377" opacity="0.6"/><rect x="40" y="178" width="500" height="10" rx="5" fill="#1A1A1A" opacity="0.25"/><rect x="40" y="200" width="480" height="10" rx="5" fill="#1A1A1A" opacity="0.2"/><rect x="40" y="222" width="440" height="10" rx="5" fill="#1A1A1A" opacity="0.15"/><rect x="40" y="260" width="200" height="44" rx="10" fill="#0D7377"/><text x="140" y="288" text-anchor="middle" font-family="Inter, sans-serif" font-size="16" font-weight="700" fill="#F7F7F5">READ MORE</text><rect x="600" y="40" width="240" height="180" rx="10" fill="#E4E3E0"/><rect x="600" y="240" width="240" height="120" rx="10" fill="#E4E3E0"/></g></svg>`;

const HERO_WEDDING = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><rect width="1200" height="500" fill="#F7F7F5"/><g transform="translate(600 250)"><circle r="200" fill="none" stroke="#0D7377" stroke-width="1" opacity="0.3"/><circle r="160" fill="none" stroke="#0D7377" stroke-width="1" opacity="0.5"/><circle r="120" fill="none" stroke="#0D7377" stroke-width="1" opacity="0.7"/><path d="M0 -60 C30 -90, 60 -60, 60 -30 C60 10, 0 50, 0 50 C0 50, -60 10, -60 -30 C-60 -60, -30 -90, 0 -60Z" fill="#0D7377" opacity="0.8"/><path d="M-3 -40 C7 -50, 20 -42, 20 -30 C20 -14, -3 10, -3 10 C-3 10, -26 -14, -26 -30 C-26 -42, -13 -50, -3 -40Z" fill="#F7F7F5" opacity="0.4"/></g><rect x="140" y="80" width="260" height="14" rx="7" fill="#0D7377"/><rect x="140" y="104" width="180" height="8" rx="4" fill="#1A1A1A" opacity="0.3"/><rect x="800" y="80" width="260" height="14" rx="7" fill="#0D7377" opacity="0.4"/><rect x="800" y="104" width="180" height="8" rx="4" fill="#1A1A1A" opacity="0.2"/></svg>`;

const HERO_FITNESS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><rect width="1200" height="500" fill="#F7F7F5"/><g transform="translate(600 250)"><rect x="-200" y="-12" width="400" height="24" rx="12" fill="#FFFFFF" stroke="#0D7377" stroke-width="2"/><rect x="-160" y="-40" width="40" height="80" rx="6" fill="#0D7377"/><rect x="120" y="-40" width="40" height="80" rx="6" fill="#0D7377"/><rect x="-220" y="-30" width="30" height="60" rx="6" fill="#0D7377" opacity="0.7"/><rect x="190" y="-30" width="30" height="60" rx="6" fill="#0D7377" opacity="0.7"/><circle cx="-260" cy="0" r="20" fill="#0D7377" opacity="0.5"/><circle cx="260" cy="0" r="20" fill="#0D7377" opacity="0.5"/></g><g transform="translate(140 80)"><rect width="160" height="60" rx="10" fill="#0D7377"/><text x="80" y="36" text-anchor="middle" font-family="Inter, sans-serif" font-size="24" font-weight="800" fill="#F7F7F5">FIT</text></g><g transform="translate(140 160)"><rect width="200" height="8" rx="4" fill="#1A1A1A" opacity="0.3"/><rect y="18" width="160" height="8" rx="4" fill="#1A1A1A" opacity="0.2"/></g></svg>`;

const HERO_SERVICES = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="auto" preserveAspectRatio="xMidYMid slice"><rect width="1200" height="500" fill="#FFFFFF"/><g transform="translate(160 80)"><rect width="380" height="340" rx="14" fill="#F7F7F5" stroke="#0D7377" stroke-width="2"/><circle cx="190" cy="100" r="50" fill="#0D7377" opacity="0.2"/><path d="M170 80 L190 60 L210 80 L200 80 L200 110 L180 110 L180 80Z" fill="#0D7377"/><rect x="80" y="170" width="220" height="12" rx="6" fill="#0D7377"/><rect x="100" y="196" width="180" height="8" rx="4" fill="#1A1A1A" opacity="0.3"/><rect x="110" y="216" width="160" height="8" rx="4" fill="#1A1A1A" opacity="0.2"/><rect x="110" y="260" width="160" height="44" rx="10" fill="#0D7377"/><text x="190" y="288" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="700" fill="#F7F7F5">BOOK NOW</text></g><g transform="translate(620 80)"><rect width="380" height="160" rx="14" fill="#F7F7F5"/><rect x="20" y="20" width="100" height="8" rx="4" fill="#0D7377"/><rect x="20" y="40" width="340" height="6" rx="3" fill="#1A1A1A" opacity="0.2"/><rect x="20" y="56" width="300" height="6" rx="3" fill="#1A1A1A" opacity="0.15"/><rect x="20" y="80" width="80" height="4" rx="2" fill="#0D7377" opacity="0.4"/><rect x="20" y="96" width="340" height="40" rx="8" fill="#0D7377" opacity="0.1"/></g><g transform="translate(620 260)"><rect width="380" height="160" rx="14" fill="#F7F7F5"/><rect x="20" y="20" width="120" height="8" rx="4" fill="#0D7377"/><rect x="20" y="40" width="320" height="6" rx="3" fill="#1A1A1A" opacity="0.2"/><rect x="20" y="56" width="280" height="6" rx="3" fill="#1A1A1A" opacity="0.15"/></g></svg>`;

// --- Site-type templates -----------------------------------------------------

const portfolioResult: EmailTemplate = {
  id: 'site-portfolio',
  category: 'post-quiz',
  siteType: 'portfolio',
  title: 'Portfolio: style match',
  oneLiner: 'Tells a photographer or designer which portfolio layout fits their work best.',
  whyQuizNative: 'The recommended layout is derived from answers about their medium, volume, and client type. No broadcast tool knows this.',
  defaultSubject: '{{first_name}}, the layout that fits your work',
  defaultPreheader: 'Based on your answers about your portfolio.',
  mergeTags: ['first_name', 'outcome_name', 'outcome_description', 'quiz_name', 'answer:medium', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_PORTFOLIO, eyebrow: 'YOUR PORTFOLIO MATCH', headline: '{{outcome_name}}', subheadline: 'The layout that shows your work the way it deserves.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'heading-1', type: 'heading', level: 2, text: 'Hi {{first_name}}, we matched your work to a layout.' },
    { id: 'text-1', type: 'text', content: '{{outcome_description}} You told us your primary medium is <strong>{{answer:medium}}</strong>, so we picked a grid and spacing system that lets that format breathe.' },
    { id: 'spacer-2', type: 'spacer', height: 24 },
    { id: 'cards-1', type: 'cardGrid', columns: 3, cards: [
      { id: 'c1', title: 'Preview it live', body: 'See the layout with placeholder work before you commit.', ctaLabel: 'Preview', ctaUrl: '{{cta_url}}' },
      { id: 'c2', title: 'Upload your images', body: 'Drag your best 6 pieces in and see the real thing.', ctaLabel: 'Start', ctaUrl: '{{cta_url}}' },
      { id: 'c3', title: 'Need help?', body: 'Reply to this email and our team will help you set up.', ctaLabel: 'Reply', ctaUrl: 'mailto:' },
    ]},
    { id: 'spacer-3', type: 'spacer', height: 32 },
    { id: 'button-1', type: 'button', label: 'See your layout', url: '{{cta_url}}', variant: 'primary', align: 'left' },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true },
  ],
};

const restaurantResult: EmailTemplate = {
  id: 'site-restaurant',
  category: 'post-quiz',
  siteType: 'restaurant',
  title: 'Restaurant: menu style',
  oneLiner: 'Recommends a menu layout and online ordering setup based on the restaurant type.',
  whyQuizNative: 'Menu format, ordering flow, and imagery style are derived from quiz answers about cuisine type and service model.',
  defaultSubject: '{{first_name}}, the menu style that fits your restaurant',
  defaultPreheader: 'Your quiz result from {{quiz_name}}.',
  mergeTags: ['first_name', 'outcome_name', 'outcome_description', 'quiz_name', 'answer:cuisine_type', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_RESTAURANT, eyebrow: 'YOUR MENU MATCH', headline: '{{outcome_name}}', subheadline: 'A menu layout designed for the way your kitchen works.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'heading-1', type: 'heading', level: 2, text: 'Hi {{first_name}}, we picked a layout for your menu.' },
    { id: 'text-1', type: 'text', content: '{{outcome_description}} Since you told us you serve <strong>{{answer:cuisine_type}}</strong>, we chose a format that puts the right photos in the right places and keeps the ordering flow simple for your guests.' },
    { id: 'spacer-2', type: 'spacer', height: 24 },
    { id: 'stat-1', type: 'stat', columns: 3, items: [
      { value: '2 min', label: 'Menu setup' },
      { value: 'Mobile', label: 'QR-ready' },
      { value: 'Built-in', label: 'Online orders' },
    ]},
    { id: 'spacer-3', type: 'spacer', height: 32 },
    { id: 'button-1', type: 'button', label: 'Preview your menu', url: '{{cta_url}}', variant: 'primary', align: 'left' },
    { id: 'divider-1', type: 'divider', style: 'solid' },
    { id: 'test-1', type: 'testimonial', quote: 'We switched to this layout and online orders jumped 40% in the first month.', authorName: 'Chef Maria L.', authorTitle: 'Trattoria Luce', rating: 5 },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true },
  ],
};

const shopResult: EmailTemplate = {
  id: 'site-shop',
  category: 'outcome',
  siteType: 'shop',
  title: 'Shop: product display',
  oneLiner: 'Recommends a product grid and checkout flow based on catalog size and product type.',
  whyQuizNative: 'Grid density, image ratio, and checkout complexity are determined by quiz answers. A broadcast email would show everyone the same layout.',
  defaultSubject: '{{first_name}}, the storefront that fits your catalog',
  defaultPreheader: 'Matched to your {{outcome_name}} result.',
  mergeTags: ['first_name', 'outcome_name', 'outcome_description', 'answer:product_count', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_SHOP, eyebrow: 'YOUR STORE MATCH', headline: '{{outcome_name}}', subheadline: 'A storefront layout matched to your catalog.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'text-1', type: 'text', content: 'Hi {{first_name}}, you told us you have around <strong>{{answer:product_count}}</strong> products. {{outcome_description}} Here is the layout we recommend based on that catalog size.' },
    { id: 'spacer-2', type: 'spacer', height: 24 },
    { id: 'cards-1', type: 'cardGrid', columns: 2, cards: [
      { id: 'c1', title: 'Product grid', body: 'See how your products look in the recommended grid density.', ctaLabel: 'Preview', ctaUrl: '{{cta_url}}' },
      { id: 'c2', title: 'Checkout flow', body: 'Test the one-page checkout tuned for your product type.', ctaLabel: 'Try it', ctaUrl: '{{cta_url}}' },
    ]},
    { id: 'spacer-3', type: 'spacer', height: 32 },
    { id: 'button-1', type: 'button', label: 'Set up your store', url: '{{cta_url}}', variant: 'primary', align: 'left' },
    { id: 'ps-1', type: 'postscript', content: 'P.S. You can switch layouts any time. Start with this one and adjust once your first products are live.' },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true },
  ],
};

const blogResult: EmailTemplate = {
  id: 'site-blog',
  category: 'nurture',
  siteType: 'blog',
  title: 'Blog: content strategy',
  oneLiner: 'Delivers a content plan and blog layout matched to the writer\'s niche and posting cadence.',
  whyQuizNative: 'The blog template, post frequency, and content pillars come from quiz answers about niche and goals. Generic email cannot personalize this.',
  defaultSubject: '{{first_name}}, your content plan is ready',
  defaultPreheader: 'A blog layout and posting cadence matched to your niche.',
  mergeTags: ['first_name', 'outcome_name', 'outcome_description', 'answer:niche', 'answer:posting_frequency', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_BLOG, eyebrow: 'YOUR BLOG PLAN', headline: '{{outcome_name}}', subheadline: 'A layout and cadence built for your writing goals.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'heading-1', type: 'heading', level: 2, text: 'Hi {{first_name}}, here is your content blueprint.' },
    { id: 'text-1', type: 'text', content: '{{outcome_description}} You told us you write about <strong>{{answer:niche}}</strong> and aim to post <strong>{{answer:posting_frequency}}</strong>. We built a layout and first-month calendar around those goals.' },
    { id: 'spacer-2', type: 'spacer', height: 24 },
    { id: 'heading-2', type: 'heading', level: 3, text: 'Your first four posts' },
    { id: 'text-2', type: 'text', content: '<strong>1.</strong> The origin story: why you started writing about {{answer:niche}}.<br/><strong>2.</strong> The how-to: one practical thing your reader can do today.<br/><strong>3.</strong> The opinion: a stance that separates you from everyone else.<br/><strong>4.</strong> The roundup: tools or resources you actually use.' },
    { id: 'spacer-3', type: 'spacer', height: 32 },
    { id: 'button-1', type: 'button', label: 'See your blog layout', url: '{{cta_url}}', variant: 'primary', align: 'left' },
    { id: 'sig-1', type: 'signature', name: 'The content team', message: 'Reply any time. We read every response and will help you get your first post live.' },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true },
  ],
};

const weddingResult: EmailTemplate = {
  id: 'site-wedding',
  category: 'post-quiz',
  siteType: 'wedding',
  title: 'Wedding: site theme',
  oneLiner: 'Picks a wedding site theme based on the couple\'s aesthetic, season, and venue style.',
  whyQuizNative: 'Color palette, typography, and layout are selected from quiz answers about venue and season. A generic tool sends the same theme to everyone.',
  defaultSubject: '{{first_name}}, your wedding site theme is ready',
  defaultPreheader: 'Matched to your style from {{quiz_name}}.',
  mergeTags: ['first_name', 'outcome_name', 'outcome_description', 'quiz_name', 'answer:venue_style', 'answer:season', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_WEDDING, eyebrow: 'YOUR THEME', headline: '{{outcome_name}}', subheadline: 'A wedding site that feels like you two.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'heading-1', type: 'heading', level: 2, text: 'Congratulations, {{first_name}}.' },
    { id: 'text-1', type: 'text', content: '{{outcome_description}} You told us your venue is <strong>{{answer:venue_style}}</strong> and your wedding is in <strong>{{answer:season}}</strong>, so we picked a palette and layout that fits that setting perfectly.' },
    { id: 'spacer-2', type: 'spacer', height: 24 },
    { id: 'stat-1', type: 'stat', columns: 3, items: [
      { value: 'RSVP', label: 'Built-in form' },
      { value: 'Registry', label: 'Link included' },
      { value: 'Gallery', label: 'Photo page' },
    ]},
    { id: 'spacer-3', type: 'spacer', height: 32 },
    { id: 'button-1', type: 'button', label: 'Preview your theme', url: '{{cta_url}}', variant: 'primary', align: 'left' },
    { id: 'ps-1', type: 'postscript', content: 'P.S. You can customize the colors and fonts after you pick the theme. Start here and make it yours.' },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true },
  ],
};

const fitnessResult: EmailTemplate = {
  id: 'site-fitness',
  category: 'outcome',
  siteType: 'fitness',
  title: 'Fitness: program match',
  oneLiner: 'Matches a client to a training program or class schedule based on quiz answers about goals and experience.',
  whyQuizNative: 'Program recommendation is driven by fitness level, goals, and schedule. A generic email blasts the same class to everyone.',
  defaultSubject: '{{first_name}}, your program is picked: {{outcome_name}}',
  defaultPreheader: 'Matched to your fitness goals.',
  mergeTags: ['first_name', 'outcome_name', 'outcome_description', 'answer:fitness_goal', 'answer:experience_level', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_FITNESS, eyebrow: 'YOUR PROGRAM', headline: '{{outcome_name}}', subheadline: 'Matched to your goals and current fitness level.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'heading-1', type: 'heading', level: 2, text: 'Hi {{first_name}}, let\'s get moving.' },
    { id: 'text-1', type: 'text', content: '{{outcome_description}} Your goal is <strong>{{answer:fitness_goal}}</strong> and you told us you are at a <strong>{{answer:experience_level}}</strong> level, so this program scales to where you are right now.' },
    { id: 'spacer-2', type: 'spacer', height: 24 },
    { id: 'stat-1', type: 'stat', columns: 3, items: [
      { value: '4x', label: 'Sessions / week' },
      { value: '45 min', label: 'Per session' },
      { value: '8 wks', label: 'Program length' },
    ]},
    { id: 'spacer-3', type: 'spacer', height: 32 },
    { id: 'button-1', type: 'button', label: 'Start your program', url: '{{cta_url}}', variant: 'primary', align: 'left' },
    { id: 'divider-1', type: 'divider', style: 'solid' },
    { id: 'test-1', type: 'testimonial', quote: 'The quiz matched me to the intermediate program and it was exactly right. I would have picked beginner and wasted a month.', authorName: 'Jake R.', authorTitle: 'Member since 2024', rating: 5 },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true },
  ],
};

const servicesResult: EmailTemplate = {
  id: 'site-services',
  category: 'booking',
  siteType: 'services',
  title: 'Services: package match',
  oneLiner: 'Recommends a service package and booking page layout for consultants, coaches, and freelancers.',
  whyQuizNative: 'The recommended package tier and booking flow are determined by quiz answers about budget, timeline, and scope.',
  defaultSubject: '{{first_name}}, the package that fits your project',
  defaultPreheader: 'Based on your answers: {{outcome_name}}.',
  mergeTags: ['first_name', 'outcome_name', 'outcome_description', 'answer:budget_range', 'answer:timeline', 'cta_url'],
  blocks: [
    { id: 'hero-1', type: 'hero', variant: 'illustration', illustrationSvg: HERO_SERVICES, eyebrow: 'YOUR PACKAGE MATCH', headline: '{{outcome_name}}', subheadline: 'The right scope for your budget and timeline.', align: 'left' },
    { id: 'spacer-1', type: 'spacer', height: 32 },
    { id: 'heading-1', type: 'heading', level: 2, text: 'Hi {{first_name}}, we found the right fit.' },
    { id: 'text-1', type: 'text', content: '{{outcome_description}} You told us your budget is around <strong>{{answer:budget_range}}</strong> and your timeline is <strong>{{answer:timeline}}</strong>, so we picked the package that delivers the most value in that window.' },
    { id: 'spacer-2', type: 'spacer', height: 24 },
    { id: 'heading-2', type: 'heading', level: 3, text: 'What is included' },
    { id: 'text-2', type: 'text', content: 'A scoping call to nail down deliverables. Weekly check-ins so nothing drifts. A final review with revisions built in. Everything documented so you own the output.' },
    { id: 'spacer-3', type: 'spacer', height: 32 },
    { id: 'button-1', type: 'button', label: 'Book your scoping call', url: '{{cta_url}}', variant: 'primary', align: 'left' },
    { id: 'sig-1', type: 'signature', name: 'The {{brand_name}} team', title: 'Here to help', message: 'If the package does not quite fit, reply and we will adjust the scope together.' },
    { id: 'footer-1', type: 'footer', showUnsubscribe: true, showPreferenceCenter: true },
  ],
};

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  postQuizWelcome,
  outcomeRecommendation,
  nurtureByAnswer,
  abandonerReengage,
  consultationBooking,
  discountByOutcome,
  portfolioResult,
  restaurantResult,
  shopResult,
  blogResult,
  weddingResult,
  fitnessResult,
  servicesResult,
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

// Keyed site type labels for filter chips in the gallery.
export const SITE_TYPE_LABELS: Record<string, string> = {
  'portfolio': 'Portfolio',
  'restaurant': 'Restaurant',
  'shop': 'Online store',
  'blog': 'Blog',
  'wedding': 'Wedding',
  'fitness': 'Fitness',
  'services': 'Services',
};
