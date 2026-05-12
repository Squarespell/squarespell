// ============================================================================
// Phase 3: Task 3.7 - Brand Kit Auto-Apply System
// ============================================================================

import type { EmailTemplateV2, GlobalStyles, Section, Row, Column, BlockV2 } from './schema';

// ---------------------------------------------------------------------------
// Brand Kit Schema
// ---------------------------------------------------------------------------

export interface BrandKitV2 {
  logoUrl: string;
  logoDarkUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  senderName: string;
  senderTitle: string;
  businessName: string;
  businessAddress: string;
  supportEmail: string;
}

export const DEFAULT_BRAND_KIT_V2: BrandKitV2 = {
  logoUrl: '',
  primaryColor: '#0f7377',
  secondaryColor: '#6B7280',
  fontFamily: 'Inter',
  senderName: 'The team',
  senderTitle: 'Here to help',
  businessName: 'Your business',
  businessAddress: '651 N Broad St, Suite 201, Middletown, DE 19709',
  supportEmail: 'hello@example.com',
};

// ---------------------------------------------------------------------------
// Auto-Apply Logic
// ---------------------------------------------------------------------------

// Block types that get their color from the brand primary
const PRIMARY_COLOR_BLOCKS = new Set([
  'button',
  'score_display',
  'score_badge',
  'result_category',
  'recommendation_card',
  'retake_quiz_button',
  'comparison_bar',
  'blockquote',
  'full_width_banner',
]);

// Block types that get their logo from the brand kit
const LOGO_BLOCKS = new Set(['logo']);

// Block types that get the company name from brand kit
const COMPANY_BLOCKS = new Set(['address_block']);

interface ApplyOptions {
  overrideManual: boolean;  // if true, overwrite even manually set values
}

export function applyBrandKit(
  template: EmailTemplateV2,
  kit: BrandKitV2,
  options: ApplyOptions = { overrideManual: false },
): EmailTemplateV2 {
  // Deep clone to avoid mutation
  var result: EmailTemplateV2 = JSON.parse(JSON.stringify(template));

  // 1. Update globalStyles
  result.globalStyles.colors.primary = kit.primaryColor;
  result.globalStyles.colors.secondary = kit.secondaryColor;
  result.globalStyles.colors.link = kit.primaryColor;
  result.globalStyles.typography.fontFamily = kit.fontFamily;
  result.globalStyles.branding.logoUrl = kit.logoUrl;
  if (kit.logoDarkUrl) result.globalStyles.branding.logoDarkUrl = kit.logoDarkUrl;

  // 2. Walk all blocks and update where applicable
  for (var si = 0; si < result.sections.length; si++) {
    var section = result.sections[si];
    for (var ri = 0; ri < section.rows.length; ri++) {
      for (var ci = 0; ci < section.rows[ri].columns.length; ci++) {
        var col = section.rows[ri].columns[ci];
        for (var bi = 0; bi < col.blocks.length; bi++) {
          col.blocks[bi] = applyBrandToBlock(col.blocks[bi], kit, result.globalStyles, options);
        }
      }
    }
  }

  return result;
}

function applyBrandToBlock(
  block: BlockV2,
  kit: BrandKitV2,
  gs: GlobalStyles,
  options: ApplyOptions,
): BlockV2 {
  var b = block;

  switch (b.type) {
    case 'logo': {
      var lb = b as any;
      // Only override if empty or overrideManual is true
      if (!lb.properties.src || options.overrideManual) {
        lb.properties.src = kit.logoUrl;
      }
      break;
    }
    case 'button': {
      var bb = b as any;
      if (bb.properties.variant === 'primary') {
        if (bb.styles.backgroundColor === '#0f7377' || options.overrideManual) {
          bb.styles.backgroundColor = kit.primaryColor;
        }
      }
      break;
    }
    case 'score_display': {
      var sd = b as any;
      if (sd.styles.scoreColor === '#0f7377' || options.overrideManual) {
        sd.styles.scoreColor = kit.primaryColor;
      }
      break;
    }
    case 'score_badge': {
      var sb = b as any;
      if (sb.styles.badgeBackgroundColor === '#0f7377' || options.overrideManual) {
        sb.styles.badgeBackgroundColor = kit.primaryColor;
      }
      break;
    }
    case 'result_category': {
      var rc = b as any;
      if (rc.styles.eyebrowColor === '#0f7377' || options.overrideManual) {
        rc.styles.eyebrowColor = kit.primaryColor;
      }
      break;
    }
    case 'recommendation_card': {
      var rk = b as any;
      if (rk.styles.ctaBackgroundColor === '#0f7377' || options.overrideManual) {
        rk.styles.ctaBackgroundColor = kit.primaryColor;
      }
      break;
    }
    case 'comparison_bar': {
      var cb = b as any;
      if (cb.styles.yourColor === '#0f7377' || options.overrideManual) {
        cb.styles.yourColor = kit.primaryColor;
      }
      break;
    }
    case 'blockquote': {
      var bq = b as any;
      if (bq.styles.borderLeftColor === '#0f7377' || options.overrideManual) {
        bq.styles.borderLeftColor = kit.primaryColor;
      }
      break;
    }
    case 'full_width_banner': {
      var fb = b as any;
      if (fb.styles.backgroundColor === '#0f7377' || options.overrideManual) {
        fb.styles.backgroundColor = kit.primaryColor;
      }
      break;
    }
    case 'address_block': {
      var ab = b as any;
      if (ab.properties.companyName === '{{company_name}}' || options.overrideManual) {
        // Keep the merge tag - it resolves at send time
      }
      break;
    }
  }

  // Handle two_column_layout and three_column_layout nested blocks
  if (b.type === 'two_column_layout') {
    var tcl = b as any;
    for (var i = 0; i < tcl.leftColumn.length; i++) {
      tcl.leftColumn[i] = applyBrandToBlock(tcl.leftColumn[i], kit, gs, options);
    }
    for (var j = 0; j < tcl.rightColumn.length; j++) {
      tcl.rightColumn[j] = applyBrandToBlock(tcl.rightColumn[j], kit, gs, options);
    }
  }
  if (b.type === 'three_column_layout') {
    var thl = b as any;
    for (var c = 0; c < 3; c++) {
      for (var k = 0; k < thl.columns[c].length; k++) {
        thl.columns[c][k] = applyBrandToBlock(thl.columns[c][k], kit, gs, options);
      }
    }
  }

  return b;
}

// ---------------------------------------------------------------------------
// Conflict Resolution Rules
// ---------------------------------------------------------------------------
//
// When a block has a manual override (user changed the color from the default):
//
// 1. overrideManual: false (default)
//    - Only updates blocks where the current value matches the old default (#0f7377)
//    - Preserves any manually set colors
//    - This is the behavior for "Apply Brand Kit" button click
//
// 2. overrideManual: true
//    - Overwrites ALL blocks regardless of current value
//    - Used for "Reset to Brand Kit" action
//    - Shows a confirmation dialog: "This will reset all custom colors to your brand kit."
