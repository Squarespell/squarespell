// ============================================================================
// AI Auto-Design: Brand Kit + Quiz Content -> Branded Canva Template
// ============================================================================
// Takes a user's brand kit (colors, fonts, logo) and quiz data and picks
// the best Canva template, applying brand colors and generating quiz-specific
// content (headings, paragraphs, CTAs) to produce a ready-to-send email.
// ============================================================================

import { CANVA_TEMPLATES } from '../canvaTemplates';
import type { CanvaTemplate } from '../canvaTemplates';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BrandKitFromAPI {
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
    [key: string]: string | undefined;
  };
  dark_colors?: Record<string, string>;
  color_mode?: string;
  font_family?: string;
  site_name?: string;
  favicon_url?: string;
  logo_url?: string;
}

export interface QuizData {
  id: string;
  title: string;
  slug?: string;
  category?: string;
  outcomes?: Array<{
    id: string;
    name: string;
    description?: string;
    score_range?: { min: number; max: number };
  }>;
  questions?: Array<{
    id: string;
    text: string;
    type?: string;
  }>;
}

export interface AutoDesignResult {
  templateId: string;
  title: string;
  description: string;
  html: string;
  subject: string;
  preheader: string;
  brandApplied: boolean;
  quizContentApplied: boolean;
  sourceCanvaId: string;
}

// ---------------------------------------------------------------------------
// Category matching: maps quiz categories to template categories
// ---------------------------------------------------------------------------

var CATEGORY_MAP: Record<string, string[]> = {
  'e-commerce': ['E-commerce'],
  'ecommerce': ['E-commerce'],
  'shop': ['E-commerce'],
  'store': ['E-commerce'],
  'retail': ['E-commerce'],
  'product': ['E-commerce'],
  'fashion': ['E-commerce'],
  'beauty': ['E-commerce', 'Healthcare'],
  'education': ['Education'],
  'learning': ['Education'],
  'course': ['Education'],
  'training': ['Education'],
  'school': ['Education'],
  'fitness': ['Fitness'],
  'gym': ['Fitness'],
  'workout': ['Fitness'],
  'sport': ['Fitness'],
  'exercise': ['Fitness'],
  'wellness': ['Fitness', 'Healthcare'],
  'health': ['Healthcare'],
  'healthcare': ['Healthcare'],
  'medical': ['Healthcare'],
  'nutrition': ['Healthcare'],
  'diet': ['Healthcare', 'Fitness'],
  'mental health': ['Healthcare'],
  'therapy': ['Healthcare'],
  'media': ['Media'],
  'content': ['Media'],
  'news': ['Media'],
  'entertainment': ['Media'],
  'podcast': ['Media'],
  'real estate': ['Real Estate'],
  'realestate': ['Real Estate'],
  'property': ['Real Estate'],
  'home': ['Real Estate'],
  'housing': ['Real Estate'],
  'mortgage': ['Real Estate'],
  'saas': ['SaaS'],
  'software': ['SaaS'],
  'tech': ['SaaS'],
  'technology': ['SaaS'],
  'app': ['SaaS'],
  'startup': ['SaaS'],
  'business': ['SaaS'],
  'finance': ['SaaS'],
  'marketing': ['SaaS', 'Media'],
};

// ---------------------------------------------------------------------------
// Core: Pick the best Canva template for this quiz category
// ---------------------------------------------------------------------------

function pickBestCanvaTemplate(quiz: QuizData | null): CanvaTemplate {
  // Default to first SaaS template (most generic/professional)
  var fallback = CANVA_TEMPLATES[0];
  for (var f = 0; f < CANVA_TEMPLATES.length; f++) {
    if (CANVA_TEMPLATES[f].category === 'SaaS') { fallback = CANVA_TEMPLATES[f]; break; }
  }

  if (!quiz || !quiz.category) return fallback;

  var cat = quiz.category.toLowerCase().trim();

  // 1. Try exact match from category map
  var mapped = CATEGORY_MAP[cat];
  if (!mapped) {
    // Try partial match on map keys
    var mapKeys = Object.keys(CATEGORY_MAP);
    for (var mk = 0; mk < mapKeys.length; mk++) {
      if (cat.indexOf(mapKeys[mk]) >= 0 || mapKeys[mk].indexOf(cat) >= 0) {
        mapped = CATEGORY_MAP[mapKeys[mk]];
        break;
      }
    }
  }

  if (mapped) {
    for (var m = 0; m < mapped.length; m++) {
      for (var t = 0; t < CANVA_TEMPLATES.length; t++) {
        if (CANVA_TEMPLATES[t].category === mapped[m]) return CANVA_TEMPLATES[t];
      }
    }
  }

  // 2. Try direct substring match on template category
  for (var i = 0; i < CANVA_TEMPLATES.length; i++) {
    var tplCat = CANVA_TEMPLATES[i].category.toLowerCase();
    if (tplCat.indexOf(cat) >= 0 || cat.indexOf(tplCat) >= 0) {
      return CANVA_TEMPLATES[i];
    }
  }

  // 3. Try matching quiz title keywords
  if (quiz.title) {
    var titleLower = quiz.title.toLowerCase();
    var titleKeys = Object.keys(CATEGORY_MAP);
    for (var tk = 0; tk < titleKeys.length; tk++) {
      if (titleLower.indexOf(titleKeys[tk]) >= 0) {
        var titleMapped = CATEGORY_MAP[titleKeys[tk]];
        for (var tm = 0; tm < titleMapped.length; tm++) {
          for (var tt = 0; tt < CANVA_TEMPLATES.length; tt++) {
            if (CANVA_TEMPLATES[tt].category === titleMapped[tm]) return CANVA_TEMPLATES[tt];
          }
        }
      }
    }
  }

  return fallback;
}

// ---------------------------------------------------------------------------
// Core: Apply brand colors and fonts to Canva HTML
// ---------------------------------------------------------------------------

function applyBrandToHtml(html: string, brandKit: BrandKitFromAPI): string {
  var result = html;

  // Replace logo if brand has one
  if (brandKit.logo_url) {
    result = result.replace(
      /(<img[^>]*alt=["']?Logo["']?[^>]*src=["'])([^"']+)(["'])/gi,
      '$1' + brandKit.logo_url + '$3'
    );
  }

  var primary = brandKit.colors && brandKit.colors.primary;
  var secondary = brandKit.colors && brandKit.colors.secondary;
  var accent = brandKit.colors && brandKit.colors.accent;
  var bgColor = brandKit.colors && brandKit.colors.background;
  var textColor = brandKit.colors && brandKit.colors.text;

  // Apply primary color to CTA buttons
  if (primary) {
    // Replace background-color on buttons/links that look like CTAs
    result = result.replace(
      /(background-color:\s*)(#[0-9a-fA-F]{3,8}|rgb[^)]*\))(;[^"]*class="[^"]*(?:btn|cta|button))/gi,
      '$1' + primary + '$3'
    );
    // Replace inline background on td elements that are dark/colored (CTA sections)
    result = result.replace(
      /(background-color:\s*#)((?:3[0-9a-f]|4[0-9a-f]|2[0-9a-f]|1[0-9a-f]|0[0-9a-f])[0-9a-f]{4})/gi,
      function(match, prefix, hex) {
        // Only replace dark backgrounds (likely accent sections)
        var r = parseInt(hex.substring(0, 2), 16);
        var g = parseInt(hex.substring(2, 4), 16);
        var b = parseInt(hex.substring(4, 6), 16);
        var brightness = (r * 299 + g * 587 + b * 114) / 1000;
        if (brightness < 80) {
          return 'background-color:' + primary;
        }
        return match;
      }
    );
  }

  // Apply brand font
  if (brandKit.font_family) {
    var fontStack = brandKit.font_family + ', Arial, Helvetica, sans-serif';
    // Replace font-family declarations in style attributes
    result = result.replace(
      /font-family:\s*"[^"]+"\s*,\s*[^;"]+/g,
      'font-family:' + fontStack
    );
    result = result.replace(
      /font-family:\s*'[^']+'\s*,\s*[^;']+/g,
      'font-family:' + fontStack
    );
  }

  // Replace site name placeholders
  if (brandKit.site_name) {
    // Replace common brand name patterns in template text
    result = result.replace(/Stone &amp; Thread Rugs/g, brandKit.site_name);
    result = result.replace(/Stone & Thread Rugs/g, brandKit.site_name);
    result = result.replace(/YourBrand/g, brandKit.site_name);
    result = result.replace(/\[Brand Name\]/g, brandKit.site_name);
    result = result.replace(/\[Company Name\]/g, brandKit.site_name);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Core: Generate email content from quiz data
// ---------------------------------------------------------------------------

interface GeneratedContent {
  heroHeading: string;
  heroSubheading: string;
  bodyParagraph: string;
  ctaText: string;
  ctaUrl: string;
  sectionHeading: string;
  sectionBody: string;
  footerTagline: string;
}

function generateContent(quiz: QuizData | null, brandName: string): GeneratedContent {
  // Default content if no quiz data
  if (!quiz) {
    return {
      heroHeading: brandName ? 'Welcome to ' + brandName : 'Your Results Are Ready',
      heroSubheading: 'We have personalized recommendations just for you.',
      bodyParagraph: 'Based on your responses, we have put together a tailored experience. Explore your personalized results and discover what is next.',
      ctaText: 'View My Results',
      ctaUrl: '{{cta_url}}',
      sectionHeading: 'What happens next?',
      sectionBody: 'Your personalized recommendations are ready to explore. Take a look and start your journey today.',
      footerTagline: brandName ? 'Powered by ' + brandName : 'Your personalized journey starts here',
    };
  }

  var quizTitle = quiz.title || 'your quiz';
  var hasOutcomes = quiz.outcomes && quiz.outcomes.length > 0;
  var outcomeNames = hasOutcomes
    ? quiz.outcomes!.slice(0, 3).map(function(o) { return o.name; }).join(', ')
    : '';

  // Generate hero heading based on quiz type/category
  var heroHeading = '{{first_name}}, your ' + quizTitle + ' results are in';
  var heroSubheading = 'We analyzed your answers and have personalized insights ready for you.';

  if (quiz.category) {
    var catLower = quiz.category.toLowerCase();
    if (catLower.indexOf('fitness') >= 0 || catLower.indexOf('health') >= 0) {
      heroHeading = '{{first_name}}, your wellness profile is ready';
      heroSubheading = 'Based on your responses, here is your personalized plan to reach your goals.';
    } else if (catLower.indexOf('education') >= 0 || catLower.indexOf('learn') >= 0) {
      heroHeading = '{{first_name}}, your learning path is ready';
      heroSubheading = 'We have mapped out the perfect next steps for your learning journey.';
    } else if (catLower.indexOf('ecom') >= 0 || catLower.indexOf('shop') >= 0 || catLower.indexOf('product') >= 0) {
      heroHeading = '{{first_name}}, your personalized picks are ready';
      heroSubheading = 'Based on your style and preferences, here are our top recommendations.';
    } else if (catLower.indexOf('real estate') >= 0 || catLower.indexOf('property') >= 0 || catLower.indexOf('home') >= 0) {
      heroHeading = '{{first_name}}, your property match is ready';
      heroSubheading = 'We have found options that align perfectly with your criteria.';
    } else if (catLower.indexOf('saas') >= 0 || catLower.indexOf('tech') >= 0 || catLower.indexOf('software') >= 0) {
      heroHeading = '{{first_name}}, your solution assessment is complete';
      heroSubheading = 'Here is what we recommend based on your specific needs and goals.';
    }
  }

  // Body paragraph
  var bodyParagraph = hasOutcomes
    ? 'Your result: {{outcome_name}}. ' + (quiz.outcomes![0].description || 'This means you are on the right track. Explore your full results below to see detailed recommendations tailored specifically to you.')
    : 'Based on your answers to ' + quizTitle + ', we have prepared personalized recommendations that align with your unique profile. Explore them below.';

  // CTA
  var ctaText = 'View My Results';
  var ctaUrl = '{{cta_url}}';

  // Section content
  var sectionHeading = hasOutcomes ? 'Your personalized outcome' : 'What this means for you';
  var sectionBody = hasOutcomes
    ? 'Based on your responses, you matched with: {{outcome_name}}. ' + (outcomeNames ? 'Other possible outcomes included ' + outcomeNames + '.' : '')
    : 'Your answers reveal unique insights about your preferences and needs. Our team has prepared customized next steps just for you.';

  // Footer
  var footerTagline = brandName
    ? brandName + ' - Personalized for you'
    : 'Your personalized journey starts here';

  return {
    heroHeading: heroHeading,
    heroSubheading: heroSubheading,
    bodyParagraph: bodyParagraph,
    ctaText: ctaText,
    ctaUrl: ctaUrl,
    sectionHeading: sectionHeading,
    sectionBody: sectionBody,
    footerTagline: footerTagline,
  };
}

// ---------------------------------------------------------------------------
// Core: Inject generated content into template HTML
// ---------------------------------------------------------------------------

function injectContentIntoHtml(html: string, content: GeneratedContent): string {
  var result = html;

  // Strategy: Replace text content in common HTML patterns
  // We target headings (h1, h2, large text spans) and paragraphs

  // Replace the first large heading (hero heading)
  var heroReplaced = false;
  result = result.replace(
    /(<(?:td|h1|h2|span)[^>]*style="[^"]*font-size:\s*(?:2[4-9]|3[0-9]|4[0-9]|5[0-9])[^"]*font-weight:\s*(?:700|bold)[^"]*"[^>]*>)([\s\S]*?)(<\/(?:td|h1|h2|span)>)/i,
    function(match, open, text, close) {
      if (heroReplaced) return match;
      heroReplaced = true;
      return open + content.heroHeading + close;
    }
  );

  // Also try: bold + large font-size in span
  if (!heroReplaced) {
    result = result.replace(
      /(<span[^>]*style="[^"]*font-size:\s*(?:3[0-9]|4[0-9])[^"]*font-weight:\s*700[^"]*"[^>]*>)([\s\S]*?)(<\/span>)/i,
      function(match, open, _text, close) {
        if (heroReplaced) return match;
        heroReplaced = true;
        return open + content.heroHeading + close;
      }
    );
  }

  // Replace first body paragraph (medium text, not bold)
  var bodyReplaced = false;
  result = result.replace(
    /(<td[^>]*dir="ltr"[^>]*style="[^"]*font-size:\s*(?:1[4-9]|2[0-3])[^"]*"[^>]*>)((?:(?!<td).)*?(?:You asked|Based on|Natural texture|We have)[^<]*?)(<\/td>)/i,
    function(match, open, _text, close) {
      if (bodyReplaced) return match;
      bodyReplaced = true;
      return open + content.bodyParagraph + close;
    }
  );

  // Replace CTA button text
  result = result.replace(
    /(<(?:a|td|span)[^>]*(?:class="[^"]*(?:btn|cta|button)[^"]*"|style="[^"]*background-color[^"]*")[^>]*>)\s*([^<]{2,30})\s*(<\/(?:a|td|span)>)/gi,
    function(match, open, text, close) {
      var trimmed = text.trim().toLowerCase();
      // Only replace things that look like CTA text
      if (trimmed.indexOf('shop') >= 0 || trimmed.indexOf('explore') >= 0 ||
          trimmed.indexOf('learn') >= 0 || trimmed.indexOf('get') >= 0 ||
          trimmed.indexOf('start') >= 0 || trimmed.indexOf('view') >= 0 ||
          trimmed.indexOf('discover') >= 0 || trimmed.indexOf('try') >= 0 ||
          trimmed.indexOf('buy') >= 0 || trimmed.indexOf('order') >= 0) {
        return open + content.ctaText + close;
      }
      return match;
    }
  );

  // Replace "Hi Pat!" or greeting patterns with merge tag
  result = result.replace(/Hi Pat!/g, 'Hi {{first_name}}!');
  result = result.replace(/Hi \[Name\]/g, 'Hi {{first_name}}');
  result = result.replace(/Hello Pat/g, 'Hello {{first_name}}');
  result = result.replace(/Dear Pat/g, 'Dear {{first_name}}');

  return result;
}

// ---------------------------------------------------------------------------
// Core: Generate subject line from quiz data
// ---------------------------------------------------------------------------

function generateSubject(quiz: QuizData | null, brandName: string): string {
  if (quiz && quiz.title) {
    return '{{first_name}}, your ' + quiz.title + ' results are ready';
  }
  if (brandName) {
    return brandName + ' has your personalized results, {{first_name}}';
  }
  return 'Your results are ready, {{first_name}}';
}

function generatePreheader(quiz: QuizData | null, brandName: string): string {
  if (quiz && quiz.outcomes && quiz.outcomes.length > 0) {
    return 'See your personalized result and what it means for your next steps.';
  }
  if (quiz && quiz.title) {
    return 'Your ' + quiz.title + ' answers revealed something interesting.';
  }
  if (brandName) {
    return 'We have something personalized for you from ' + brandName + '.';
  }
  return 'See your personalized results and next steps inside.';
}

// ---------------------------------------------------------------------------
// Main: autoDesignTemplate
// ---------------------------------------------------------------------------

export function autoDesignTemplate(
  brandKit: BrandKitFromAPI | null,
  quiz: QuizData | null,
): AutoDesignResult {
  // 1. Pick the best Canva template
  var template = pickBestCanvaTemplate(quiz);

  // 2. Get brand name
  var brandName = (brandKit && brandKit.site_name) ? brandKit.site_name : '';

  // 3. Generate content from quiz data
  var content = generateContent(quiz, brandName);

  // 4. Start with template HTML
  var html = template.html;

  // 5. Apply brand kit (logo, colors, fonts, site name)
  if (brandKit) {
    html = applyBrandToHtml(html, brandKit);
  }

  // 6. Inject generated content (headings, paragraphs, CTAs, merge tags)
  if (quiz) {
    html = injectContentIntoHtml(html, content);
  }

  // 7. Generate subject + preheader
  var subject = generateSubject(quiz, brandName);
  var preheader = generatePreheader(quiz, brandName);

  return {
    templateId: '__ai_designed__',
    title: 'AI Recommendation' + (brandName ? ' for ' + brandName : ''),
    description: quiz
      ? 'Auto-designed with your brand colors and ' + (quiz.title || 'quiz') + ' content. Merge tags included for personalization.'
      : brandKit
        ? 'Auto-designed with your website colors, fonts, and logo. Ready to customize.'
        : 'Best template match for your quiz type. Add your brand kit for full customization.',
    html: html,
    subject: subject,
    preheader: preheader,
    brandApplied: !!brandKit,
    quizContentApplied: !!(quiz && quiz.outcomes && quiz.outcomes.length > 0),
    sourceCanvaId: template.id,
  };
}
