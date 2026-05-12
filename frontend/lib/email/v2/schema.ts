// ============================================================================
// Phase 1: Email Builder v2 - Master Schema + Block Library
// ============================================================================
// 4-level nesting: Template > Sections > Rows > Columns > Blocks
// All block types defined with editable fields, defaults, style controls,
// and email client compatibility flags.
// ============================================================================

// ---------------------------------------------------------------------------
// Task 1.1 - Master JSON Schema
// ---------------------------------------------------------------------------

export interface EmailTemplateV2 {
  metadata: TemplateMetadata;
  globalStyles: GlobalStyles;
  layout: LayoutConfig;
  sections: Section[];
}

export interface TemplateMetadata {
  id: string;
  name: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  thumbnail: string;
  category: TemplateCategory;
  siteType?: SiteType;
  description: string;
  subject: string;
  preheader: string;
  mergeTags: string[];
}

export type TemplateCategory =
  | 'quiz-result'
  | 'lead-nurture'
  | 'promotional'
  | 'post-quiz'
  | 'outcome'
  | 'nurture'
  | 'abandoner'
  | 'booking'
  | 'discount';

export type SiteType =
  | 'portfolio'
  | 'restaurant'
  | 'shop'
  | 'blog'
  | 'wedding'
  | 'fitness'
  | 'services';

// ---------------------------------------------------------------------------
// Task 1.2 - Global Styles Schema
// ---------------------------------------------------------------------------

export interface GlobalStyles {
  typography: {
    fontFamily: string;
    fallbackFont: string;
    baseFontSize: number;
    lineHeight: number;
    headingWeight: 400 | 500 | 600 | 700 | 800;
    bodyWeight: 400 | 500;
  };
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    link: string;
    border: string;
    onPrimary: string;
  };
  spacing: {
    sectionPadding: number;
    blockGap: number;
    containerMaxWidth: number;
  };
  branding: {
    logoUrl: string;
    logoDarkUrl?: string;
    logoWidth: number;
    logoAlt: string;
  };
  button: {
    borderRadius: number;
    paddingX: number;
    paddingY: number;
  };
  card: {
    borderRadius: number;
    borderColor: string;
    shadow: boolean;
  };
}

export const DEFAULT_GLOBAL_STYLES: GlobalStyles = {
  typography: {
    fontFamily: 'Inter',
    fallbackFont: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    baseFontSize: 16,
    lineHeight: 1.55,
    headingWeight: 600,
    bodyWeight: 400,
  },
  colors: {
    primary: '#0f7377',
    secondary: '#6B7280',
    background: '#F7F7F5',
    surface: '#FFFFFF',
    text: '#1A1A1A',
    textMuted: '#6B7280',
    link: '#0f7377',
    border: '#E4E3E0',
    onPrimary: '#FFFFFF',
  },
  spacing: {
    sectionPadding: 32,
    blockGap: 16,
    containerMaxWidth: 600,
  },
  branding: {
    logoUrl: '',
    logoWidth: 140,
    logoAlt: 'Logo',
  },
  button: {
    borderRadius: 8,
    paddingX: 24,
    paddingY: 14,
  },
  card: {
    borderRadius: 12,
    borderColor: '#E4E3E0',
    shadow: false,
  },
};

// ---------------------------------------------------------------------------
// Task 1.3 - Nesting Model: Template > Section > Row > Column > Block
// ---------------------------------------------------------------------------

export interface LayoutConfig {
  type: 'single-column' | 'multi-column';
}

export interface Section {
  id: string;
  type: 'section';
  editable: boolean;
  role: 'header' | 'body' | 'footer';
  properties: {
    label: string;
  };
  styles: {
    backgroundColor: string;
    paddingTop: number;
    paddingBottom: number;
    paddingLeft: number;
    paddingRight: number;
    borderTop?: string;
    borderBottom?: string;
  };
  rows: Row[];
}

export interface Row {
  id: string;
  type: 'row';
  editable: boolean;
  properties: {
    columnsRatio: string;   // "100" | "50-50" | "60-40" | "40-60" | "33-33-33"
    stackOnMobile: boolean;
    reverseOnMobile: boolean;
  };
  styles: {
    backgroundColor?: string;
    paddingTop: number;
    paddingBottom: number;
    gap: number;
  };
  columns: Column[];
}

export interface Column {
  id: string;
  type: 'column';
  editable: boolean;
  properties: {
    widthPercent: number;
    verticalAlign: 'top' | 'middle' | 'bottom';
  };
  styles: {
    backgroundColor?: string;
    paddingTop: number;
    paddingRight: number;
    paddingBottom: number;
    paddingLeft: number;
  };
  blocks: BlockV2[];
}

// ---------------------------------------------------------------------------
// Task 1.4 - Core Content Blocks (8 blocks)
// ---------------------------------------------------------------------------

export type BlockV2Type =
  // Core content (8)
  | 'logo'
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'button'
  | 'spacer'
  | 'divider'
  | 'blockquote'
  // Layout (4)
  | 'two_column_layout'
  | 'three_column_layout'
  | 'full_width_banner'
  | 'card_block'
  // Quiz-specific (8)
  | 'score_display'
  | 'score_badge'
  | 'result_category'
  | 'result_description'
  | 'recommendation_card'
  | 'retake_quiz_button'
  | 'score_breakdown'
  | 'comparison_bar'
  // Utility + system (4)
  | 'preheader_text'
  | 'unsubscribe_block'
  | 'address_block'
  | 'view_in_browser';

export type Alignment = 'left' | 'center' | 'right';

export interface BaseBlockV2 {
  id: string;
  type: BlockV2Type;
  editable: boolean;
  compatibility: CompatibilityFlags;
}

// --- Core Content Blocks ---

export interface LogoBlock extends BaseBlockV2 {
  type: 'logo';
  properties: {
    src: string;
    alt: string;
    width: number;
    href: string;
  };
  styles: {
    align: Alignment;
    paddingTop: number;
    paddingBottom: number;
  };
}

export interface HeadingBlockV2 extends BaseBlockV2 {
  type: 'heading';
  properties: {
    text: string;
    level: 1 | 2 | 3;
  };
  styles: {
    align: Alignment;
    color: string;
    fontSize: number;
    fontWeight: 400 | 500 | 600 | 700 | 800;
    letterSpacing: number;
    paddingTop: number;
    paddingBottom: number;
  };
}

export interface ParagraphBlock extends BaseBlockV2 {
  type: 'paragraph';
  properties: {
    html: string;
  };
  styles: {
    align: Alignment;
    color: string;
    fontSize: number;
    lineHeight: number;
    paddingTop: number;
    paddingBottom: number;
  };
}

export interface ImageBlockV2 extends BaseBlockV2 {
  type: 'image';
  properties: {
    src: string;
    alt: string;
    href: string;
    width: number;
    caption: string;
  };
  styles: {
    align: Alignment;
    borderRadius: number;
    paddingTop: number;
    paddingBottom: number;
  };
}

export interface ButtonBlockV2 extends BaseBlockV2 {
  type: 'button';
  properties: {
    text: string;
    href: string;
    variant: 'primary' | 'secondary' | 'ghost';
    fullWidth: boolean;
  };
  styles: {
    align: Alignment;
    backgroundColor: string;
    textColor: string;
    fontSize: number;
    fontWeight: 600 | 700;
    borderRadius: number;
    paddingX: number;
    paddingY: number;
    marginTop: number;
    marginBottom: number;
  };
}

export interface SpacerBlockV2 extends BaseBlockV2 {
  type: 'spacer';
  properties: {
    height: number;
  };
  styles: {};
}

export interface DividerBlockV2 extends BaseBlockV2 {
  type: 'divider';
  properties: {
    lineStyle: 'solid' | 'dashed' | 'dotted';
  };
  styles: {
    color: string;
    thickness: number;
    width: string;
    marginTop: number;
    marginBottom: number;
  };
}

export interface BlockquoteBlock extends BaseBlockV2 {
  type: 'blockquote';
  properties: {
    text: string;
    citation: string;
    citationTitle: string;
    rating: 0 | 1 | 2 | 3 | 4 | 5;
  };
  styles: {
    borderLeftColor: string;
    borderLeftWidth: number;
    backgroundColor: string;
    fontSize: number;
    fontStyle: 'normal' | 'italic';
    paddingTop: number;
    paddingBottom: number;
    paddingLeft: number;
    paddingRight: number;
  };
}

// ---------------------------------------------------------------------------
// Task 1.5 - Layout Blocks (4 blocks)
// ---------------------------------------------------------------------------

export interface TwoColumnLayoutBlock extends BaseBlockV2 {
  type: 'two_column_layout';
  properties: {
    ratio: '50-50' | '60-40' | '40-60' | '70-30' | '30-70';
    stackOnMobile: boolean;
    reverseOnMobile: boolean;
  };
  styles: {
    gap: number;
    paddingTop: number;
    paddingBottom: number;
    backgroundColor: string;
  };
  leftColumn: BlockV2[];
  rightColumn: BlockV2[];
}

export interface ThreeColumnLayoutBlock extends BaseBlockV2 {
  type: 'three_column_layout';
  properties: {
    ratio: '33-33-33' | '25-50-25' | '50-25-25' | '25-25-50';
    stackOnMobile: boolean;
  };
  styles: {
    gap: number;
    paddingTop: number;
    paddingBottom: number;
    backgroundColor: string;
  };
  columns: [BlockV2[], BlockV2[], BlockV2[]];
}

export interface FullWidthBannerBlock extends BaseBlockV2 {
  type: 'full_width_banner';
  properties: {
    headline: string;
    subheadline: string;
    ctaText: string;
    ctaHref: string;
    backgroundImageUrl: string;
  };
  styles: {
    backgroundColor: string;
    textColor: string;
    textAlign: Alignment;
    minHeight: number;
    paddingTop: number;
    paddingBottom: number;
    paddingLeft: number;
    paddingRight: number;
    overlayOpacity: number;
  };
}

export interface CardBlock extends BaseBlockV2 {
  type: 'card_block';
  properties: {
    imageUrl: string;
    imageAlt: string;
    title: string;
    body: string;
    ctaText: string;
    ctaHref: string;
  };
  styles: {
    borderRadius: number;
    borderColor: string;
    backgroundColor: string;
    shadow: boolean;
    imageHeight: number;
    paddingInner: number;
  };
}

// ---------------------------------------------------------------------------
// Task 1.6 - Quiz-Specific Blocks (8 blocks)
// ---------------------------------------------------------------------------

export interface ScoreDisplayBlock extends BaseBlockV2 {
  type: 'score_display';
  properties: {
    scoreValue: string;          // "{{score}}" at send time
    maxScore: string;
    label: string;
    format: 'number' | 'percentage' | 'fraction';
  };
  styles: {
    align: Alignment;
    scoreColor: string;
    scoreFontSize: number;
    scoreFontWeight: 700 | 800;
    labelColor: string;
    labelFontSize: number;
    backgroundColor: string;
    borderRadius: number;
    paddingTop: number;
    paddingBottom: number;
  };
}

export interface ScoreBadgeBlock extends BaseBlockV2 {
  type: 'score_badge';
  properties: {
    badgeText: string;           // "{{result_category}}" or static like "Gold Tier"
    subtext: string;
    iconType: 'star' | 'trophy' | 'medal' | 'check' | 'none';
  };
  styles: {
    align: Alignment;
    badgeColor: string;
    badgeBackgroundColor: string;
    badgeFontSize: number;
    badgeBorderRadius: number;
    subtextColor: string;
    subtextFontSize: number;
    paddingTop: number;
    paddingBottom: number;
  };
}

export interface ResultCategoryBlock extends BaseBlockV2 {
  type: 'result_category';
  properties: {
    categoryName: string;        // "{{result_category}}"
    eyebrow: string;
    description: string;
  };
  styles: {
    align: Alignment;
    eyebrowColor: string;
    eyebrowFontSize: number;
    eyebrowLetterSpacing: number;
    categoryColor: string;
    categoryFontSize: number;
    categoryFontWeight: 600 | 700 | 800;
    descriptionColor: string;
    descriptionFontSize: number;
    paddingTop: number;
    paddingBottom: number;
  };
}

export interface ResultDescriptionBlock extends BaseBlockV2 {
  type: 'result_description';
  properties: {
    heading: string;
    body: string;                // "{{result_description}}" or custom HTML
    showDivider: boolean;
  };
  styles: {
    headingColor: string;
    headingFontSize: number;
    bodyColor: string;
    bodyFontSize: number;
    lineHeight: number;
    dividerColor: string;
    paddingTop: number;
    paddingBottom: number;
  };
}

export interface RecommendationCardBlock extends BaseBlockV2 {
  type: 'recommendation_card';
  properties: {
    imageUrl: string;
    imageAlt: string;
    title: string;
    body: string;
    ctaText: string;
    ctaHref: string;
    badge: string;
  };
  styles: {
    borderRadius: number;
    borderColor: string;
    backgroundColor: string;
    shadow: boolean;
    titleFontSize: number;
    bodyFontSize: number;
    ctaColor: string;
    ctaBackgroundColor: string;
    paddingInner: number;
  };
}

export interface RetakeQuizButtonBlock extends BaseBlockV2 {
  type: 'retake_quiz_button';
  properties: {
    text: string;
    href: string;
    subtitle: string;
  };
  styles: {
    align: Alignment;
    backgroundColor: string;
    textColor: string;
    fontSize: number;
    borderRadius: number;
    subtitleColor: string;
    subtitleFontSize: number;
    paddingTop: number;
    paddingBottom: number;
  };
}

export interface ScoreBreakdownBlock extends BaseBlockV2 {
  type: 'score_breakdown';
  properties: {
    items: {
      label: string;
      value: string;
      maxValue: string;
      color: string;
    }[];
    showBars: boolean;
  };
  styles: {
    labelColor: string;
    labelFontSize: number;
    valueColor: string;
    valueFontSize: number;
    barHeight: number;
    barBackgroundColor: string;
    barBorderRadius: number;
    paddingTop: number;
    paddingBottom: number;
  };
}

export interface ComparisonBarBlock extends BaseBlockV2 {
  type: 'comparison_bar';
  properties: {
    label: string;
    yourScore: string;
    averageScore: string;
    maxScore: string;
    yourLabel: string;
    averageLabel: string;
  };
  styles: {
    yourColor: string;
    averageColor: string;
    barHeight: number;
    barBackgroundColor: string;
    barBorderRadius: number;
    labelColor: string;
    labelFontSize: number;
    paddingTop: number;
    paddingBottom: number;
  };
}

// ---------------------------------------------------------------------------
// Task 1.7 - Utility + System Blocks (4 blocks)
// ---------------------------------------------------------------------------

export interface PreheaderTextBlock extends BaseBlockV2 {
  type: 'preheader_text';
  properties: {
    text: string;
  };
  styles: {};
}

export interface UnsubscribeBlock extends BaseBlockV2 {
  type: 'unsubscribe_block';
  properties: {
    text: string;
    linkText: string;
    href: string;
    showPreferenceCenter: boolean;
    preferenceLinkText: string;
    preferenceHref: string;
  };
  styles: {
    align: Alignment;
    color: string;
    fontSize: number;
    linkColor: string;
    paddingTop: number;
    paddingBottom: number;
  };
}

export interface AddressBlock extends BaseBlockV2 {
  type: 'address_block';
  properties: {
    companyName: string;
    addressLine1: string;
    addressLine2: string;
    showLegal: boolean;
    legalText: string;
  };
  styles: {
    align: Alignment;
    color: string;
    fontSize: number;
    paddingTop: number;
    paddingBottom: number;
  };
}

export interface ViewInBrowserBlock extends BaseBlockV2 {
  type: 'view_in_browser';
  properties: {
    text: string;
    linkText: string;
    href: string;
  };
  styles: {
    align: Alignment;
    color: string;
    fontSize: number;
    linkColor: string;
    paddingTop: number;
    paddingBottom: number;
  };
}

// ---------------------------------------------------------------------------
// Task 1.8 - Email Client Compatibility Flags
// ---------------------------------------------------------------------------

export type SupportLevel = 'full' | 'partial' | 'workaround-needed';

export interface CompatibilityFlags {
  gmail: SupportLevel;
  outlook: SupportLevel;
  apple_mail: SupportLevel;
  yahoo: SupportLevel;
  note: string;
}

export const BLOCK_COMPATIBILITY: Record<BlockV2Type, CompatibilityFlags> = {
  // Core content
  logo:       { gmail: 'full', outlook: 'full', apple_mail: 'full', yahoo: 'full', note: '' },
  heading:    { gmail: 'full', outlook: 'full', apple_mail: 'full', yahoo: 'full', note: '' },
  paragraph:  { gmail: 'full', outlook: 'full', apple_mail: 'full', yahoo: 'full', note: '' },
  image:      { gmail: 'full', outlook: 'full', apple_mail: 'full', yahoo: 'full', note: '' },
  button:     { gmail: 'full', outlook: 'workaround-needed', apple_mail: 'full', yahoo: 'full', note: 'Outlook: VML fallback for rounded corners' },
  spacer:     { gmail: 'full', outlook: 'full', apple_mail: 'full', yahoo: 'full', note: '' },
  divider:    { gmail: 'full', outlook: 'full', apple_mail: 'full', yahoo: 'full', note: '' },
  blockquote: { gmail: 'full', outlook: 'partial', apple_mail: 'full', yahoo: 'full', note: 'Outlook: border-left renders as full border, use MSO table cell' },

  // Layout
  two_column_layout:   { gmail: 'full', outlook: 'workaround-needed', apple_mail: 'full', yahoo: 'full', note: 'Outlook: MSO table columns required for side-by-side' },
  three_column_layout:  { gmail: 'full', outlook: 'workaround-needed', apple_mail: 'full', yahoo: 'full', note: 'Outlook: MSO table columns required for side-by-side' },
  full_width_banner:   { gmail: 'partial', outlook: 'workaround-needed', apple_mail: 'full', yahoo: 'partial', note: 'Gmail/Yahoo: background-image stripped. Outlook: VML background required' },
  card_block:          { gmail: 'full', outlook: 'partial', apple_mail: 'full', yahoo: 'full', note: 'Outlook: box-shadow not supported, use border fallback' },

  // Quiz-specific
  score_display:       { gmail: 'full', outlook: 'full', apple_mail: 'full', yahoo: 'full', note: '' },
  score_badge:         { gmail: 'full', outlook: 'partial', apple_mail: 'full', yahoo: 'full', note: 'Outlook: inline-block and border-radius degraded' },
  result_category:     { gmail: 'full', outlook: 'full', apple_mail: 'full', yahoo: 'full', note: '' },
  result_description:  { gmail: 'full', outlook: 'full', apple_mail: 'full', yahoo: 'full', note: '' },
  recommendation_card: { gmail: 'full', outlook: 'partial', apple_mail: 'full', yahoo: 'full', note: 'Outlook: box-shadow not supported' },
  retake_quiz_button:  { gmail: 'full', outlook: 'workaround-needed', apple_mail: 'full', yahoo: 'full', note: 'Outlook: VML fallback for rounded button' },
  score_breakdown:     { gmail: 'full', outlook: 'partial', apple_mail: 'full', yahoo: 'full', note: 'Outlook: progress bars use table cell width instead of CSS width' },
  comparison_bar:      { gmail: 'full', outlook: 'partial', apple_mail: 'full', yahoo: 'full', note: 'Outlook: bar widths use table cell percentages' },

  // Utility + system
  preheader_text:      { gmail: 'full', outlook: 'full', apple_mail: 'full', yahoo: 'full', note: '' },
  unsubscribe_block:   { gmail: 'full', outlook: 'full', apple_mail: 'full', yahoo: 'full', note: '' },
  address_block:       { gmail: 'full', outlook: 'full', apple_mail: 'full', yahoo: 'full', note: '' },
  view_in_browser:     { gmail: 'full', outlook: 'full', apple_mail: 'full', yahoo: 'full', note: '' },
};

// ---------------------------------------------------------------------------
// Union type for all v2 blocks
// ---------------------------------------------------------------------------

export type BlockV2 =
  // Core content
  | LogoBlock
  | HeadingBlockV2
  | ParagraphBlock
  | ImageBlockV2
  | ButtonBlockV2
  | SpacerBlockV2
  | DividerBlockV2
  | BlockquoteBlock
  // Layout
  | TwoColumnLayoutBlock
  | ThreeColumnLayoutBlock
  | FullWidthBannerBlock
  | CardBlock
  // Quiz-specific
  | ScoreDisplayBlock
  | ScoreBadgeBlock
  | ResultCategoryBlock
  | ResultDescriptionBlock
  | RecommendationCardBlock
  | RetakeQuizButtonBlock
  | ScoreBreakdownBlock
  | ComparisonBarBlock
  // Utility + system
  | PreheaderTextBlock
  | UnsubscribeBlock
  | AddressBlock
  | ViewInBrowserBlock;

// ---------------------------------------------------------------------------
// Default block factory
// ---------------------------------------------------------------------------

let _nextId = 0;
export function uid(): string {
  _nextId += 1;
  return 'blk_' + Date.now().toString(36) + '_' + _nextId.toString(36);
}

const COMPAT_FULL: CompatibilityFlags = { gmail: 'full', outlook: 'full', apple_mail: 'full', yahoo: 'full', note: '' };

export function createDefaultBlockV2(type: BlockV2Type): BlockV2 {
  const id = uid();
  const compat = BLOCK_COMPATIBILITY[type] || COMPAT_FULL;

  switch (type) {
    case 'logo':
      return { id, type, editable: true, compatibility: compat, properties: { src: '', alt: 'Logo', width: 140, href: '{{cta_url}}' }, styles: { align: 'left', paddingTop: 16, paddingBottom: 16 } };
    case 'heading':
      return { id, type, editable: true, compatibility: compat, properties: { text: 'Your headline here', level: 2 }, styles: { align: 'left', color: '#1A1A1A', fontSize: 28, fontWeight: 600, letterSpacing: -0.3, paddingTop: 8, paddingBottom: 8 } };
    case 'paragraph':
      return { id, type, editable: true, compatibility: compat, properties: { html: 'Write your paragraph text here. Supports <strong>bold</strong> and <em>italic</em>.' }, styles: { align: 'left', color: '#1A1A1A', fontSize: 16, lineHeight: 1.55, paddingTop: 4, paddingBottom: 4 } };
    case 'image':
      return { id, type, editable: true, compatibility: compat, properties: { src: '', alt: 'Image', href: '', width: 560, caption: '' }, styles: { align: 'center', borderRadius: 8, paddingTop: 8, paddingBottom: 8 } };
    case 'button':
      return { id, type, editable: true, compatibility: compat, properties: { text: 'Get started', href: '{{cta_url}}', variant: 'primary', fullWidth: false }, styles: { align: 'left', backgroundColor: '#0f7377', textColor: '#FFFFFF', fontSize: 16, fontWeight: 600, borderRadius: 8, paddingX: 24, paddingY: 14, marginTop: 8, marginBottom: 8 } };
    case 'spacer':
      return { id, type, editable: true, compatibility: compat, properties: { height: 24 }, styles: {} };
    case 'divider':
      return { id, type, editable: true, compatibility: compat, properties: { lineStyle: 'solid' }, styles: { color: '#E4E3E0', thickness: 1, width: '100%', marginTop: 16, marginBottom: 16 } };
    case 'blockquote':
      return { id, type, editable: true, compatibility: compat, properties: { text: 'This changed everything for my business.', citation: 'Alex Smith', citationTitle: 'Founder', rating: 5 }, styles: { borderLeftColor: '#0f7377', borderLeftWidth: 3, backgroundColor: '#F7F7F5', fontSize: 16, fontStyle: 'italic', paddingTop: 16, paddingBottom: 16, paddingLeft: 20, paddingRight: 20 } };
    case 'two_column_layout':
      return { id, type, editable: true, compatibility: compat, properties: { ratio: '50-50', stackOnMobile: true, reverseOnMobile: false }, styles: { gap: 16, paddingTop: 8, paddingBottom: 8, backgroundColor: '' }, leftColumn: [], rightColumn: [] };
    case 'three_column_layout':
      return { id, type, editable: true, compatibility: compat, properties: { ratio: '33-33-33', stackOnMobile: true }, styles: { gap: 16, paddingTop: 8, paddingBottom: 8, backgroundColor: '' }, columns: [[], [], []] };
    case 'full_width_banner':
      return { id, type, editable: true, compatibility: compat, properties: { headline: 'Your offer headline', subheadline: 'Supporting text goes here.', ctaText: 'Learn more', ctaHref: '{{cta_url}}', backgroundImageUrl: '' }, styles: { backgroundColor: '#0f7377', textColor: '#FFFFFF', textAlign: 'center', minHeight: 200, paddingTop: 48, paddingBottom: 48, paddingLeft: 32, paddingRight: 32, overlayOpacity: 0 } };
    case 'card_block':
      return { id, type, editable: true, compatibility: compat, properties: { imageUrl: '', imageAlt: '', title: 'Card title', body: 'Card description text.', ctaText: 'Learn more', ctaHref: '{{cta_url}}' }, styles: { borderRadius: 12, borderColor: '#E4E3E0', backgroundColor: '#FFFFFF', shadow: false, imageHeight: 160, paddingInner: 20 } };
    case 'score_display':
      return { id, type, editable: true, compatibility: compat, properties: { scoreValue: '{{score}}', maxScore: '100', label: 'Your score', format: 'number' }, styles: { align: 'center', scoreColor: '#0f7377', scoreFontSize: 48, scoreFontWeight: 800, labelColor: '#6B7280', labelFontSize: 14, backgroundColor: '#F7F7F5', borderRadius: 12, paddingTop: 24, paddingBottom: 24 } };
    case 'score_badge':
      return { id, type, editable: true, compatibility: compat, properties: { badgeText: '{{result_category}}', subtext: 'Based on your answers', iconType: 'star' }, styles: { align: 'center', badgeColor: '#FFFFFF', badgeBackgroundColor: '#0f7377', badgeFontSize: 18, badgeBorderRadius: 999, subtextColor: '#6B7280', subtextFontSize: 13, paddingTop: 16, paddingBottom: 16 } };
    case 'result_category':
      return { id, type, editable: true, compatibility: compat, properties: { categoryName: '{{result_category}}', eyebrow: 'YOUR RESULT', description: '{{result_description}}' }, styles: { align: 'left', eyebrowColor: '#0f7377', eyebrowFontSize: 11, eyebrowLetterSpacing: 2, categoryColor: '#1A1A1A', categoryFontSize: 32, categoryFontWeight: 700, descriptionColor: '#6B7280', descriptionFontSize: 15, paddingTop: 16, paddingBottom: 16 } };
    case 'result_description':
      return { id, type, editable: true, compatibility: compat, properties: { heading: 'What this means for you', body: '{{result_description}}', showDivider: true }, styles: { headingColor: '#1A1A1A', headingFontSize: 20, bodyColor: '#4B5563', bodyFontSize: 15, lineHeight: 1.6, dividerColor: '#E4E3E0', paddingTop: 12, paddingBottom: 12 } };
    case 'recommendation_card':
      return { id, type, editable: true, compatibility: compat, properties: { imageUrl: '', imageAlt: '', title: 'Recommended for you', body: 'Based on your quiz result, we think this is the best fit.', ctaText: 'Get started', ctaHref: '{{cta_url}}', badge: 'Best match' }, styles: { borderRadius: 12, borderColor: '#E4E3E0', backgroundColor: '#FFFFFF', shadow: false, titleFontSize: 18, bodyFontSize: 14, ctaColor: '#FFFFFF', ctaBackgroundColor: '#0f7377', paddingInner: 20 } };
    case 'retake_quiz_button':
      return { id, type, editable: true, compatibility: compat, properties: { text: 'Retake the quiz', href: '{{quiz_url}}', subtitle: 'Your answers may have changed' }, styles: { align: 'center', backgroundColor: '#F7F7F5', textColor: '#1A1A1A', fontSize: 15, borderRadius: 8, subtitleColor: '#6B7280', subtitleFontSize: 12, paddingTop: 12, paddingBottom: 12 } };
    case 'score_breakdown':
      return { id, type, editable: true, compatibility: compat, properties: { items: [{ label: 'Strategy', value: '85', maxValue: '100', color: '#0f7377' }, { label: 'Design', value: '72', maxValue: '100', color: '#6B7280' }, { label: 'Content', value: '91', maxValue: '100', color: '#2D6A4F' }], showBars: true }, styles: { labelColor: '#1A1A1A', labelFontSize: 14, valueColor: '#6B7280', valueFontSize: 14, barHeight: 8, barBackgroundColor: '#E4E3E0', barBorderRadius: 4, paddingTop: 12, paddingBottom: 12 } };
    case 'comparison_bar':
      return { id, type, editable: true, compatibility: compat, properties: { label: 'How you compare', yourScore: '{{score}}', averageScore: '62', maxScore: '100', yourLabel: 'You', averageLabel: 'Average' }, styles: { yourColor: '#0f7377', averageColor: '#D1D5DB', barHeight: 12, barBackgroundColor: '#F3F4F6', barBorderRadius: 6, labelColor: '#1A1A1A', labelFontSize: 13, paddingTop: 12, paddingBottom: 12 } };
    case 'preheader_text':
      return { id, type, editable: true, compatibility: compat, properties: { text: 'Your quiz result is ready.' }, styles: {} };
    case 'unsubscribe_block':
      return { id, type, editable: true, compatibility: compat, properties: { text: 'You received this because you took our quiz.', linkText: 'Unsubscribe', href: '{{unsubscribe_link}}', showPreferenceCenter: true, preferenceLinkText: 'Email preferences', preferenceHref: '{{preference_link}}' }, styles: { align: 'center', color: '#9CA3AF', fontSize: 12, linkColor: '#9CA3AF', paddingTop: 8, paddingBottom: 8 } };
    case 'address_block':
      return { id, type, editable: true, compatibility: compat, properties: { companyName: '{{company_name}}', addressLine1: '651 N Broad St, Suite 201', addressLine2: 'Middletown, DE 19709', showLegal: true, legalText: 'Copyright 2026. All rights reserved.' }, styles: { align: 'center', color: '#9CA3AF', fontSize: 11, paddingTop: 8, paddingBottom: 16 } };
    case 'view_in_browser':
      return { id, type: 'view_in_browser' as any, editable: true, compatibility: compat, properties: { text: 'Having trouble viewing this email?', linkText: 'View in browser', href: '{{view_in_browser_link}}' }, styles: { align: 'center', color: '#9CA3AF', fontSize: 11, linkColor: '#6B7280', paddingTop: 8, paddingBottom: 8 } } as any;
    default:
      return { id, type: 'paragraph', editable: true, compatibility: COMPAT_FULL, properties: { html: '' }, styles: { align: 'left', color: '#1A1A1A', fontSize: 16, lineHeight: 1.55, paddingTop: 4, paddingBottom: 4 } };
  }
}

// ---------------------------------------------------------------------------
// Section factory
// ---------------------------------------------------------------------------

export function createDefaultSection(role: 'header' | 'body' | 'footer'): Section {
  const bgMap = { header: '#FFFFFF', body: '#FFFFFF', footer: '#F7F7F5' };
  return {
    id: uid(),
    type: 'section',
    editable: true,
    role,
    properties: { label: role.charAt(0).toUpperCase() + role.slice(1) },
    styles: {
      backgroundColor: bgMap[role],
      paddingTop: role === 'footer' ? 24 : 32,
      paddingBottom: role === 'footer' ? 24 : 32,
      paddingLeft: 0,
      paddingRight: 0,
    },
    rows: [],
  };
}

export function createDefaultRow(columnsRatio: string = '100'): Row {
  const colCount = columnsRatio.split('-').length;
  const percents = columnsRatio.split('-').map(function (s) { return parseInt(s, 10); });
  var columns: Column[] = [];
  for (var i = 0; i < colCount; i++) {
    columns.push(createDefaultColumn(percents[i]));
  }
  return {
    id: uid(),
    type: 'row',
    editable: true,
    properties: { columnsRatio, stackOnMobile: true, reverseOnMobile: false },
    styles: { paddingTop: 0, paddingBottom: 0, gap: 16 },
    columns,
  };
}

export function createDefaultColumn(widthPercent: number = 100): Column {
  return {
    id: uid(),
    type: 'column',
    editable: true,
    properties: { widthPercent, verticalAlign: 'top' },
    styles: { paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0 },
    blocks: [],
  };
}

// ---------------------------------------------------------------------------
// Empty template factory
// ---------------------------------------------------------------------------

export function createEmptyTemplate(): EmailTemplateV2 {
  return {
    metadata: {
      id: uid(),
      name: 'Untitled template',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
      thumbnail: '',
      category: 'quiz-result',
      description: '',
      subject: '',
      preheader: '',
      mergeTags: [],
    },
    globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    layout: { type: 'single-column' },
    sections: [
      createDefaultSection('header'),
      createDefaultSection('body'),
      createDefaultSection('footer'),
    ],
  };
}
