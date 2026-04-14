/**
 * quizTemplates.ts — frontend catalog of quiz archetypes.
 *
 * This is the UI-facing config used by the NewQuizModal to render the
 * template picker. Each entry has display metadata (icon, name, blurb)
 * plus a stable `id` that matches the backend config in
 * `backend/src/config/quizTemplates.ts`. The backend owns the actual
 * LLM steering prompts — this file is UI-only.
 *
 * Keep both files in sync on the `id` field. If you rename an id, update
 * the backend mirror and write a migration for existing quizzes whose
 * `settings.template_id` points to the old id.
 *
 * Adding a new template:
 *   1. Add entry here
 *   2. Add matching entry in backend/src/config/quizTemplates.ts
 *   3. Redeploy both
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
  blurb: string;
  icon: string; // emoji for v1; swap to SVG later
  examples: string[];
}

export const QUIZ_TEMPLATES: QuizTemplate[] = [
  {
    id: 'product_recommender',
    name: 'Product Recommender',
    blurb: 'Match visitors to the right product.',
    icon: '🛍️',
    examples: [
      'Find your perfect moisturizer',
      'Which laptop fits your workflow?',
      'Which plan is right for you?',
    ],
  },
  {
    id: 'style_finder',
    name: 'Style Finder',
    blurb: 'Reveal a personal style or aesthetic.',
    icon: '🎨',
    examples: [
      "What's your interior design style?",
      'Find your wedding aesthetic',
      "What's your signature cocktail?",
    ],
  },
  {
    id: 'personality_type',
    name: 'Personality Type',
    blurb: 'Fun archetypes worth sharing.',
    icon: '✨',
    examples: [
      'Which traveler are you?',
      "What's your founder archetype?",
      'Which workout personality fits you?',
    ],
  },
  {
    id: 'fit_guide',
    name: 'Fit & Size Guide',
    blurb: 'Help pick the right fit or size.',
    icon: '📐',
    examples: [
      'Find your ring size',
      "What's your mattress firmness?",
      'Pick the right bike frame',
    ],
  },
  {
    id: 'need_diagnosis',
    name: 'Need Diagnosis',
    blurb: 'Diagnose a specific type or need.',
    icon: '💧',
    examples: [
      "What's your skin type?",
      'Identify your hair concern',
      "What's your sleep chronotype?",
    ],
  },
  {
    id: 'knowledge_check',
    name: 'Knowledge Check',
    blurb: 'Educational — scored right vs. wrong.',
    icon: '🧠',
    examples: [
      'How much do you know about wine?',
      'SEO fundamentals quiz',
      'Financial literacy check',
    ],
  },
];

export function findTemplate(id: string | null | undefined): QuizTemplate | null {
  if (!id) return null;
  return QUIZ_TEMPLATES.find((t) => t.id === id) ?? null;
}

export type CreateQuizFromUrlInput = {
  url: string;
  context?: string;
  goal: "capture" | "recommend" | "score" | "grow";
  brand: {
    businessType: string;
    audience: string;
    tone: string;
    keyOffer: string;
  };
};

export async function createQuizFromUrl(input: CreateQuizFromUrlInput): Promise<{ id: string }> {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://squarespell-api.onrender.com";
  const res = await fetch(`${API}/api/quizzes/from-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(`Quiz creation failed (${res.status})`);
  }
  const data = (await res.json()) as { id: string };
  return data;
}
