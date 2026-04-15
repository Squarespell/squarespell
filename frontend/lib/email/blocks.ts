// Email block schema. Every template is a Block[] that renders against a BrandKit
// and a MergeContext. No inline HTML strings anywhere downstream.

export type BlockType =
  | 'hero'
  | 'heading'
  | 'text'
  | 'image'
  | 'button'
  | 'divider'
  | 'cardGrid'
  | 'testimonial'
  | 'stat'
  | 'signature'
  | 'footer'
  | 'spacer'
  | 'postscript';

export type Alignment = 'left' | 'center' | 'right';
export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface BaseBlock {
  id: string;
  type: BlockType;
}

export interface HeroBlock extends BaseBlock {
  type: 'hero';
  variant: 'image' | 'illustration' | 'gradient';
  eyebrow?: string;          // small label above headline
  headline: string;          // supports merge tags
  subheadline?: string;
  imageUrl?: string;         // hero image URL (for 'image' variant)
  illustrationSvg?: string;  // raw inline SVG (for 'illustration' variant)
  gradientFrom?: string;     // for 'gradient' variant
  gradientTo?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  align?: Alignment;
}

export interface HeadingBlock extends BaseBlock {
  type: 'heading';
  level: 1 | 2 | 3;
  text: string;
  align?: Alignment;
  color?: string;
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  content: string;           // supports simple inline <strong>, <em>, <a>
  align?: Alignment;
  color?: string;
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  url: string;
  alt: string;
  width?: number;            // max width in px
  href?: string;             // if clickable
  caption?: string;
}

export interface ButtonBlock extends BaseBlock {
  type: 'button';
  label: string;
  url: string;
  variant?: ButtonVariant;
  align?: Alignment;
  fullWidth?: boolean;
}

export interface DividerBlock extends BaseBlock {
  type: 'divider';
  style?: 'solid' | 'dashed';
  color?: string;
}

export interface SpacerBlock extends BaseBlock {
  type: 'spacer';
  height: number;            // px
}

export interface CardGridBlock extends BaseBlock {
  type: 'cardGrid';
  columns: 2 | 3;
  cards: {
    id: string;
    imageUrl?: string;
    illustrationSvg?: string;
    title: string;
    body?: string;
    ctaLabel?: string;
    ctaUrl?: string;
  }[];
}

export interface TestimonialBlock extends BaseBlock {
  type: 'testimonial';
  quote: string;
  authorName: string;
  authorTitle?: string;
  authorAvatarUrl?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
}

export interface StatBlock extends BaseBlock {
  type: 'stat';
  columns: 2 | 3 | 4;
  items: { value: string; label: string }[];
}

export interface SignatureBlock extends BaseBlock {
  type: 'signature';
  name: string;
  title?: string;
  avatarUrl?: string;
  message?: string;          // optional short note above signature
}

export interface PostscriptBlock extends BaseBlock {
  type: 'postscript';
  content: string;           // "P.S. ..." renders with italic + subtle color
}

export interface FooterBlock extends BaseBlock {
  type: 'footer';
  showUnsubscribe: boolean;
  showPreferenceCenter: boolean;
  socialLinks?: { platform: 'twitter' | 'instagram' | 'linkedin' | 'facebook' | 'youtube' | 'tiktok'; url: string }[];
  legalNote?: string;        // free text, e.g. copyright line
}

export type Block =
  | HeroBlock
  | HeadingBlock
  | TextBlock
  | ImageBlock
  | ButtonBlock
  | DividerBlock
  | SpacerBlock
  | CardGridBlock
  | TestimonialBlock
  | StatBlock
  | SignatureBlock
  | PostscriptBlock
  | FooterBlock;

// --- Template & category types ---------------------------------------------

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
  blocks: Block[];
}
