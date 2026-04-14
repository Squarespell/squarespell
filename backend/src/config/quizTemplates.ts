/**
 * quizTemplates.ts — backend catalog of quiz archetypes.
 *
 * Owns the LLM steering prompts for each template. The frontend catalog
 * at frontend/app/dashboard/quizzes/_components/quizTemplates.ts owns
 * the UI metadata (icons, blurbs). Both must stay in sync on the `id`.
 *
 * The `system_prompt` strings are surfaced to the quiz generator as a
 * high-weight onboarding pair so the LLM can shape its output toward the
 * chosen archetype. They're intentionally instructional and specific —
 * vague prompts produce mushy quizzes.
 */

export type QuizTemplateId =
  | 'product_recommender'
  | 'style_finder'
  | 'personality_type'
  | 'fit_guide'
  | 'need_diagnosis'
  | 'knowledge_check';

export interface QuizTemplate {
  id: QuizTemplateId;
  name: string;
  system_prompt: string;
}

export const QUIZ_TEMPLATES: Record<QuizTemplateId, QuizTemplate> = {
  product_recommender: {
    id: 'product_recommender',
    name: 'Product Recommender',
    system_prompt:
      'Build a quiz that helps visitors find the right product. Outcomes ' +
      'must be specific product recommendations drawn from the site\'s ' +
      'catalog when detectable (otherwise plausible placeholders labeled as ' +
      'such). Questions should surface preferences, use cases, budget, and ' +
      'constraints that matter for the product decision. Keep it 5–7 ' +
      'questions. Each outcome should include a 1-line "why this fits you" ' +
      'explanation.',
  },
  style_finder: {
    id: 'style_finder',
    name: 'Style Finder',
    system_prompt:
      'Build a quiz that reveals the user\'s personal style or aesthetic. ' +
      'Outcomes should be 4–6 named style archetypes (e.g. "The Minimalist", ' +
      '"The Eclectic Collector") each with a short description and 2–3 ' +
      'product or content recommendations that fit. Questions should be ' +
      'visual and mood-based (this or that, favorite colors, vibe words) ' +
      'rather than purely functional. Optimize for share-worthy moments.',
  },
  personality_type: {
    id: 'personality_type',
    name: 'Personality Type',
    system_prompt:
      'Build a fun, share-worthy personality quiz. Outcomes are 4–6 named ' +
      'archetypes that resonate with the brand\'s audience. Questions should ' +
      'feel playful and revealing without being invasive or clinical. ' +
      'Optimize for emotional "that\'s so me" moments. Include a little ' +
      'humor in the copy. Keep it 6–10 questions. Each outcome gets a short, ' +
      'flattering description plus a call-to-action that matches the brand.',
  },
  fit_guide: {
    id: 'fit_guide',
    name: 'Fit & Size Guide',
    system_prompt:
      'Build a quiz that helps users find the right fit, size, or variant. ' +
      'Outcomes map to specific size/fit recommendations backed by the ' +
      'answers given. Questions capture the functional dimensions that drive ' +
      'fit (body measurements where relevant, preferences, use cases, ' +
      'environmental factors). Keep it short — fit guides win on speed. ' +
      '4–6 questions max. Include a disclaimer outcome-copy about trying ' +
      'the item when applicable.',
  },
  need_diagnosis: {
    id: 'need_diagnosis',
    name: 'Need Diagnosis',
    system_prompt:
      'Build a quiz that diagnoses the user\'s specific type, condition, or ' +
      'need (skin type, hair type, fitness level, goal category, etc.). ' +
      'Outcomes name the diagnosed type and pair it with actionable ' +
      'recommendations — at least one product/content recommendation and one ' +
      'piece of advice. Questions should be precise and feel expert-informed ' +
      'without being dry. 5–8 questions. Tone: knowledgeable friend, not ' +
      'clinical doctor.',
  },
  knowledge_check: {
    id: 'knowledge_check',
    name: 'Knowledge Check',
    system_prompt:
      'Build an educational quiz with clear right and wrong answers. ' +
      'Outcomes are score-based tiers (e.g. Beginner / Intermediate / Expert) ' +
      'with a scorecard breakdown and 2–3 learning recommendations per tier. ' +
      'Questions are fact-based and should teach something even to users who ' +
      'get them wrong. Include a short explanation field with each question ' +
      'so the user learns as they go. 7–12 questions.',
  },
};

export function getTemplate(id: string | null | undefined): QuizTemplate | null {
  if (!id) return null;
  return (QUIZ_TEMPLATES as Record<string, QuizTemplate>)[id] ?? null;
}

export function isValidTemplateId(id: unknown): id is QuizTemplateId {
  return typeof id === 'string' && id in QUIZ_TEMPLATES;
}
