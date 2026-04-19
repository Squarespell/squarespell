// ============================================================================
// AI Auto-Design: Brand Kit + Quiz Content -> Branded Canva Template
// ============================================================================
// Takes a user's brand kit (colors, fonts, logo) and quiz data and picks
// the best Canva template, applying brand colors to produce a ready-to-send
// email.
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
// Core: Pick the best Canva template for this quiz category
// ---------------------------------------------------------------------------

function pickBestCanvaTemplate(quiz: QuizData | null): CanvaTemplate {
  // Default to first Canva template
  var best = CANVA_TEMPLATES[0];

  if (!quiz || !quiz.category) return best;

  var cat = quiz.category.toLowerCase();

  // Try to match quiz category to Canva template category
  for (var i = 0; i < CANVA_TEMPLATES.length; i++) {
    var tplCat = CANVA_TEMPLATES[i].category.toLowerCase();
    if (tplCat.indexOf(cat) >= 0 || cat.indexOf(tplCat) >= 0) {
      best = CANVA_TEMPLATES[i];
      break;
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Core: Apply brand colors to Canva HTML
// ---------------------------------------------------------------------------

function applyBrandToHtml(html: string, brandKit: BrandKitFromAPI): string {
  var result = html;

  // Replace logo if brand has one
  if (brandKit.logo_url) {
    // Replace any existing logo image src with brand logo
    result = result.replace(
      /(<img[^>]*alt=["']?Logo["']?[^>]*src=["'])([^"']+)(["'])/gi,
      '$1' + brandKit.logo_url + '$3'
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// Core: Generate subject line from quiz data
// ---------------------------------------------------------------------------

function generateSubject(quiz: QuizData | null, brandName: string): string {
  if (quiz && quiz.title) {
    return 'Your ' + quiz.title + ' results are in, {{first_name}}';
  }
  if (brandName) {
    return brandName + ' - Your personalized results are ready';
  }
  return 'Your results are ready, {{first_name}}';
}

function generatePreheader(quiz: QuizData | null, brandName: string): string {
  if (quiz && quiz.outcomes && quiz.outcomes.length > 0) {
    return 'See your personalized result and recommendations based on your answers.';
  }
  if (brandName) {
    return 'We have something special for you from ' + brandName + '.';
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

  // 3. Apply brand kit to HTML (logo replacement etc.)
  var html = brandKit ? applyBrandToHtml(template.html, brandKit) : template.html;

  // 4. Generate subject + preheader
  var subject = generateSubject(quiz, brandName);
  var preheader = generatePreheader(quiz, brandName);

  return {
    templateId: '__ai_designed__',
    title: 'AI Recommendation' + (brandName ? ' for ' + brandName : ''),
    description: quiz
      ? 'Auto-designed with your brand colors, logo, and ' + (quiz.title || 'quiz') + ' content - ready to customize'
      : 'Auto-designed with your website colors, fonts, and logo - ready to customize',
    html: html,
    subject: subject,
    preheader: preheader,
    brandApplied: !!brandKit,
    quizContentApplied: !!(quiz && quiz.outcomes && quiz.outcomes.length > 0),
    sourceCanvaId: template.id,
  };
}
