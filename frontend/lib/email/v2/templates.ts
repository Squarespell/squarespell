// ============================================================================
// Phase 3: Tasks 3.1-3.3 - Three Production Templates
// ============================================================================

import type {
  EmailTemplateV2,
  Section,
  Row,
  Column,
  BlockV2,
  GlobalStyles,
} from './schema';
import { uid, DEFAULT_GLOBAL_STYLES, BLOCK_COMPATIBILITY } from './schema';

const C = BLOCK_COMPATIBILITY;

// ---------------------------------------------------------------------------
// Helper: wrap blocks into section > row > column structure
// ---------------------------------------------------------------------------

function makeRow(blocks: BlockV2[], colRatio: string = '100'): Row {
  return {
    id: uid(),
    type: 'row',
    editable: true,
    properties: { columnsRatio: colRatio, stackOnMobile: true, reverseOnMobile: false },
    styles: { paddingTop: 0, paddingBottom: 0, gap: 16 },
    columns: [{
      id: uid(),
      type: 'column',
      editable: true,
      properties: { widthPercent: 100, verticalAlign: 'top' },
      styles: { paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0 },
      blocks,
    }],
  };
}

function makeSection(role: 'header' | 'body' | 'footer', rows: Row[], bg?: string): Section {
  return {
    id: uid(),
    type: 'section',
    editable: true,
    role,
    properties: { label: role.charAt(0).toUpperCase() + role.slice(1) },
    styles: {
      backgroundColor: bg || (role === 'footer' ? '#F7F7F5' : '#FFFFFF'),
      paddingTop: role === 'footer' ? 24 : 32,
      paddingBottom: role === 'footer' ? 24 : 32,
      paddingLeft: 32,
      paddingRight: 32,
    },
    rows,
  };
}

// ---------------------------------------------------------------------------
// Task 3.1 - Quiz Result Email Template
// ---------------------------------------------------------------------------

export const quizResultTemplate: EmailTemplateV2 = {
  metadata: {
    id: 'tpl_quiz_result',
    name: 'Quiz Result Email',
    version: 1,
    createdAt: '2026-04-19T00:00:00.000Z',
    updatedAt: '2026-04-19T00:00:00.000Z',
    tags: ['quiz', 'result', 'post-quiz'],
    thumbnail: '',
    category: 'quiz-result',
    description: 'Delivers the quiz result with score, category, recommendations, and a retake option.',
    subject: '{{first_name}}, your result is ready: {{result_category}}',
    preheader: 'You scored {{score}} - here is what that means.',
    mergeTags: ['first_name', 'score', 'result_category', 'result_description', 'recommendation', 'cta_url', 'quiz_url', 'company_name', 'unsubscribe_link'],
  },
  globalStyles: { ...DEFAULT_GLOBAL_STYLES },
  layout: { type: 'single-column' },
  sections: [
    // HEADER
    makeSection('header', [
      makeRow([
        { id: uid(), type: 'preheader_text', editable: true, compatibility: C.preheader_text, properties: { text: 'You scored {{score}} - here is what that means.' }, styles: {} },
        { id: uid(), type: 'logo', editable: true, compatibility: C.logo, properties: { src: '', alt: 'Logo', width: 140, href: '{{cta_url}}' }, styles: { align: 'left', paddingTop: 16, paddingBottom: 16 } },
      ]),
    ]),

    // BODY
    makeSection('body', [
      makeRow([
        { id: uid(), type: 'score_display', editable: true, compatibility: C.score_display, properties: { scoreValue: '{{score}}', maxScore: '100', label: 'Your match score', format: 'number' }, styles: { align: 'center', scoreColor: '#0D7377', scoreFontSize: 56, scoreFontWeight: 800, labelColor: '#6B7280', labelFontSize: 14, backgroundColor: '#F7F7F5', borderRadius: 16, paddingTop: 32, paddingBottom: 32 } },
      ]),
      makeRow([
        { id: uid(), type: 'result_category', editable: true, compatibility: C.result_category, properties: { categoryName: '{{result_category}}', eyebrow: 'YOUR RESULT', description: '{{result_description}}' }, styles: { align: 'left', eyebrowColor: '#0D7377', eyebrowFontSize: 11, eyebrowLetterSpacing: 2, categoryColor: '#1A1A1A', categoryFontSize: 32, categoryFontWeight: 700, descriptionColor: '#6B7280', descriptionFontSize: 15, paddingTop: 24, paddingBottom: 16 } },
      ]),
      makeRow([
        { id: uid(), type: 'result_description', editable: true, compatibility: C.result_description, properties: { heading: 'What this means for you', body: 'Based on your answers, this result reflects where you are right now. The recommendations below are tailored to help you move forward with clarity and confidence.', showDivider: true }, styles: { headingColor: '#1A1A1A', headingFontSize: 20, bodyColor: '#4B5563', bodyFontSize: 15, lineHeight: 1.6, dividerColor: '#E4E3E0', paddingTop: 12, paddingBottom: 12 } },
      ]),
      makeRow([
        { id: uid(), type: 'recommendation_card', editable: true, compatibility: C.recommendation_card, properties: { imageUrl: '', imageAlt: '', title: 'Our top pick for you', body: '{{recommendation}}', ctaText: 'See the full plan', ctaHref: '{{cta_url}}', badge: 'Recommended' }, styles: { borderRadius: 12, borderColor: '#E4E3E0', backgroundColor: '#FFFFFF', shadow: false, titleFontSize: 18, bodyFontSize: 14, ctaColor: '#FFFFFF', ctaBackgroundColor: '#0D7377', paddingInner: 20 } },
      ]),
      makeRow([
        { id: uid(), type: 'spacer', editable: true, compatibility: C.spacer, properties: { height: 16 }, styles: {} },
      ]),
      makeRow([
        { id: uid(), type: 'retake_quiz_button', editable: true, compatibility: C.retake_quiz_button, properties: { text: 'Retake the quiz', href: '{{quiz_url}}', subtitle: 'Your answers may have changed since last time' }, styles: { align: 'center', backgroundColor: '#F7F7F5', textColor: '#1A1A1A', fontSize: 15, borderRadius: 8, subtitleColor: '#6B7280', subtitleFontSize: 12, paddingTop: 12, paddingBottom: 12 } },
      ]),
      makeRow([
        { id: uid(), type: 'spacer', editable: true, compatibility: C.spacer, properties: { height: 16 }, styles: {} },
      ]),
      makeRow([
        { id: uid(), type: 'blockquote', editable: true, compatibility: C.blockquote, properties: { text: 'The quiz put me on exactly the right path. I stopped guessing and started building within a day.', citation: 'Priya Sharma', citationTitle: 'Independent designer', rating: 5 }, styles: { borderLeftColor: '#0D7377', borderLeftWidth: 3, backgroundColor: '#F7F7F5', fontSize: 16, fontStyle: 'italic', paddingTop: 16, paddingBottom: 16, paddingLeft: 20, paddingRight: 20 } },
      ]),
    ]),

    // FOOTER
    makeSection('footer', [
      makeRow([
        { id: uid(), type: 'unsubscribe_block', editable: true, compatibility: C.unsubscribe_block, properties: { text: 'You received this because you took our quiz.', linkText: 'Unsubscribe', href: '{{unsubscribe_link}}', showPreferenceCenter: true, preferenceLinkText: 'Email preferences', preferenceHref: '{{preference_link}}' }, styles: { align: 'center', color: '#9CA3AF', fontSize: 12, linkColor: '#9CA3AF', paddingTop: 8, paddingBottom: 4 } },
      ]),
      makeRow([
        { id: uid(), type: 'address_block', editable: true, compatibility: C.address_block, properties: { companyName: '{{company_name}}', addressLine1: '651 N Broad St, Suite 201', addressLine2: 'Middletown, DE 19709', showLegal: true, legalText: 'Copyright 2026 {{company_name}}. All rights reserved.' }, styles: { align: 'center', color: '#9CA3AF', fontSize: 11, paddingTop: 4, paddingBottom: 16 } },
      ]),
    ], '#F7F7F5'),
  ],
};

// ---------------------------------------------------------------------------
// Task 3.2 - Lead Nurture Email Template
// ---------------------------------------------------------------------------

export const leadNurtureTemplate: EmailTemplateV2 = {
  metadata: {
    id: 'tpl_lead_nurture',
    name: 'Lead Nurture Email',
    version: 1,
    createdAt: '2026-04-19T00:00:00.000Z',
    updatedAt: '2026-04-19T00:00:00.000Z',
    tags: ['nurture', 'follow-up', 'education'],
    thumbnail: '',
    category: 'lead-nurture',
    description: 'Day-3 follow-up with personalized content, a two-column feature-benefit layout, and social proof.',
    subject: '{{first_name}}, one thing worth reading',
    preheader: 'A short guide based on your quiz result.',
    mergeTags: ['first_name', 'result_category', 'cta_url', 'company_name', 'unsubscribe_link'],
  },
  globalStyles: { ...DEFAULT_GLOBAL_STYLES },
  layout: { type: 'single-column' },
  sections: [
    // HEADER
    makeSection('header', [
      makeRow([
        { id: uid(), type: 'preheader_text', editable: true, compatibility: C.preheader_text, properties: { text: 'A short guide based on your quiz result.' }, styles: {} },
        { id: uid(), type: 'logo', editable: true, compatibility: C.logo, properties: { src: '', alt: 'Logo', width: 140, href: '{{cta_url}}' }, styles: { align: 'left', paddingTop: 16, paddingBottom: 16 } },
      ]),
    ]),

    // BANNER
    makeSection('body', [
      makeRow([
        { id: uid(), type: 'full_width_banner', editable: true, compatibility: C.full_width_banner, properties: { headline: 'Built for your result', subheadline: 'A short playbook for people who landed on {{result_category}}.', ctaText: '', ctaHref: '', backgroundImageUrl: '' }, styles: { backgroundColor: '#0D7377', textColor: '#FFFFFF', textAlign: 'left', minHeight: 160, paddingTop: 40, paddingBottom: 40, paddingLeft: 32, paddingRight: 32, overlayOpacity: 0 } },
      ]),
    ], '#FFFFFF'),

    // BODY
    makeSection('body', [
      makeRow([
        { id: uid(), type: 'heading', editable: true, compatibility: C.heading, properties: { text: 'Hi {{first_name}}, here is what usually works.', level: 2 }, styles: { align: 'left', color: '#1A1A1A', fontSize: 24, fontWeight: 600, letterSpacing: -0.3, paddingTop: 8, paddingBottom: 4 } },
      ]),
      makeRow([
        { id: uid(), type: 'paragraph', editable: true, compatibility: C.paragraph, properties: { html: 'You took our quiz and landed on <strong>{{result_category}}</strong>. Most people with this result share one challenge: knowing where to start. Here is the 3-step playbook that works.' }, styles: { align: 'left', color: '#4B5563', fontSize: 16, lineHeight: 1.6, paddingTop: 4, paddingBottom: 12 } },
      ]),
      makeRow([
        { id: uid(), type: 'two_column_layout', editable: true, compatibility: C.two_column_layout,
          properties: { ratio: '50-50', stackOnMobile: true, reverseOnMobile: false },
          styles: { gap: 20, paddingTop: 8, paddingBottom: 8, backgroundColor: '' },
          leftColumn: [
            { id: uid(), type: 'card_block', editable: true, compatibility: C.card_block, properties: { imageUrl: '', imageAlt: '', title: 'Step 1: Pick one channel', body: 'Stop trying to be everywhere. Choose the platform where your audience already is.', ctaText: 'Read more', ctaHref: '{{cta_url}}' }, styles: { borderRadius: 12, borderColor: '#E4E3E0', backgroundColor: '#FFFFFF', shadow: false, imageHeight: 0, paddingInner: 20 } },
          ],
          rightColumn: [
            { id: uid(), type: 'card_block', editable: true, compatibility: C.card_block, properties: { imageUrl: '', imageAlt: '', title: 'Step 2: Write one clear offer', body: 'Before you design anything, clarify what you are offering and who it is for.', ctaText: 'Read more', ctaHref: '{{cta_url}}' }, styles: { borderRadius: 12, borderColor: '#E4E3E0', backgroundColor: '#FFFFFF', shadow: false, imageHeight: 0, paddingInner: 20 } },
          ],
        } as any,
      ]),
      makeRow([
        { id: uid(), type: 'spacer', editable: true, compatibility: C.spacer, properties: { height: 16 }, styles: {} },
      ]),
      makeRow([
        { id: uid(), type: 'button', editable: true, compatibility: C.button, properties: { text: 'Read the full playbook', href: '{{cta_url}}', variant: 'primary', fullWidth: false }, styles: { align: 'left', backgroundColor: '#0D7377', textColor: '#FFFFFF', fontSize: 16, fontWeight: 600, borderRadius: 8, paddingX: 24, paddingY: 14, marginTop: 8, marginBottom: 8 } },
      ]),
    ]),

    // FOOTER
    makeSection('footer', [
      makeRow([
        { id: uid(), type: 'unsubscribe_block', editable: true, compatibility: C.unsubscribe_block, properties: { text: 'You received this because you took our quiz.', linkText: 'Unsubscribe', href: '{{unsubscribe_link}}', showPreferenceCenter: true, preferenceLinkText: 'Email preferences', preferenceHref: '{{preference_link}}' }, styles: { align: 'center', color: '#9CA3AF', fontSize: 12, linkColor: '#9CA3AF', paddingTop: 8, paddingBottom: 4 } },
      ]),
      makeRow([
        { id: uid(), type: 'address_block', editable: true, compatibility: C.address_block, properties: { companyName: '{{company_name}}', addressLine1: '651 N Broad St, Suite 201', addressLine2: 'Middletown, DE 19709', showLegal: true, legalText: 'Copyright 2026 {{company_name}}. All rights reserved.' }, styles: { align: 'center', color: '#9CA3AF', fontSize: 11, paddingTop: 4, paddingBottom: 16 } },
      ]),
    ], '#F7F7F5'),
  ],
};

// ---------------------------------------------------------------------------
// Task 3.3 - Promotional Offer Email Template
// ---------------------------------------------------------------------------

export const promotionalOfferTemplate: EmailTemplateV2 = {
  metadata: {
    id: 'tpl_promo_offer',
    name: 'Promotional Offer Email',
    version: 1,
    createdAt: '2026-04-19T00:00:00.000Z',
    updatedAt: '2026-04-19T00:00:00.000Z',
    tags: ['promo', 'offer', 'discount', 'urgency'],
    thumbnail: '',
    category: 'promotional',
    description: '48-hour offer matched to the quiz outcome tier with countdown urgency, comparison bar, and clear CTA.',
    subject: '{{first_name}}, 20% off the thing that fits your result',
    preheader: '48 hours only - matched to your {{result_category}} result.',
    mergeTags: ['first_name', 'score', 'result_category', 'expiry_date', 'cta_url', 'company_name', 'unsubscribe_link'],
  },
  globalStyles: { ...DEFAULT_GLOBAL_STYLES },
  layout: { type: 'single-column' },
  sections: [
    // HEADER
    makeSection('header', [
      makeRow([
        { id: uid(), type: 'preheader_text', editable: true, compatibility: C.preheader_text, properties: { text: '48 hours only - matched to your {{result_category}} result.' }, styles: {} },
        { id: uid(), type: 'logo', editable: true, compatibility: C.logo, properties: { src: '', alt: 'Logo', width: 140, href: '{{cta_url}}' }, styles: { align: 'left', paddingTop: 16, paddingBottom: 16 } },
      ]),
    ]),

    // BANNER
    makeSection('body', [
      makeRow([
        { id: uid(), type: 'full_width_banner', editable: true, compatibility: C.full_width_banner, properties: { headline: '20% off, matched to your result', subheadline: 'We picked the product that fits {{result_category}} and took 20% off for {{expiry_date}}.', ctaText: '', ctaHref: '', backgroundImageUrl: '' }, styles: { backgroundColor: '#1A1A1A', textColor: '#FFFFFF', textAlign: 'center', minHeight: 180, paddingTop: 48, paddingBottom: 48, paddingLeft: 32, paddingRight: 32, overlayOpacity: 0 } },
      ]),
    ], '#FFFFFF'),

    // BODY
    makeSection('body', [
      makeRow([
        { id: uid(), type: 'score_badge', editable: true, compatibility: C.score_badge, properties: { badgeText: '{{result_category}}', subtext: 'Your tier - matched from your quiz score', iconType: 'trophy' }, styles: { align: 'center', badgeColor: '#FFFFFF', badgeBackgroundColor: '#0D7377', badgeFontSize: 18, badgeBorderRadius: 999, subtextColor: '#6B7280', subtextFontSize: 13, paddingTop: 24, paddingBottom: 16 } },
      ]),
      makeRow([
        { id: uid(), type: 'paragraph', editable: true, compatibility: C.paragraph, properties: { html: 'Hi {{first_name}}, most offer emails are generic. This one is not. We looked at your {{result_category}} result and the 20% is tied to the one product that actually matches it.' }, styles: { align: 'center', color: '#4B5563', fontSize: 16, lineHeight: 1.6, paddingTop: 8, paddingBottom: 16 } },
      ]),
      makeRow([
        { id: uid(), type: 'heading', editable: true, compatibility: C.heading, properties: { text: '{{expiry_date}} left', level: 2 }, styles: { align: 'center', color: '#C53030', fontSize: 28, fontWeight: 700, letterSpacing: 0, paddingTop: 8, paddingBottom: 8 } },
      ]),
      makeRow([
        { id: uid(), type: 'comparison_bar', editable: true, compatibility: C.comparison_bar, properties: { label: 'How your score compares', yourScore: '{{score}}', averageScore: '62', maxScore: '100', yourLabel: 'You', averageLabel: 'Average' }, styles: { yourColor: '#0D7377', averageColor: '#D1D5DB', barHeight: 12, barBackgroundColor: '#F3F4F6', barBorderRadius: 6, labelColor: '#1A1A1A', labelFontSize: 13, paddingTop: 16, paddingBottom: 16 } },
      ]),
      makeRow([
        { id: uid(), type: 'spacer', editable: true, compatibility: C.spacer, properties: { height: 8 }, styles: {} },
      ]),
      makeRow([
        { id: uid(), type: 'button', editable: true, compatibility: C.button, properties: { text: 'Claim my 20% off', href: '{{cta_url}}', variant: 'primary', fullWidth: true }, styles: { align: 'center', backgroundColor: '#0D7377', textColor: '#FFFFFF', fontSize: 18, fontWeight: 700, borderRadius: 10, paddingX: 32, paddingY: 18, marginTop: 8, marginBottom: 8 } },
      ]),
      makeRow([
        { id: uid(), type: 'paragraph', editable: true, compatibility: C.paragraph, properties: { html: '<em>No code needed. The link applies the discount automatically.</em>' }, styles: { align: 'center', color: '#9CA3AF', fontSize: 13, lineHeight: 1.5, paddingTop: 4, paddingBottom: 16 } },
      ]),
    ]),

    // FOOTER
    makeSection('footer', [
      makeRow([
        { id: uid(), type: 'unsubscribe_block', editable: true, compatibility: C.unsubscribe_block, properties: { text: 'You received this because you took our quiz.', linkText: 'Unsubscribe', href: '{{unsubscribe_link}}', showPreferenceCenter: true, preferenceLinkText: 'Email preferences', preferenceHref: '{{preference_link}}' }, styles: { align: 'center', color: '#9CA3AF', fontSize: 12, linkColor: '#9CA3AF', paddingTop: 8, paddingBottom: 4 } },
      ]),
      makeRow([
        { id: uid(), type: 'address_block', editable: true, compatibility: C.address_block, properties: { companyName: '{{company_name}}', addressLine1: '651 N Broad St, Suite 201', addressLine2: 'Middletown, DE 19709', showLegal: true, legalText: 'Offer expires {{expiry_date}} from send. One use per account.' }, styles: { align: 'center', color: '#9CA3AF', fontSize: 11, paddingTop: 4, paddingBottom: 16 } },
      ]),
    ], '#F7F7F5'),
  ],
};

// Export all v2 templates
export const V2_TEMPLATES: EmailTemplateV2[] = [
  quizResultTemplate,
  leadNurtureTemplate,
  promotionalOfferTemplate,
];
