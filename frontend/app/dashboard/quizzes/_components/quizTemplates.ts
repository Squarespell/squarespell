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
  topic?: string;
  goal: "capture" | "recommend" | "score" | "grow";
  brand?: {
    businessType: string;
    audience: string;
    tone: string;
    keyOffer: string;
    primaryColor?: string;
    accentColor?: string;
  };
};

export async function createQuizFromUrl(input: CreateQuizFromUrlInput): Promise<{ id: string }> {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://squarespell-api.onrender.com";

  async function getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (typeof window !== "undefined") {
      const clerk = (window as { Clerk?: { session?: { getToken: () => Promise<string | null> } } }).Clerk;
      if (clerk?.session) {
        try {
          const token = await clerk.session.getToken();
          if (token) headers["Authorization"] = "Bearer " + token;
        } catch {}
      }
    }
    return headers;
  }

  // Warm the backend. Render free tier spins down after 15 min idle; the first
  // POST after idle can hang 30-60s while the dyno boots. We fire a /health ping
  // first to wake it, so the real POST lands on a warm server.
  try {
    const warmCtl = new AbortController();
    const warmTimer = setTimeout(function () { warmCtl.abort(); }, 5000);
    await fetch(API + "/health", { method: "GET", signal: warmCtl.signal }).catch(function () { return null; });
    clearTimeout(warmTimer);
  } catch {}

  const headers = await getAuthHeaders();
  const payload = {
    url: input.url,
    context: input.context,
    topic: (input.topic && input.topic.trim()) ? input.topic.trim() : input.context,
    goal: input.goal,
    brand: input.brand,
  };

  // 150s timeout: Render cold start (up to 60s) + scrape (10s) + 2 LLM calls (up to 60s).
  const ctl = new AbortController();
  const timer = setTimeout(function () { ctl.abort(); }, 150000);

  let res: Response;
  try {
    res = await fetch(API + "/api/quizzes/from-url", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
      signal: ctl.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    const name = err instanceof Error ? err.name : "";
    const msg = err instanceof Error ? err.message : String(err);
    if (name === "AbortError") {
      throw new Error("The generator took too long to respond. Our service may be warming up — please wait 30 seconds and try again.");
    }
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      throw new Error("Could not reach the generator (" + API + "). If this is the first request in a while, it may be starting up — wait 30 seconds and retry. If it keeps failing, check that ad-blockers are not blocking onrender.com.");
    }
    throw new Error("Network error: " + msg);
  }
  clearTimeout(timer);

  if (!res.ok) {
    let msg = "Quiz creation failed (" + res.status + ")";
    try {
      const errBody = await res.json();
      if (errBody?.error) msg = String(errBody.error);
    } catch {}
    throw new Error(msg);
  }
  const raw = (await res.json()) as { quiz?: { id?: string }; id?: string };
  const id = raw?.quiz?.id ?? raw?.id;
  if (!id) throw new Error("Server returned no quiz id");
  return { id };
}
