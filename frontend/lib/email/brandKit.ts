// BrandKit is the single source of truth for how every email, quiz, and landing
// page renders for a customer. Brand-import-from-URL populates it on signup;
// the user can edit any field in the Brand kit panel.

export interface BrandKit {
  id: string;
  user_id: string;
  brandName: string;

  // Visual
  logoUrl?: string;
  logoDarkUrl?: string;       // optional dark-mode variant
  primaryColor: string;       // hex, e.g. "#d2ff1d"
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
// Squarespell lime-accent dark palette so previews are legible immediately.
export const DEFAULT_BRAND_KIT: BrandKit = {
  id: 'default',
  user_id: '',
  brandName: 'Your brand',
  primaryColor: '#d2ff1d',
  onPrimaryColor: '#0b0b0c',
  secondaryColor: '#9ca3af',
  backgroundColor: '#0b0b0c',
  surfaceColor: '#141416',
  textColor: '#ececec',
  mutedTextColor: '#c7c7cc',
  borderColor: '#222222',
  accentColor: '#d2ff1d',
  headingFont: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  bodyFont: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  headingWeight: 600,
  bodyWeight: 400,
  toneWords: ['direct', 'warm', 'practical'],
  businessName: 'Your business',
  businessAddress: 'Squarespell, 651 N Broad St, Suite 201, Middletown, DE 19709',
  supportEmail: 'hello@example.com',
  social: {},
  ctaButtonRadius: 8,
  cardRadius: 12,
  headingScale: 1.0,
};

// A light-mode variant for brands that aren't dark by default.
export const LIGHT_BRAND_KIT_DEFAULTS: Partial<BrandKit> = {
  backgroundColor: '#f7f7f8',
  surfaceColor: '#ffffff',
  textColor: '#0b0b0c',
  mutedTextColor: '#6b7280',
  borderColor: '#e5e7eb',
  onPrimaryColor: '#0b0b0c',
};
