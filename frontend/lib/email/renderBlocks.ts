// Block-to-HTML renderer. Given a Block[], a BrandKit, and a MergeContext,
// produce email-client-safe HTML using the table-based layout that Gmail,
// Outlook, Apple Mail, and Yahoo all render consistently.

import {
  Block,
  HeroBlock,
  HeadingBlock,
  TextBlock,
  ImageBlock,
  ButtonBlock,
  DividerBlock,
  SpacerBlock,
  CardGridBlock,
  TestimonialBlock,
  StatBlock,
  SignatureBlock,
  PostscriptBlock,
  FooterBlock,
  Alignment,
} from './blocks';
import { BrandKit } from './brandKit';
import { MergeContext, applyMergeTags } from './mergeContext';

// Email-safe wrapper. 560px content column with responsive max-width.
function documentWrap(bodyRows: string, brand: BrandKit, preheader: string): string {
  const preheaderHidden =
    '<div style="display:none;font-size:1px;color:' + brand.backgroundColor +
    ';line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">' +
    escapeHtml(preheader) +
    '</div>';

  return (
    '<!doctype html>' +
    '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">' +
    '<head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="x-apple-disable-message-reformatting">' +
    '<meta name="color-scheme" content="light dark">' +
    '<meta name="supported-color-schemes" content="light dark">' +
    '<title></title>' +
    '<style>' +
    'a{color:inherit;}' +
    '@media only screen and (max-width:600px){' +
    '.container{width:100% !important;}' +
    '.px{padding-left:24px !important;padding-right:24px !important;}' +
    '.stack{display:block !important;width:100% !important;max-width:100% !important;}' +
    '}' +
    '</style>' +
    '</head>' +
    '<body style="margin:0;padding:0;background:' + brand.backgroundColor +
    ';font-family:' + brand.bodyFont +
    ';color:' + brand.textColor + ';-webkit-font-smoothing:antialiased;">' +
    preheaderHidden +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:' + brand.backgroundColor + ';">' +
    '<tr><td align="center" style="padding:40px 16px;">' +
    '<table role="presentation" class="container" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background:' + brand.surfaceColor +
    ';border:1px solid ' + brand.borderColor +
    ';border-radius:' + brand.cardRadius + 'px;overflow:hidden;">' +
    bodyRows +
    '</table>' +
    '</td></tr></table></body></html>'
  );
}

function escapeHtml(s: string): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function alignToCss(a?: Alignment): string {
  if (a === 'center') return 'center';
  if (a === 'right') return 'right';
  return 'left';
}

// ---------- Block renderers ------------------------------------------------

function renderHero(b: HeroBlock, brand: BrandKit, ctx: MergeContext): string {
  const eyebrow = b.eyebrow
    ? '<div style="font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:' +
      brand.primaryColor +
      ';font-weight:600;margin-bottom:12px;">' +
      escapeHtml(applyMergeTags(b.eyebrow, ctx)) +
      '</div>'
    : '';

  const headline =
    '<h1 style="margin:0 0 12px;font-family:' + brand.headingFont +
    ';font-size:' + Math.round(28 * brand.headingScale) + 'px;line-height:1.2;font-weight:' + brand.headingWeight +
    ';color:' + brand.textColor + ';">' +
    escapeHtml(applyMergeTags(b.headline, ctx)) +
    '</h1>';

  const sub = b.subheadline
    ? '<p style="margin:0 0 20px;color:' + brand.mutedTextColor +
      ';font-size:16px;line-height:1.55;">' +
      escapeHtml(applyMergeTags(b.subheadline, ctx)) +
      '</p>'
    : '';

  const cta = b.ctaLabel && b.ctaUrl
    ? renderButtonInline(
        { id: b.id + '_cta', type: 'button', label: b.ctaLabel, url: b.ctaUrl, variant: 'primary', align: b.align || 'left' },
        brand,
        ctx
      )
    : '';

  let visual = '';
  if (b.variant === 'image' && b.imageUrl) {
    visual =
      '<tr><td style="padding:0;">' +
      '<img src="' + escapeHtml(b.imageUrl) + '" alt="" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;">' +
      '</td></tr>';
  } else if (b.variant === 'illustration' && b.illustrationSvg) {
    visual =
      '<tr><td align="center" style="padding:32px 24px 0;background:' + brand.backgroundColor + ';">' +
      b.illustrationSvg +
      '</td></tr>';
  } else if (b.variant === 'gradient') {
    const from = b.gradientFrom || brand.primaryColor;
    const to = b.gradientTo || brand.surfaceColor;
    visual =
      '<tr><td style="padding:0;">' +
      '<div style="height:140px;background:linear-gradient(135deg,' + from + ' 0%,' + to + ' 100%);"></div>' +
      '</td></tr>';
  }

  return (
    visual +
    '<tr><td class="px" style="padding:28px 32px 8px;text-align:' + alignToCss(b.align) + ';">' +
    eyebrow +
    headline +
    sub +
    cta +
    '</td></tr>'
  );
}

function renderHeading(b: HeadingBlock, brand: BrandKit, ctx: MergeContext): string {
  const sizes = { 1: 26, 2: 22, 3: 18 };
  const size = Math.round(sizes[b.level] * brand.headingScale);
  const color = b.color || brand.textColor;
  const tag = 'h' + b.level;
  return (
    '<tr><td class="px" style="padding:20px 32px 4px;text-align:' + alignToCss(b.align) + ';">' +
    '<' + tag + ' style="margin:0;font-family:' + brand.headingFont +
    ';font-size:' + size + 'px;line-height:1.25;font-weight:' + brand.headingWeight +
    ';color:' + color + ';">' +
    escapeHtml(applyMergeTags(b.text, ctx)) +
    '</' + tag + '>' +
    '</td></tr>'
  );
}

function renderText(b: TextBlock, brand: BrandKit, ctx: MergeContext): string {
  const color = b.color || brand.mutedTextColor;
  return (
    '<tr><td class="px" style="padding:8px 32px;">' +
    '<p style="margin:0;color:' + color + ';font-size:15px;line-height:1.6;text-align:' + alignToCss(b.align) + ';">' +
    applyMergeTags(b.content, ctx) +
    '</p>' +
    '</td></tr>'
  );
}

function renderImage(b: ImageBlock, _brand: BrandKit, ctx: MergeContext): string {
  const url = applyMergeTags(b.url, ctx);
  const alt = applyMergeTags(b.alt || '', ctx);
  const w = b.width || 560;
  const img =
    '<img src="' + escapeHtml(url) + '" alt="' + escapeHtml(alt) +
    '" width="' + w + '" style="display:block;width:100%;max-width:' + w + 'px;height:auto;border:0;border-radius:8px;">';
  const wrapped = b.href
    ? '<a href="' + escapeHtml(applyMergeTags(b.href, ctx)) + '" target="_blank">' + img + '</a>'
    : img;
  const caption = b.caption
    ? '<div style="margin-top:8px;color:#8b8b90;font-size:12px;line-height:18px;text-align:center;">' +
      escapeHtml(applyMergeTags(b.caption, ctx)) +
      '</div>'
    : '';
  return '<tr><td class="px" style="padding:12px 32px;">' + wrapped + caption + '</td></tr>';
}

function renderButtonInline(b: ButtonBlock, brand: BrandKit, ctx: MergeContext): string {
  const url = escapeHtml(applyMergeTags(b.url, ctx));
  const label = escapeHtml(applyMergeTags(b.label, ctx));
  const variant = b.variant || 'primary';

  let bg = brand.primaryColor;
  let fg = brand.onPrimaryColor;
  let border = brand.primaryColor;
  if (variant === 'secondary') {
    bg = 'transparent';
    fg = brand.textColor;
    border = brand.borderColor;
  } else if (variant === 'ghost') {
    bg = 'transparent';
    fg = brand.textColor;
    border = 'transparent';
  }

  const width = b.fullWidth ? ';width:100%;' : '';
  const align = alignToCss(b.align);

  return (
    '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0;' +
    (align === 'center' ? 'margin-left:auto;margin-right:auto;' : '') +
    (align === 'right' ? 'margin-left:auto;' : '') +
    '"><tr><td align="' + align + '" style="border-radius:' + brand.ctaButtonRadius + 'px;background:' + bg +
    ';border:1px solid ' + border + ';' + width + '">' +
    '<a href="' + url + '" target="_blank" style="display:inline-block;padding:12px 22px;color:' + fg +
    ';font-weight:600;font-size:15px;text-decoration:none;border-radius:' + brand.ctaButtonRadius + 'px;' + width + '">' +
    label +
    '</a></td></tr></table>'
  );
}

function renderButton(b: ButtonBlock, brand: BrandKit, ctx: MergeContext): string {
  return '<tr><td class="px" style="padding:12px 32px;text-align:' + alignToCss(b.align) + ';">' +
    renderButtonInline(b, brand, ctx) +
    '</td></tr>';
}

function renderDivider(b: DividerBlock, brand: BrandKit): string {
  const color = b.color || brand.borderColor;
  const border = (b.style === 'dashed' ? 'dashed' : 'solid');
  return (
    '<tr><td class="px" style="padding:16px 32px;">' +
    '<div style="height:1px;border-top:1px ' + border + ' ' + color + ';line-height:1px;font-size:1px;">&nbsp;</div>' +
    '</td></tr>'
  );
}

function renderSpacer(b: SpacerBlock): string {
  return '<tr><td style="padding:0;height:' + b.height + 'px;line-height:' + b.height + 'px;font-size:1px;">&nbsp;</td></tr>';
}

function renderCardGrid(b: CardGridBlock, brand: BrandKit, ctx: MergeContext): string {
  const col = b.columns;
  const cellWidth = Math.floor(100 / col);
  const cells = b.cards.map(function (c) {
    const img = c.imageUrl
      ? '<img src="' + escapeHtml(applyMergeTags(c.imageUrl, ctx)) + '" alt="" width="100%" style="display:block;width:100%;height:auto;border-radius:8px 8px 0 0;">'
      : c.illustrationSvg
        ? '<div style="padding:24px;background:' + brand.backgroundColor + ';border-radius:8px 8px 0 0;text-align:center;">' + c.illustrationSvg + '</div>'
        : '';
    const cta = c.ctaLabel && c.ctaUrl
      ? '<div style="margin-top:10px;"><a href="' + escapeHtml(applyMergeTags(c.ctaUrl, ctx)) +
        '" style="color:' + brand.primaryColor + ';text-decoration:none;font-weight:600;font-size:13px;">' +
        escapeHtml(applyMergeTags(c.ctaLabel, ctx)) + ' &rarr;</a></div>'
      : '';
    const body = c.body
      ? '<div style="margin-top:6px;color:' + brand.mutedTextColor + ';font-size:13px;line-height:19px;">' +
        escapeHtml(applyMergeTags(c.body, ctx)) + '</div>'
      : '';
    return (
      '<td class="stack" valign="top" style="width:' + cellWidth + '%;padding:6px;">' +
      '<div style="background:' + brand.backgroundColor + ';border:1px solid ' + brand.borderColor +
      ';border-radius:8px;overflow:hidden;">' +
      img +
      '<div style="padding:14px;">' +
      '<div style="color:' + brand.textColor + ';font-weight:600;font-size:15px;line-height:20px;">' +
      escapeHtml(applyMergeTags(c.title, ctx)) +
      '</div>' +
      body + cta +
      '</div></div></td>'
    );
  }).join('');

  return (
    '<tr><td class="px" style="padding:12px 26px;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>' +
    cells +
    '</tr></table></td></tr>'
  );
}

function renderTestimonial(b: TestimonialBlock, brand: BrandKit, ctx: MergeContext): string {
  const avatar = b.authorAvatarUrl
    ? '<img src="' + escapeHtml(b.authorAvatarUrl) + '" width="40" height="40" alt="" style="border-radius:20px;display:block;">'
    : '<div style="width:40px;height:40px;border-radius:20px;background:' + brand.primaryColor +
      ';color:' + brand.onPrimaryColor + ';font-weight:600;font-size:15px;line-height:40px;text-align:center;">' +
      escapeHtml(b.authorName.charAt(0)) +
      '</div>';

  const stars = b.rating
    ? '<div style="color:' + brand.primaryColor + ';font-size:14px;letter-spacing:2px;margin-bottom:8px;">' +
      Array(b.rating).fill('\u2605').join('') +
      '<span style="color:' + brand.borderColor + ';">' + Array(5 - b.rating).fill('\u2605').join('') + '</span>' +
      '</div>'
    : '';

  return (
    '<tr><td class="px" style="padding:20px 32px;">' +
    '<div style="background:' + brand.backgroundColor + ';border:1px solid ' + brand.borderColor +
    ';border-radius:10px;padding:22px;">' +
    stars +
    '<div style="color:' + brand.textColor + ';font-size:16px;line-height:24px;font-style:italic;margin-bottom:16px;">&ldquo;' +
    escapeHtml(applyMergeTags(b.quote, ctx)) +
    '&rdquo;</div>' +
    '<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>' +
    '<td valign="middle" style="padding-right:12px;">' + avatar + '</td>' +
    '<td valign="middle">' +
    '<div style="color:' + brand.textColor + ';font-weight:600;font-size:14px;">' + escapeHtml(b.authorName) + '</div>' +
    (b.authorTitle
      ? '<div style="color:' + brand.mutedTextColor + ';font-size:12px;">' + escapeHtml(b.authorTitle) + '</div>'
      : '') +
    '</td>' +
    '</tr></table></div></td></tr>'
  );
}

function renderStat(b: StatBlock, brand: BrandKit): string {
  const w = Math.floor(100 / b.columns);
  const cells = b.items.map(function (it) {
    return (
      '<td class="stack" align="center" valign="top" style="width:' + w + '%;padding:16px 8px;">' +
      '<div style="font-family:' + brand.headingFont + ';font-size:28px;line-height:32px;font-weight:700;color:' + brand.primaryColor + ';">' +
      escapeHtml(it.value) + '</div>' +
      '<div style="margin-top:4px;color:' + brand.mutedTextColor + ';font-size:13px;line-height:18px;">' +
      escapeHtml(it.label) + '</div>' +
      '</td>'
    );
  }).join('');
  return (
    '<tr><td class="px" style="padding:8px 24px;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:' + brand.backgroundColor +
    ';border:1px solid ' + brand.borderColor + ';border-radius:10px;"><tr>' +
    cells +
    '</tr></table></td></tr>'
  );
}

function renderSignature(b: SignatureBlock, brand: BrandKit, ctx: MergeContext): string {
  const avatar = b.avatarUrl
    ? '<img src="' + escapeHtml(b.avatarUrl) + '" width="48" height="48" alt="" style="border-radius:24px;display:block;">'
    : '<div style="width:48px;height:48px;border-radius:24px;background:' + brand.primaryColor +
      ';color:' + brand.onPrimaryColor + ';font-weight:600;font-size:18px;line-height:48px;text-align:center;">' +
      escapeHtml(b.name.charAt(0)) +
      '</div>';

  const msg = b.message
    ? '<p style="margin:0 0 14px;color:' + brand.mutedTextColor + ';font-size:15px;line-height:22px;">' +
      escapeHtml(applyMergeTags(b.message, ctx)) +
      '</p>'
    : '';

  return (
    '<tr><td class="px" style="padding:16px 32px;">' +
    msg +
    '<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>' +
    '<td valign="middle" style="padding-right:12px;">' + avatar + '</td>' +
    '<td valign="middle">' +
    '<div style="color:' + brand.textColor + ';font-weight:600;font-size:15px;">' + escapeHtml(b.name) + '</div>' +
    (b.title
      ? '<div style="color:' + brand.mutedTextColor + ';font-size:13px;">' + escapeHtml(b.title) + '</div>'
      : '') +
    '</td>' +
    '</tr></table></td></tr>'
  );
}

function renderPostscript(b: PostscriptBlock, brand: BrandKit, ctx: MergeContext): string {
  return (
    '<tr><td class="px" style="padding:14px 32px 4px;">' +
    '<p style="margin:0;color:' + brand.mutedTextColor +
    ';font-size:14px;line-height:21px;font-style:italic;">' +
    '<strong style="color:' + brand.textColor + ';font-style:normal;">P.S.</strong> ' +
    applyMergeTags(b.content, ctx) +
    '</p></td></tr>'
  );
}

function renderFooter(b: FooterBlock, brand: BrandKit, ctx: MergeContext): string {
  const social = (b.socialLinks || []).map(function (s) {
    return (
      '<a href="' + escapeHtml(s.url) +
      '" style="display:inline-block;margin:0 6px;color:' + brand.mutedTextColor +
      ';font-size:12px;text-decoration:underline;">' + escapeHtml(s.platform) + '</a>'
    );
  }).join('');

  const prefs = b.showPreferenceCenter ? ' \u00b7 ' + ctx.footer_preference : '';
  const unsub = b.showUnsubscribe ? ' \u00b7 ' + ctx.footer_unsubscribe : '';

  return (
    '<tr><td style="padding:0;">' +
    '<div style="height:1px;background:' + brand.borderColor + ';margin:0 32px;"></div>' +
    '</td></tr>' +
    '<tr><td class="px" align="center" style="padding:20px 32px 28px;">' +
    (social ? '<div style="margin-bottom:10px;">' + social + '</div>' : '') +
    '<div style="color:' + brand.mutedTextColor + ';font-size:12px;line-height:18px;">' +
    (b.legalNote ? escapeHtml(b.legalNote) + '<br>' : '') +
    escapeHtml(ctx.footer_address) +
    '</div>' +
    '<div style="margin-top:8px;color:' + brand.mutedTextColor + ';font-size:12px;line-height:18px;">' +
    (unsub + prefs).replace(/^ \u00b7 /, '') +
    '</div>' +
    '</td></tr>'
  );
}

// ---------- Entry point -----------------------------------------------------

export interface RenderOptions {
  preheader?: string;
}

export function renderBlocks(blocks: Block[], brand: BrandKit, ctx: MergeContext, opts?: RenderOptions): string {
  const rows = blocks.map(function (b): string {
    switch (b.type) {
      case 'hero': return renderHero(b, brand, ctx);
      case 'heading': return renderHeading(b, brand, ctx);
      case 'text': return renderText(b, brand, ctx);
      case 'image': return renderImage(b, brand, ctx);
      case 'button': return renderButton(b, brand, ctx);
      case 'divider': return renderDivider(b, brand);
      case 'spacer': return renderSpacer(b);
      case 'cardGrid': return renderCardGrid(b, brand, ctx);
      case 'testimonial': return renderTestimonial(b, brand, ctx);
      case 'stat': return renderStat(b, brand);
      case 'signature': return renderSignature(b, brand, ctx);
      case 'postscript': return renderPostscript(b, brand, ctx);
      case 'footer': return renderFooter(b, brand, ctx);
      default:
        return '';
    }
  }).join('');
  return documentWrap(rows, brand, (opts && opts.preheader) || '');
}
