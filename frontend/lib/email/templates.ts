// Quiz-native email templates rebuilt as Block[] arrays. Each template is
// designed around a specific moment in the quiz lead-gen lifecycle and
// relies on merge tags that only a quiz funnel can populate. Renders
// through renderBlocks(BrandKit, MergeContext).

import type { EmailTemplate, Block, SiteType } from './blocks';

// --- Hero photo URLs --------------------------------------------------------
// Real stock photos from Unsplash for professional, Canva-quality hero images.
// Each image is 1200x500 (cropped via URL params). Full-bleed, vivid photography.

var HERO_POST_QUIZ = 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=500&fit=crop&crop=center&q=80';

var HERO_OUTCOME = 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200&h=500&fit=crop&crop=center&q=80';

var HERO_NURTURE = 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&h=500&fit=crop&crop=center&q=80';

var HERO_ABANDONER = 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=1200&h=500&fit=crop&crop=center&q=80';

var HERO_BOOKING = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=500&fit=crop&crop=center&q=80';

var HERO_DISCOUNT = 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1200&h=500&fit=crop&crop=center&q=80';

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
    { id: 'hero-1', type: 'hero', variant: 'image', imageUrl: HERO_POST_QUIZ, eyebrow: 'YOUR RESULT', headline: '{{outcome_name}}', subheadline: 'Based on your answers to {{quiz_name}}.', align: 'left' },
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
    { id: 'hero-1', type: 'hero', variant: 'image', imageUrl: HERO_OUTCOME, eyebrow: 'PICKED FOR YOU', headline: 'Three things that fit {{outcome_name}}', subheadline: 'Hand-selected based on your quiz answers.', align: 'left' },
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
    { id: 'hero-1', type: 'hero', variant: 'image', imageUrl: HERO_NURTURE, eyebrow: 'FOLLOWING UP', headline: 'About {{answer:biggest_goal}}', subheadline: 'A short read on what has worked for people in your situation.', align: 'left' },
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
    { id: 'hero-1', type: 'hero', variant: 'image', imageUrl: HERO_ABANDONER, eyebrow: 'ALMOST THERE', headline: 'One question left', subheadline: 'You got most of the way through {{quiz_name}} and we saved your place.', align: 'left' },
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
    { id: 'hero-1', type: 'hero', variant: 'image', imageUrl: HERO_BOOKING, eyebrow: 'OFFER', headline: '15 minutes, on us', subheadline: 'Your {{outcome_name}} result is the kind we love to talk through live.', align: 'left' },
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
    { id: 'hero-1', type: 'hero', variant: 'image', imageUrl: HERO_DISCOUNT, eyebrow: '48 HOURS ONLY', headline: '20% off, matched to {{outcome_name}}', subheadline: 'We picked the product that fits your quiz result and took 20% off for two days.', align: 'left' },
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

var HERO_PORTFOLIO = 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=1200&h=500&fit=crop&crop=center&q=80';

var HERO_RESTAURANT = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=500&fit=crop&crop=center&q=80';

var HERO_SHOP = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=500&fit=crop&crop=center&q=80';

var HERO_BLOG = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=500&fit=crop&crop=center&q=80';

var HERO_WEDDING = 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&h=500&fit=crop&crop=center&q=80';

var HERO_FITNESS = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&h=500&fit=crop&crop=center&q=80';

var HERO_SERVICES = 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=500&fit=crop&crop=center&q=80';

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
    { id: 'hero-1', type: 'hero', variant: 'image', imageUrl: HERO_PORTFOLIO, eyebrow: 'YOUR PORTFOLIO MATCH', headline: '{{outcome_name}}', subheadline: 'The layout that shows your work the way it deserves.', align: 'left' },
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
    { id: 'hero-1', type: 'hero', variant: 'image', imageUrl: HERO_RESTAURANT, eyebrow: 'YOUR MENU MATCH', headline: '{{outcome_name}}', subheadline: 'A menu layout designed for the way your kitchen works.', align: 'left' },
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
    { id: 'hero-1', type: 'hero', variant: 'image', imageUrl: HERO_SHOP, eyebrow: 'YOUR STORE MATCH', headline: '{{outcome_name}}', subheadline: 'A storefront layout matched to your catalog.', align: 'left' },
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
    { id: 'hero-1', type: 'hero', variant: 'image', imageUrl: HERO_BLOG, eyebrow: 'YOUR BLOG PLAN', headline: '{{outcome_name}}', subheadline: 'A layout and cadence built for your writing goals.', align: 'left' },
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
    { id: 'hero-1', type: 'hero', variant: 'image', imageUrl: HERO_WEDDING, eyebrow: 'YOUR THEME', headline: '{{outcome_name}}', subheadline: 'A wedding site that feels like you two.', align: 'left' },
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
    { id: 'hero-1', type: 'hero', variant: 'image', imageUrl: HERO_FITNESS, eyebrow: 'YOUR PROGRAM', headline: '{{outcome_name}}', subheadline: 'Matched to your goals and current fitness level.', align: 'left' },
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
    { id: 'hero-1', type: 'hero', variant: 'image', imageUrl: HERO_SERVICES, eyebrow: 'YOUR PACKAGE MATCH', headline: '{{outcome_name}}', subheadline: 'The right scope for your budget and timeline.', align: 'left' },
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
