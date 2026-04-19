// ============================================================================
// Phase 2: Email Builder v2 - Render Engine
// ============================================================================
// JSON -> email-safe HTML. TABLE-based layout, inline CSS only, Outlook MSO
// conditionals, mobile responsive media queries, VML button fallbacks.
// ============================================================================
//
// Task 2.1 - Renderer Architecture (ASCII tree)
// -----------------------------------------------
// EmailTemplateV2 (JSON)
//  |
//  +-- renderTemplate()
//       |
//       +-- emailShell (DOCTYPE, head, CSS reset, MSO conditionals)
//       |    |
//       |    +-- preheaderText (hidden preview text injection)
//       |    |
//       |    +-- container TABLE (max-width from globalStyles)
//       |         |
//       |         +-- for each section in sections[]
//       |              |
//       |              +-- renderSection(section, globalStyles)
//       |                   |
//       |                   +-- for each row in section.rows[]
//       |                        |
//       |                        +-- renderRow(row, globalStyles)
//       |                             |
//       |                             +-- for each column in row.columns[]
//       |                                  |
//       |                                  +-- renderColumn(column, globalStyles)
//       |                                       |
//       |                                       +-- for each block in column.blocks[]
//       |                                            |
//       |                                            +-- renderBlock(block, globalStyles)
//       |                                                 |
//       |                                                 +-- block-type-specific renderer
//       |
//       +-- mobileCSS (responsive media queries)
//       |
//       +-- close shell
//
// -----------------------------------------------

import type {
  EmailTemplateV2,
  GlobalStyles,
  Section,
  Row,
  Column,
  BlockV2,
  BlockV2Type,
  Alignment,
  LogoBlock,
  HeadingBlockV2,
  ParagraphBlock,
  ImageBlockV2,
  ButtonBlockV2,
  SpacerBlockV2,
  DividerBlockV2,
  BlockquoteBlock,
  TwoColumnLayoutBlock,
  ThreeColumnLayoutBlock,
  FullWidthBannerBlock,
  CardBlock,
  ScoreDisplayBlock,
  ScoreBadgeBlock,
  ResultCategoryBlock,
  ResultDescriptionBlock,
  RecommendationCardBlock,
  RetakeQuizButtonBlock,
  ScoreBreakdownBlock,
  ComparisonBarBlock,
  PreheaderTextBlock,
  UnsubscribeBlock,
  AddressBlock,
  ViewInBrowserBlock,
  DEFAULT_GLOBAL_STYLES,
} from './schema';

// ---------------------------------------------------------------------------
// Task 2.6 - Dynamic Variable Replacement
// ---------------------------------------------------------------------------

export interface TemplateData {
  first_name?: string;
  last_name?: string;
  email?: string;
  quiz_result?: string;
  score?: string;
  result_category?: string;
  result_description?: string;
  recommendation?: string;
  company_name?: string;
  unsubscribe_link?: string;
  preference_link?: string;
  view_in_browser_link?: string;
  cta_url?: string;
  quiz_url?: string;
  date?: string;
  expiry_date?: string;
  brand_name?: string;
  [key: string]: unknown;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function replaceVariables(html: string, data: TemplateData): string {
  return html.replace(/\{\{([^}]+)\}\}/g, function (_match, key) {
    var trimmed = key.trim();
    // Support nested paths like "answers.biggest_goal"
    var parts = trimmed.split('.');
    var val: unknown = data;
    for (var i = 0; i < parts.length; i++) {
      if (val == null || typeof val !== 'object') { val = undefined; break; }
      val = (val as Record<string, unknown>)[parts[i]];
    }
    if (val == null) return '';
    var str = String(val);
    // Only escape if not already HTML (check for tags)
    if (str.indexOf('<') === -1) return escapeHtml(str);
    return str;
  });
}

// Shared sample data for previews
export const SAMPLE_DATA: TemplateData = {
  first_name: 'Jordan',
  last_name: 'Reyes',
  email: 'jordan@example.com',
  quiz_result: 'Minimalist Portfolio',
  score: '82',
  result_category: 'Minimalist Portfolio',
  result_description: 'A clean, gallery-first layout that puts the work first. Perfect for photographers and designers who want their portfolio to speak for itself.',
  recommendation: 'Start with the Minimalist Portfolio template and customize the gallery grid to match your work.',
  company_name: 'Squarespell',
  unsubscribe_link: '#unsubscribe',
  preference_link: '#preferences',
  view_in_browser_link: '#browser',
  cta_url: 'https://app.squarespell.com',
  quiz_url: 'https://app.squarespell.com/q/sample',
  date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  expiry_date: '48 hours',
  brand_name: 'Squarespell',
};

// ---------------------------------------------------------------------------
// Task 2.7 - Mobile Responsive Rules
// ---------------------------------------------------------------------------

function mobileCss(maxWidth: number): string {
  return `
    @media only screen and (max-width: 480px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .stack-column { display: block !important; width: 100% !important; max-width: 100% !important; }
      .stack-column-center { text-align: center !important; }
      .mobile-full-width { width: 100% !important; max-width: 100% !important; height: auto !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .mobile-text-center { text-align: center !important; }
      .mobile-text-lg { font-size: 24px !important; }
      .mobile-text-md { font-size: 16px !important; }
      .mobile-text-sm { font-size: 14px !important; }
      .mobile-button-full { display: block !important; width: 100% !important; text-align: center !important; }
      .mobile-hide { display: none !important; }
      .mobile-show { display: block !important; }
      .mobile-spacer { height: 16px !important; }
      img { max-width: 100% !important; height: auto !important; }
    }
  `;
}

// ---------------------------------------------------------------------------
// Task 2.8 - Outlook Fixes
// ---------------------------------------------------------------------------

// Problem: Outlook ignores max-width on divs.
// Fix: MSO conditional table wrapper.
function msoMaxWidth(maxWidth: number, content: string): string {
  return `<!--[if mso]><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="${maxWidth}" align="center"><tr><td><![endif]-->`
    + content
    + `<!--[if mso]></td></tr></table><![endif]-->`;
}

// Problem: Outlook ignores border-radius on buttons.
// Fix: VML roundrect element.
function vmlButton(href: string, text: string, bgColor: string, textColor: string, width: number, height: number, radius: number): string {
  return `<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:${height}px;v-text-anchor:middle;width:${width}px;" arcsize="${Math.round((radius / height) * 100)}%" strokecolor="${bgColor}" fillcolor="${bgColor}">
<w:anchorlock/>
<center style="color:${textColor};font-family:sans-serif;font-size:16px;font-weight:bold;">${text}</center>
</v:roundrect>
<![endif]-->`;
}

// Problem: Outlook column rendering with div-based layout.
// Fix: MSO table columns.
function msoColumnsOpen(columns: number[]): string {
  var out = '<!--[if mso]><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr>';
  for (var i = 0; i < columns.length; i++) {
    if (i === 0) {
      out += '<td valign="top" width="' + columns[i] + '%">';
    }
  }
  return out;
}

function msoColumnSep(widthPercent: number): string {
  return '<!--[if mso]></td><td valign="top" width="' + widthPercent + '%"><![endif]-->';
}

function msoColumnsClose(): string {
  return '<!--[if mso]></td></tr></table><![endif]-->';
}

// Problem: Outlook ignores background-image on divs.
// Fix: VML background.
function vmlBackground(bgColor: string, bgImage: string, width: number, height: number, content: string): string {
  if (!bgImage) return content;
  return `<!--[if mso]>
<v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:${width}px;height:${height}px;">
<v:fill type="tile" src="${bgImage}" color="${bgColor}" />
<v:textbox inset="0,0,0,0" style="mso-fit-shape-to-text:true">
<![endif]-->` + content + `<!--[if mso]></v:textbox></v:rect><![endif]-->`;
}

// ---------------------------------------------------------------------------
// Task 2.2 - Master HTML Wrapper (email shell)
// ---------------------------------------------------------------------------

function emailShellOpen(gs: GlobalStyles, preheader: string): string {
  var font = gs.typography.fontFamily + ', ' + gs.typography.fallbackFont;
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
<title></title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:AllowPNG/>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<style type="text/css">
  html, body { margin: 0 !important; padding: 0 !important; height: 100% !important; width: 100% !important; }
  * { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
  div[style*="margin: 16px 0"] { margin: 0 !important; }
  table, td { mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; }
  table { border-spacing: 0 !important; border-collapse: collapse !important; table-layout: fixed !important; margin: 0 auto !important; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  a { text-decoration: none; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
  ${mobileCss(gs.spacing.containerMaxWidth)}
</style>
</head>
<body style="margin:0;padding:0;word-spacing:normal;background-color:${gs.colors.background};font-family:${font};">
${preheader ? `<div style="display:none;font-size:1px;color:${gs.colors.background};line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}${'&#847; &zwnj; &nbsp; '.repeat(30)}</div>` : ''}
<div role="article" aria-roledescription="email" aria-label="Email" lang="en" style="font-size:${gs.typography.baseFontSize}px;font-family:${font};background-color:${gs.colors.background};">
${msoMaxWidth(gs.spacing.containerMaxWidth, '')}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:${gs.spacing.containerMaxWidth}px;margin:0 auto;" class="email-container">
`;
}

function emailShellClose(): string {
  return `</table>
${msoMaxWidth(0, '').replace('<table', '').replace('</td></tr></table>', '')}
</div>
</body>
</html>`;
  // Simplified close
}

// Actually, let me fix the shell close to be correct:
function emailShellCloseFixed(): string {
  return `</table>
<!--[if mso]></td></tr></table><![endif]-->
</div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Task 2.3 - Section Renderer
// ---------------------------------------------------------------------------

function renderSection(section: Section, gs: GlobalStyles): string {
  var s = section.styles;
  var out = `<tr><td style="background-color:${s.backgroundColor};padding:${s.paddingTop}px ${s.paddingRight}px ${s.paddingBottom}px ${s.paddingLeft}px;${s.borderTop ? 'border-top:' + s.borderTop + ';' : ''}${s.borderBottom ? 'border-bottom:' + s.borderBottom + ';' : ''}" class="mobile-padding">`;

  // Render each row inside the section
  for (var i = 0; i < section.rows.length; i++) {
    out += renderRow(section.rows[i], gs);
  }

  out += '</td></tr>';
  return out;
}

// ---------------------------------------------------------------------------
// Task 2.4 - Row + Column Renderer (TABLE-based)
// ---------------------------------------------------------------------------

function renderRow(row: Row, gs: GlobalStyles): string {
  var rs = row.styles;
  var cols = row.columns;

  if (cols.length === 1) {
    // Single column - simple render
    return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="${rs.backgroundColor ? 'background-color:' + rs.backgroundColor + ';' : ''}padding-top:${rs.paddingTop}px;padding-bottom:${rs.paddingBottom}px;">
<tr><td style="padding:0;" valign="${cols[0].properties.verticalAlign}">
${renderColumn(cols[0], gs)}
</td></tr></table>`;
  }

  // Multi-column: use MSO conditional tables for Outlook
  var widths = cols.map(function (c) { return c.properties.widthPercent; });
  var containerWidth = gs.spacing.containerMaxWidth;

  var out = `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="${rs.backgroundColor ? 'background-color:' + rs.backgroundColor + ';' : ''}padding-top:${rs.paddingTop}px;padding-bottom:${rs.paddingBottom}px;">
<tr><td style="padding:0;">`;

  // Open MSO table for Outlook
  out += '<!--[if mso]><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr>';

  for (var i = 0; i < cols.length; i++) {
    var pxWidth = Math.floor((widths[i] / 100) * containerWidth);
    var gapPx = i < cols.length - 1 ? rs.gap : 0;

    if (i > 0) {
      // Outlook gap column
      if (rs.gap > 0) {
        out += '<!--[if mso]><td width="' + rs.gap + '" style="width:' + rs.gap + 'px;">&nbsp;</td><![endif]-->';
      }
    }

    out += '<!--[if mso]><td valign="' + cols[i].properties.verticalAlign + '" width="' + pxWidth + '"><![endif]-->';

    out += `<div class="stack-column" style="display:inline-block;vertical-align:${cols[i].properties.verticalAlign};width:100%;max-width:${widths[i]}%;${i < cols.length - 1 ? 'padding-right:' + (rs.gap / 2) + 'px;' : ''}${i > 0 ? 'padding-left:' + (rs.gap / 2) + 'px;' : ''}">`;
    out += renderColumn(cols[i], gs);
    out += '</div>';

    out += '<!--[if mso]></td><![endif]-->';
  }

  out += '<!--[if mso]></tr></table><![endif]-->';
  out += '</td></tr></table>';

  return out;
}

function renderColumn(col: Column, gs: GlobalStyles): string {
  var cs = col.styles;
  var out = `<div style="padding:${cs.paddingTop}px ${cs.paddingRight}px ${cs.paddingBottom}px ${cs.paddingLeft}px;${cs.backgroundColor ? 'background-color:' + cs.backgroundColor + ';' : ''}">`;

  for (var i = 0; i < col.blocks.length; i++) {
    out += renderBlock(col.blocks[i], gs);
  }

  out += '</div>';
  return out;
}

// ---------------------------------------------------------------------------
// Task 2.5 - Block Renderers
// ---------------------------------------------------------------------------

function renderBlock(block: BlockV2, gs: GlobalStyles): string {
  switch (block.type) {
    case 'logo': return renderLogo(block as LogoBlock, gs);
    case 'heading': return renderHeading(block as HeadingBlockV2, gs);
    case 'paragraph': return renderParagraph(block as ParagraphBlock, gs);
    case 'image': return renderImage(block as ImageBlockV2, gs);
    case 'button': return renderButton(block as ButtonBlockV2, gs);
    case 'spacer': return renderSpacer(block as SpacerBlockV2);
    case 'divider': return renderDivider(block as DividerBlockV2);
    case 'blockquote': return renderBlockquote(block as BlockquoteBlock, gs);
    case 'two_column_layout': return renderTwoCol(block as TwoColumnLayoutBlock, gs);
    case 'three_column_layout': return renderThreeCol(block as ThreeColumnLayoutBlock, gs);
    case 'full_width_banner': return renderBanner(block as FullWidthBannerBlock, gs);
    case 'card_block': return renderCard(block as CardBlock, gs);
    case 'score_display': return renderScoreDisplay(block as ScoreDisplayBlock, gs);
    case 'score_badge': return renderScoreBadge(block as ScoreBadgeBlock, gs);
    case 'result_category': return renderResultCategory(block as ResultCategoryBlock, gs);
    case 'result_description': return renderResultDescription(block as ResultDescriptionBlock, gs);
    case 'recommendation_card': return renderRecommendationCard(block as RecommendationCardBlock, gs);
    case 'retake_quiz_button': return renderRetakeButton(block as RetakeQuizButtonBlock, gs);
    case 'score_breakdown': return renderScoreBreakdown(block as ScoreBreakdownBlock, gs);
    case 'comparison_bar': return renderComparisonBar(block as ComparisonBarBlock, gs);
    case 'preheader_text': return ''; // handled in shell
    case 'unsubscribe_block': return renderUnsubscribe(block as UnsubscribeBlock, gs);
    case 'address_block': return renderAddress(block as AddressBlock, gs);
    case 'view_in_browser': return renderViewInBrowser(block as ViewInBrowserBlock, gs);
    default: return '';
  }
}

function alignToStyle(align: Alignment): string {
  return 'text-align:' + align + ';';
}

// --- Core Content Block Renderers ---

function renderLogo(b: LogoBlock, gs: GlobalStyles): string {
  var src = b.properties.src || gs.branding.logoUrl;
  // If no logo URL, render nothing (the editor will show a placeholder instead)
  if (!src) return '';
  var img = `<img src="${src}" alt="${b.properties.alt || gs.branding.logoAlt}" width="${b.properties.width || gs.branding.logoWidth}" style="display:block;border:0;outline:none;max-width:100%;height:auto;">`;
  if (b.properties.href) img = `<a href="${b.properties.href}" target="_blank">${img}</a>`;
  return `<div style="${alignToStyle(b.styles.align)}padding-top:${b.styles.paddingTop}px;padding-bottom:${b.styles.paddingBottom}px;">${img}</div>`;
}

function renderHeading(b: HeadingBlockV2, gs: GlobalStyles): string {
  var tag = 'h' + b.properties.level;
  var sizes: Record<number, number> = { 1: 32, 2: 24, 3: 20 };
  var fs = b.styles.fontSize || sizes[b.properties.level] || 24;
  return `<${tag} style="margin:0;${alignToStyle(b.styles.align)}color:${b.styles.color || gs.colors.text};font-size:${fs}px;font-weight:${b.styles.fontWeight || gs.typography.headingWeight};line-height:1.3;letter-spacing:${b.styles.letterSpacing || 0}px;padding-top:${b.styles.paddingTop}px;padding-bottom:${b.styles.paddingBottom}px;" class="mobile-text-lg">${b.properties.text}</${tag}>`;
}

function renderParagraph(b: ParagraphBlock, gs: GlobalStyles): string {
  return `<p style="margin:0;${alignToStyle(b.styles.align)}color:${b.styles.color || gs.colors.text};font-size:${b.styles.fontSize || gs.typography.baseFontSize}px;line-height:${b.styles.lineHeight || gs.typography.lineHeight};padding-top:${b.styles.paddingTop}px;padding-bottom:${b.styles.paddingBottom}px;">${b.properties.html}</p>`;
}

function renderImage(b: ImageBlockV2, gs: GlobalStyles): string {
  if (!b.properties.src) return '';
  var img = `<img src="${b.properties.src}" alt="${b.properties.alt}" width="${b.properties.width}" style="display:block;border:0;max-width:100%;height:auto;${b.styles.borderRadius ? 'border-radius:' + b.styles.borderRadius + 'px;' : ''}" class="mobile-full-width">`;
  if (b.properties.href) img = `<a href="${b.properties.href}" target="_blank">${img}</a>`;
  var captionHtml = b.properties.caption ? `<p style="margin:8px 0 0;font-size:13px;color:${gs.colors.textMuted};text-align:center;">${b.properties.caption}</p>` : '';
  return `<div style="${alignToStyle(b.styles.align)}padding-top:${b.styles.paddingTop}px;padding-bottom:${b.styles.paddingBottom}px;">${img}${captionHtml}</div>`;
}

function renderButton(b: ButtonBlockV2, gs: GlobalStyles): string {
  var bgColor = b.styles.backgroundColor || gs.colors.primary;
  var txtColor = b.styles.textColor || gs.colors.onPrimary;
  var radius = b.styles.borderRadius || gs.button.borderRadius;
  var px = b.styles.paddingX || gs.button.paddingX;
  var py = b.styles.paddingY || gs.button.paddingY;

  if (b.properties.variant === 'ghost') {
    bgColor = 'transparent';
    txtColor = b.styles.backgroundColor || gs.colors.primary;
  } else if (b.properties.variant === 'secondary') {
    bgColor = gs.colors.surface;
    txtColor = gs.colors.text;
  }

  var width = b.properties.fullWidth ? '100%' : 'auto';
  var display = b.properties.fullWidth ? 'block' : 'inline-block';

  var btnHtml = `<a href="${b.properties.href}" target="_blank" style="display:${display};${b.properties.fullWidth ? 'width:100%;' : ''}background-color:${bgColor};color:${txtColor};font-size:${b.styles.fontSize || 16}px;font-weight:${b.styles.fontWeight || 600};text-decoration:none;padding:${py}px ${px}px;border-radius:${radius}px;text-align:center;mso-hide:all;${b.properties.variant === 'ghost' ? 'border:1px solid ' + txtColor + ';' : ''}" class="${b.properties.fullWidth ? 'mobile-button-full' : ''}">${b.properties.text}</a>`;

  // VML button for Outlook (rounded corners)
  var vml = vmlButton(b.properties.href, b.properties.text, bgColor, txtColor, b.properties.fullWidth ? 560 : 200, (py * 2) + 20, radius);

  return `<div style="${alignToStyle(b.styles.align)}margin-top:${b.styles.marginTop}px;margin-bottom:${b.styles.marginBottom}px;">
${vml}
<!--[if !mso]><!-->${btnHtml}<!--<![endif]-->
</div>`;
}

function renderSpacer(b: SpacerBlockV2): string {
  return `<div style="height:${b.properties.height}px;line-height:${b.properties.height}px;font-size:1px;" class="mobile-spacer">&nbsp;</div>`;
}

function renderDivider(b: DividerBlockV2): string {
  return `<div style="margin-top:${b.styles.marginTop}px;margin-bottom:${b.styles.marginBottom}px;text-align:center;">
<hr style="border:none;border-top:${b.styles.thickness}px ${b.properties.lineStyle} ${b.styles.color};width:${b.styles.width};margin:0 auto;">
</div>`;
}

function renderBlockquote(b: BlockquoteBlock, gs: GlobalStyles): string {
  var stars = '';
  if (b.properties.rating > 0) {
    for (var i = 0; i < b.properties.rating; i++) stars += '&#9733;';
    stars = `<div style="color:#F59E0B;font-size:18px;margin-bottom:8px;">${stars}</div>`;
  }
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding:${b.styles.paddingTop}px 0 ${b.styles.paddingBottom}px;">
<tr>
<td style="width:${b.styles.borderLeftWidth}px;background-color:${b.styles.borderLeftColor};"></td>
<td style="background-color:${b.styles.backgroundColor};padding:${b.styles.paddingTop}px ${b.styles.paddingRight}px ${b.styles.paddingBottom}px ${b.styles.paddingLeft}px;">
${stars}
<p style="margin:0;font-size:${b.styles.fontSize}px;font-style:${b.styles.fontStyle};color:${gs.colors.text};line-height:1.5;">${b.properties.text}</p>
${b.properties.citation ? `<p style="margin:12px 0 0;font-size:14px;font-weight:600;color:${gs.colors.text};">${b.properties.citation}${b.properties.citationTitle ? `<br><span style="font-weight:400;color:${gs.colors.textMuted};">${b.properties.citationTitle}</span>` : ''}</p>` : ''}
</td></tr></table>`;
}

// --- Layout Block Renderers ---

function renderTwoCol(b: TwoColumnLayoutBlock, gs: GlobalStyles): string {
  var ratios = b.properties.ratio.split('-').map(function (s) { return parseInt(s, 10); });
  var maxW = gs.spacing.containerMaxWidth;

  var out = `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="${b.styles.backgroundColor ? 'background-color:' + b.styles.backgroundColor + ';' : ''}padding-top:${b.styles.paddingTop}px;padding-bottom:${b.styles.paddingBottom}px;">
<tr><td>`;

  out += '<!--[if mso]><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr>';
  out += '<!--[if mso]><td valign="top" width="' + Math.floor(maxW * ratios[0] / 100) + '"><![endif]-->';
  out += `<div class="stack-column" style="display:inline-block;vertical-align:top;width:100%;max-width:${ratios[0]}%;padding-right:${b.styles.gap / 2}px;">`;
  for (var i = 0; i < b.leftColumn.length; i++) out += renderBlock(b.leftColumn[i], gs);
  out += '</div>';
  out += '<!--[if mso]></td><![endif]-->';

  out += '<!--[if mso]><td valign="top" width="' + Math.floor(maxW * ratios[1] / 100) + '"><![endif]-->';
  out += `<div class="stack-column" style="display:inline-block;vertical-align:top;width:100%;max-width:${ratios[1]}%;padding-left:${b.styles.gap / 2}px;">`;
  for (var j = 0; j < b.rightColumn.length; j++) out += renderBlock(b.rightColumn[j], gs);
  out += '</div>';
  out += '<!--[if mso]></td></tr></table><![endif]-->';

  out += '</td></tr></table>';
  return out;
}

function renderThreeCol(b: ThreeColumnLayoutBlock, gs: GlobalStyles): string {
  var ratios = b.properties.ratio.split('-').map(function (s) { return parseInt(s, 10); });
  var maxW = gs.spacing.containerMaxWidth;

  var out = `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="${b.styles.backgroundColor ? 'background-color:' + b.styles.backgroundColor + ';' : ''}padding-top:${b.styles.paddingTop}px;padding-bottom:${b.styles.paddingBottom}px;">
<tr><td>`;
  out += '<!--[if mso]><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr>';

  for (var i = 0; i < 3; i++) {
    out += '<!--[if mso]><td valign="top" width="' + Math.floor(maxW * ratios[i] / 100) + '"><![endif]-->';
    var paddingStyle = '';
    if (i === 0) paddingStyle = 'padding-right:' + (b.styles.gap / 2) + 'px;';
    else if (i === 2) paddingStyle = 'padding-left:' + (b.styles.gap / 2) + 'px;';
    else paddingStyle = 'padding-left:' + (b.styles.gap / 2) + 'px;padding-right:' + (b.styles.gap / 2) + 'px;';

    out += `<div class="stack-column" style="display:inline-block;vertical-align:top;width:100%;max-width:${ratios[i]}%;${paddingStyle}">`;
    var colBlocks = b.columns[i];
    for (var j = 0; j < colBlocks.length; j++) out += renderBlock(colBlocks[j], gs);
    out += '</div>';
    out += '<!--[if mso]></td><![endif]-->';
  }

  out += '<!--[if mso]></tr></table><![endif]-->';
  out += '</td></tr></table>';
  return out;
}

function renderBanner(b: FullWidthBannerBlock, gs: GlobalStyles): string {
  var bgStyle = `background-color:${b.styles.backgroundColor};`;
  if (b.properties.backgroundImageUrl) {
    bgStyle += `background-image:url(${b.properties.backgroundImageUrl});background-size:cover;background-position:center;`;
  }

  var content = `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="${bgStyle}">
<tr><td style="padding:${b.styles.paddingTop}px ${b.styles.paddingRight}px ${b.styles.paddingBottom}px ${b.styles.paddingLeft}px;text-align:${b.styles.textAlign};">
<h2 style="margin:0 0 8px;color:${b.styles.textColor};font-size:28px;font-weight:700;" class="mobile-text-lg">${b.properties.headline}</h2>
${b.properties.subheadline ? `<p style="margin:0 0 20px;color:${b.styles.textColor};font-size:16px;opacity:0.9;">${b.properties.subheadline}</p>` : ''}
${b.properties.ctaText ? `<a href="${b.properties.ctaHref}" target="_blank" style="display:inline-block;background-color:${b.styles.textColor};color:${b.styles.backgroundColor};padding:12px 24px;border-radius:${gs.button.borderRadius}px;font-size:16px;font-weight:600;text-decoration:none;">${b.properties.ctaText}</a>` : ''}
</td></tr></table>`;

  if (b.properties.backgroundImageUrl) {
    return vmlBackground(b.styles.backgroundColor, b.properties.backgroundImageUrl, gs.spacing.containerMaxWidth, b.styles.minHeight, content);
  }
  return content;
}

function renderCard(b: CardBlock, gs: GlobalStyles): string {
  var borderStyle = `border:1px solid ${b.styles.borderColor};border-radius:${b.styles.borderRadius}px;overflow:hidden;`;
  if (b.styles.shadow) borderStyle += 'box-shadow:0 2px 8px rgba(0,0,0,0.08);';

  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${b.styles.backgroundColor};${borderStyle}">
${b.properties.imageUrl ? `<tr><td><img src="${b.properties.imageUrl}" alt="${b.properties.imageAlt}" width="100%" style="display:block;height:${b.styles.imageHeight}px;object-fit:cover;border:0;" class="mobile-full-width"></td></tr>` : ''}
<tr><td style="padding:${b.styles.paddingInner}px;">
<h3 style="margin:0 0 8px;font-size:18px;font-weight:600;color:${gs.colors.text};">${b.properties.title}</h3>
<p style="margin:0 0 16px;font-size:14px;color:${gs.colors.textMuted};line-height:1.5;">${b.properties.body}</p>
${b.properties.ctaText ? `<a href="${b.properties.ctaHref}" target="_blank" style="color:${gs.colors.primary};font-size:14px;font-weight:600;text-decoration:none;">${b.properties.ctaText} &rarr;</a>` : ''}
</td></tr></table>`;
}

// --- Quiz-Specific Block Renderers ---

function renderScoreDisplay(b: ScoreDisplayBlock, gs: GlobalStyles): string {
  var display = b.properties.scoreValue;
  if (b.properties.format === 'percentage') display += '%';
  else if (b.properties.format === 'fraction') display += '/' + b.properties.maxScore;

  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${b.styles.backgroundColor};border-radius:${b.styles.borderRadius}px;padding:${b.styles.paddingTop}px 0 ${b.styles.paddingBottom}px;">
<tr><td style="text-align:${b.styles.align};">
<div style="font-size:${b.styles.scoreFontSize}px;font-weight:${b.styles.scoreFontWeight};color:${b.styles.scoreColor};line-height:1.1;">${display}</div>
<div style="font-size:${b.styles.labelFontSize}px;color:${b.styles.labelColor};margin-top:8px;">${b.properties.label}</div>
</td></tr></table>`;
}

function renderScoreBadge(b: ScoreBadgeBlock, gs: GlobalStyles): string {
  var iconSvg = '';
  switch (b.properties.iconType) {
    case 'star': iconSvg = '&#9733; '; break;
    case 'trophy': iconSvg = '&#127942; '; break;
    case 'medal': iconSvg = '&#127941; '; break;
    case 'check': iconSvg = '&#10003; '; break;
  }
  return `<div style="text-align:${b.styles.align};padding:${b.styles.paddingTop}px 0 ${b.styles.paddingBottom}px;">
<div style="display:inline-block;background-color:${b.styles.badgeBackgroundColor};color:${b.styles.badgeColor};font-size:${b.styles.badgeFontSize}px;font-weight:700;padding:10px 24px;border-radius:${b.styles.badgeBorderRadius}px;">${iconSvg}${b.properties.badgeText}</div>
${b.properties.subtext ? `<div style="margin-top:8px;font-size:${b.styles.subtextFontSize}px;color:${b.styles.subtextColor};">${b.properties.subtext}</div>` : ''}
</div>`;
}

function renderResultCategory(b: ResultCategoryBlock, gs: GlobalStyles): string {
  return `<div style="text-align:${b.styles.align};padding:${b.styles.paddingTop}px 0 ${b.styles.paddingBottom}px;">
<div style="font-size:${b.styles.eyebrowFontSize}px;color:${b.styles.eyebrowColor};letter-spacing:${b.styles.eyebrowLetterSpacing}px;text-transform:uppercase;font-weight:600;margin-bottom:8px;">${b.properties.eyebrow}</div>
<div style="font-size:${b.styles.categoryFontSize}px;font-weight:${b.styles.categoryFontWeight};color:${b.styles.categoryColor};line-height:1.2;margin-bottom:12px;">${b.properties.categoryName}</div>
${b.properties.description ? `<div style="font-size:${b.styles.descriptionFontSize}px;color:${b.styles.descriptionColor};line-height:1.5;">${b.properties.description}</div>` : ''}
</div>`;
}

function renderResultDescription(b: ResultDescriptionBlock, gs: GlobalStyles): string {
  return `<div style="padding:${b.styles.paddingTop}px 0 ${b.styles.paddingBottom}px;">
${b.properties.showDivider ? `<hr style="border:none;border-top:1px solid ${b.styles.dividerColor};margin:0 0 16px;">` : ''}
<h3 style="margin:0 0 10px;font-size:${b.styles.headingFontSize}px;color:${b.styles.headingColor};font-weight:600;">${b.properties.heading}</h3>
<p style="margin:0;font-size:${b.styles.bodyFontSize}px;color:${b.styles.bodyColor};line-height:${b.styles.lineHeight};">${b.properties.body}</p>
</div>`;
}

function renderRecommendationCard(b: RecommendationCardBlock, gs: GlobalStyles): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border:1px solid ${b.styles.borderColor};border-radius:${b.styles.borderRadius}px;overflow:hidden;background-color:${b.styles.backgroundColor};${b.styles.shadow ? 'box-shadow:0 2px 8px rgba(0,0,0,0.08);' : ''}">
${b.properties.imageUrl ? `<tr><td><img src="${b.properties.imageUrl}" alt="${b.properties.imageAlt}" width="100%" style="display:block;border:0;" class="mobile-full-width"></td></tr>` : ''}
<tr><td style="padding:${b.styles.paddingInner}px;">
${b.properties.badge ? `<div style="display:inline-block;background-color:${gs.colors.primary};color:${gs.colors.onPrimary};font-size:11px;font-weight:700;padding:4px 10px;border-radius:4px;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;">${b.properties.badge}</div>` : ''}
<h3 style="margin:0 0 8px;font-size:${b.styles.titleFontSize}px;font-weight:600;color:${gs.colors.text};">${b.properties.title}</h3>
<p style="margin:0 0 16px;font-size:${b.styles.bodyFontSize}px;color:${gs.colors.textMuted};line-height:1.5;">${b.properties.body}</p>
<a href="${b.properties.ctaHref}" target="_blank" style="display:inline-block;background-color:${b.styles.ctaBackgroundColor};color:${b.styles.ctaColor};padding:10px 20px;border-radius:${gs.button.borderRadius}px;font-size:14px;font-weight:600;text-decoration:none;">${b.properties.ctaText}</a>
</td></tr></table>`;
}

function renderRetakeButton(b: RetakeQuizButtonBlock, gs: GlobalStyles): string {
  return `<div style="text-align:${b.styles.align};padding:${b.styles.paddingTop}px 0 ${b.styles.paddingBottom}px;">
<a href="${b.properties.href}" target="_blank" style="display:inline-block;background-color:${b.styles.backgroundColor};color:${b.styles.textColor};padding:14px 28px;border-radius:${b.styles.borderRadius}px;font-size:${b.styles.fontSize}px;font-weight:600;text-decoration:none;border:1px solid ${gs.colors.border};">${b.properties.text}</a>
${b.properties.subtitle ? `<div style="margin-top:8px;font-size:${b.styles.subtitleFontSize}px;color:${b.styles.subtitleColor};">${b.properties.subtitle}</div>` : ''}
</div>`;
}

function renderScoreBreakdown(b: ScoreBreakdownBlock, gs: GlobalStyles): string {
  var rows = '';
  for (var i = 0; i < b.properties.items.length; i++) {
    var item = b.properties.items[i];
    var pct = Math.min(100, Math.round((parseInt(item.value, 10) / parseInt(item.maxValue, 10)) * 100));
    rows += `<tr>
<td style="padding:6px 0;font-size:${b.styles.labelFontSize}px;color:${b.styles.labelColor};font-weight:500;width:30%;">${item.label}</td>
<td style="padding:6px 0;width:55%;">
<div style="background-color:${b.styles.barBackgroundColor};border-radius:${b.styles.barBorderRadius}px;height:${b.styles.barHeight}px;overflow:hidden;">
<div style="background-color:${item.color};height:100%;width:${pct}%;border-radius:${b.styles.barBorderRadius}px;"></div>
</div>
</td>
<td style="padding:6px 0 6px 12px;font-size:${b.styles.valueFontSize}px;color:${b.styles.valueColor};text-align:right;width:15%;">${item.value}/${item.maxValue}</td>
</tr>`;
  }
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding:${b.styles.paddingTop}px 0 ${b.styles.paddingBottom}px;">${rows}</table>`;
}

function renderComparisonBar(b: ComparisonBarBlock, gs: GlobalStyles): string {
  var yourPct = Math.min(100, Math.round((parseInt(b.properties.yourScore, 10) / parseInt(b.properties.maxScore, 10)) * 100));
  var avgPct = Math.min(100, Math.round((parseInt(b.properties.averageScore, 10) / parseInt(b.properties.maxScore, 10)) * 100));

  return `<div style="padding:${b.styles.paddingTop}px 0 ${b.styles.paddingBottom}px;">
<div style="font-size:${b.styles.labelFontSize}px;color:${b.styles.labelColor};font-weight:600;margin-bottom:12px;">${b.properties.label}</div>
<div style="margin-bottom:8px;">
<div style="display:flex;justify-content:space-between;margin-bottom:4px;">
<span style="font-size:12px;color:${b.styles.yourColor};font-weight:600;">${b.properties.yourLabel}: ${b.properties.yourScore}</span>
</div>
<div style="background-color:${b.styles.barBackgroundColor};border-radius:${b.styles.barBorderRadius}px;height:${b.styles.barHeight}px;overflow:hidden;">
<div style="background-color:${b.styles.yourColor};height:100%;width:${yourPct}%;border-radius:${b.styles.barBorderRadius}px;"></div>
</div>
</div>
<div>
<div style="display:flex;justify-content:space-between;margin-bottom:4px;">
<span style="font-size:12px;color:${b.styles.averageColor};font-weight:600;">${b.properties.averageLabel}: ${b.properties.averageScore}</span>
</div>
<div style="background-color:${b.styles.barBackgroundColor};border-radius:${b.styles.barBorderRadius}px;height:${b.styles.barHeight}px;overflow:hidden;">
<div style="background-color:${b.styles.averageColor};height:100%;width:${avgPct}%;border-radius:${b.styles.barBorderRadius}px;"></div>
</div>
</div>
</div>`;
}

// --- Utility Block Renderers ---

function renderUnsubscribe(b: UnsubscribeBlock, gs: GlobalStyles): string {
  var links = `<a href="${b.properties.href}" style="color:${b.styles.linkColor};text-decoration:underline;">${b.properties.linkText}</a>`;
  if (b.properties.showPreferenceCenter) {
    links += ` | <a href="${b.properties.preferenceHref}" style="color:${b.styles.linkColor};text-decoration:underline;">${b.properties.preferenceLinkText}</a>`;
  }
  return `<div style="text-align:${b.styles.align};padding:${b.styles.paddingTop}px 0 ${b.styles.paddingBottom}px;font-size:${b.styles.fontSize}px;color:${b.styles.color};line-height:1.5;">
${b.properties.text}<br>${links}
</div>`;
}

function renderAddress(b: AddressBlock, gs: GlobalStyles): string {
  return `<div style="text-align:${b.styles.align};padding:${b.styles.paddingTop}px 0 ${b.styles.paddingBottom}px;font-size:${b.styles.fontSize}px;color:${b.styles.color};line-height:1.6;">
<strong>${b.properties.companyName}</strong><br>
${b.properties.addressLine1}<br>
${b.properties.addressLine2}
${b.properties.showLegal ? `<br><br>${b.properties.legalText}` : ''}
</div>`;
}

function renderViewInBrowser(b: ViewInBrowserBlock, gs: GlobalStyles): string {
  return `<div style="text-align:${(b as any).styles.align};padding:${(b as any).styles.paddingTop}px 0 ${(b as any).styles.paddingBottom}px;font-size:${(b as any).styles.fontSize}px;color:${(b as any).styles.color};">
${b.properties.text} <a href="${b.properties.href}" style="color:${(b as any).styles.linkColor};text-decoration:underline;">${b.properties.linkText}</a>
</div>`;
}

// ---------------------------------------------------------------------------
// Task 2.9 - Main render function
// ---------------------------------------------------------------------------

export function renderTemplateV2(
  template: EmailTemplateV2,
  data?: TemplateData,
): string {
  var gs = template.globalStyles;
  var preheaderText = '';

  // Find preheader block in first section
  for (var s = 0; s < template.sections.length; s++) {
    for (var r = 0; r < template.sections[s].rows.length; r++) {
      for (var c = 0; c < template.sections[s].rows[r].columns.length; c++) {
        for (var b = 0; b < template.sections[s].rows[r].columns[c].blocks.length; b++) {
          var blk = template.sections[s].rows[r].columns[c].blocks[b];
          if (blk.type === 'preheader_text') {
            preheaderText = (blk as PreheaderTextBlock).properties.text;
          }
        }
      }
    }
  }

  var html = emailShellOpen(gs, preheaderText);

  for (var si = 0; si < template.sections.length; si++) {
    html += renderSection(template.sections[si], gs);
  }

  html += emailShellCloseFixed();

  // Apply variable replacement if data provided
  if (data) {
    html = replaceVariables(html, data);
  }

  return html;
}

// Re-export for convenience
export { renderBlock };
