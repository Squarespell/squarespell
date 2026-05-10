// BrandKit is the single source of truth for how every email, quiz, and landing
// page renders for a customer. Brand-import-from-URL populates it on signup;
// the user can edit any field in the Brand kit panel.

export type ColorMode = 'light' | 'dark';

export interface BrandKit {
  id: string;
  user_id: string;
  brandName: string;

  // Visual
  logoUrl?: string;
  logoDarkUrl?: string;       // optional dark-mode variant
  colorMode?: ColorMode;      // which palette variant is active
  primaryColor: string;       // hex, e.g. "#0D7377"
  onPrimaryColor: string;     // text color that sits on primaryColor
  secondaryColor?: string;
  backgroundColor: string;    // email body background
  surfaceColor: string;       // card / content surface
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
  accentColor: string;

  // Typography
  headingFont: string;        // CSS font-family string
  bodyFont: string;
  headingWeight: 400 | 500 | 600 | 700;
  bodyWeight: 400 | 500;

  // Voice
  toneWords: string[];        // e.g. ['direct', 'warm', 'practical']

  // Compliance
  businessName: string;
  businessAddress: string;    // CAN-SPAM required line
  supportEmail: string;

  // Social
  social: {
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    facebook?: string;
    youtube?: string;
    tiktok?: string;
  };

  // Defaults used by template renderer if blocks don't override
  ctaButtonRadius: number;    // px
  cardRadius: number;
  headingScale: number;       // multiplier on base 16px, default 1.0

  updated_at?: string;
  created_at?: string;
}

// Sensible defaults before a customer has completed brand import. Uses the
// Squarespell Quiz lime-accent dark palette so previews are legible immediately.
export const DEFAULT_BRAND_KIT: BrandKit = {
  id: 'default',
  user_id: '',
  brandName: 'Your brand',
  primaryColor: '#0D7377',
  onPrimaryColor: '#FFFFFF',
  secondaryColor: '#9ca3af',
  backgroundColor: '#F7F7F5',
  surfaceColor: '#FFFFFF',
  textColor: '#1A1A1A',
  mutedTextColor: '#6b7280',
  borderColor: '#E4E3E0',
  accentColor: '#0D7377',
  headingFont: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  bodyFont: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  headingWeight: 600,
  bodyWeight: 400,
  toneWords: ['direct', 'warm', 'practical'],
  businessName: 'Your business',
  businessAddress: 'Squarespell Quiz, 651 N Broad St, Suite 201, Middletown, DE 19709',
  supportEmail: 'hello@example.com',
  social: {},
  ctaButtonRadius: 8,
  cardRadius: 12,
  headingScale: 1.0,
};

// A light-mode variant for brands that aren't dark by default.
export const LIGHT_BRAND_KIT_DEFAULTS: Partial<BrandKit> = {
  backgroundColor: '#F7F7F5',
  surfaceColor: '#ffffff',
  textColor: '#1A1A1A',
  mutedTextColor: '#6b7280',
  borderColor: '#E4E3E0',
  onPrimaryColor: '#1A1A1A',
};
