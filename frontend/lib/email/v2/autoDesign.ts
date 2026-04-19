// ============================================================================
// AI Auto-Design: Brand Kit + Quiz Content -> Fully Branded Template
// ============================================================================
// Takes a user's brand kit (colors, fonts, logo from scraped website) and
// quiz data (outcomes, descriptions) and applies them to a V2 template to
// produce a fully branded, content-filled email - ready to send.
// ============================================================================

import type { EmailTemplateV2 } from './schema';
import { V2_TEMPLATES } from './templates';
import { applyBrandKit } from './brandKit';
import type { BrandKitV2 } from './brandKit';
import { renderTemplateV2 } from './renderer';
import type { TemplateData } from './renderer';

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
}

// ---------------------------------------------------------------------------
// Core: Convert API brand kit to V2 brand kit format
// ---------------------------------------------------------------------------

function toBrandKitV2(apiBk: BrandKitFromAPI): BrandKitV2 {
  return {
    logoUrl: apiBk.logo_url || '',
    primaryColor: (apiBk.colors && apiBk.colors.primary) ? apiBk.colors.primary : '#0D7377',
    secondaryColor: (apiBk.colors && apiBk.colors.secondary) ? apiBk.colors.secondary : '#6B7280',
    fontFamily: apiBk.font_family || 'Inter',
    senderName: apiBk.site_name || 'The team',
    senderTitle: '',
    businessName: apiBk.site_name || 'Your business',
    businessAddress: '',
    supportEmail: '',
  };
}

// ---------------------------------------------------------------------------
// Core: Pick the best template for this quiz
// ---------------------------------------------------------------------------

function pickBestTemplate(quiz: QuizData | null): EmailTemplateV2 {
  // Default to first V2 template (quiz-result)
  var best = V2_TEMPLATES[0];

  if (!quiz || !quiz.category) return best;

  var cat = quiz.category.toLowerCase();

  // Try to match quiz category to template category
  for (var i = 0; i < V2_TEMPLATES.length; i++) {
    var tplCat = V2_TEMPLATES[i].metadata.category.toLowerCase();
    if (tplCat.indexOf(cat) >= 0 || cat.indexOf(tplCat) >= 0) {
      best = V2_TEMPLATES[i];
      break;
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Core: Build template data from quiz content
// ---------------------------------------------------------------------------

function buildTemplateData(quiz: QuizData | null, brandName: string): TemplateData {
  var data: TemplateData = {
    first_name: '{{first_name}}',
    last_name: '{{last_name}}',
    email: '{{email}}',
    company_name: brandName || '{{company_name}}',
    brand_name: brandName || '{{brand_name}}',
    unsubscribe_link: '{{unsubscribe_link}}',
    preference_link: '{{preference_link}}',
    view_in_browser_link: '{{view_in_browser_link}}',
    cta_url: '{{cta_url}}',
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  };

  if (quiz) {
    // Use quiz title for the quiz URL
    if (quiz.slug) {
      data.quiz_url = '{{quiz_url}}';
    }

    // Use first outcome as the sample result
    if (quiz.outcomes && quiz.outcomes.length > 0) {
      var firstOutcome = quiz.outcomes[0];
      data.quiz_result = firstOutcome.name;
      data.result_category = firstOutcome.name;
      data.result_description = firstOutcome.description || 'Based on your answers, we have tailored recommendations just for you.';
      data.recommendation = firstOutcome.description || 'Check out our personalized recommendations based on your quiz results.';
      data.score = '85';
    }
  }

  return data;
}

// ---------------------------------------------------------------------------
// Core: Inject quiz-specific content into template blocks
// ---------------------------------------------------------------------------

function injectQuizContent(template: EmailTemplateV2, quiz: QuizData | null, brandName: string): EmailTemplateV2 {
  if (!quiz) return template;

  var result: EmailTemplateV2 = JSON.parse(JSON.stringify(template));

  // Walk all blocks and inject quiz-relevant content
  for (var si = 0; si < result.sections.length; si++) {
    var section = result.sections[si];
    for (var ri = 0; ri < section.rows.length; ri++) {
      for (var ci = 0; ci < section.rows[ri].columns.length; ci++) {
        var col = section.rows[ri].columns[ci];
        for (var bi = 0; bi < col.blocks.length; bi++) {
          var block = col.blocks[bi];

          // Update headings that contain generic text
          if (block.type === 'heading') {
            var hb = block as any;
            var text = hb.properties.text || '';
            // Replace "Your quiz result" type headers with quiz title
            if (text.indexOf('quiz') >= 0 || text.indexOf('Quiz') >= 0 || text.indexOf('result') >= 0) {
              if (quiz.title) {
                hb.properties.text = text
                  .replace(/Your quiz results?/gi, 'Your ' + quiz.title + ' results')
                  .replace(/Quiz results?/gi, quiz.title + ' results');
              }
            }
          }

          // Update paragraphs with quiz-specific content
          if (block.type === 'paragraph') {
            var pb = block as any;
            var pText = pb.properties.html || '';
            // Replace generic quiz references
            if (pText.indexOf('quiz') >= 0 || pText.indexOf('Quiz') >= 0) {
              if (quiz.title) {
                pb.properties.html = pText
                  .replace(/the quiz/gi, 'the ' + quiz.title)
                  .replace(/our quiz/gi, 'the ' + quiz.title);
              }
            }
          }

          // Update result category with first outcome
          if (block.type === 'result_category' && quiz.outcomes && quiz.outcomes.length > 0) {
            var rc = block as any;
            rc.properties.categoryName = '{{result_category}}';
            if (quiz.outcomes[0].description) {
              rc.properties.description = '{{result_description}}';
            }
          }

          // Update recommendation cards
          if (block.type === 'recommendation_card' && quiz.outcomes && quiz.outcomes.length > 0) {
            var rk = block as any;
            rk.properties.title = quiz.outcomes[0].name;
            if (quiz.outcomes[0].description) {
              rk.properties.body = quiz.outcomes[0].description;
            }
          }

          // Update address blocks
          if (block.type === 'address_block' && brandName) {
            var ab = block as any;
            ab.properties.companyName = brandName;
          }
        }
      }
    }
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
  // 1. Pick the best template
  var template = pickBestTemplate(quiz);

  // 2. Convert brand kit
  var brandName = (brandKit && brandKit.site_name) ? brandKit.site_name : '';
  var v2Kit = brandKit ? toBrandKitV2(brandKit) : null;

  // 3. Apply brand kit colors/fonts/logo
  var branded = v2Kit
    ? applyBrandKit(template, v2Kit, { overrideManual: true })
    : JSON.parse(JSON.stringify(template));

  // 4. Inject quiz-specific content into blocks
  var withContent = injectQuizContent(branded, quiz, brandName);

  // 5. Build template data for variable replacement
  var templateData = buildTemplateData(quiz, brandName);

  // 6. Render to HTML (but keep merge tags for actual send-time replacement)
  var html = renderTemplateV2(withContent, templateData);

  // 7. Generate subject + preheader
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
    brandApplied: !!v2Kit,
    quizContentApplied: !!(quiz && quiz.outcomes && quiz.outcomes.length > 0),
  };
}
