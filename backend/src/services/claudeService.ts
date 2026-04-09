import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.search(/[{[]/);
  if (start !== -1) {
    const chunk = text.slice(start);
    const end = Math.max(chunk.lastIndexOf('}'), chunk.lastIndexOf(']'));
    if (end !== -1) return chunk.slice(0, end + 1);
  }
  return text.trim();
}

/**
 * Normalize quiz JSON from Claude into a consistent shape the frontend expects.
 * Claude sometimes uses "question" vs "text", "results" vs "outcomes", etc.
 */
function normalizeQuiz(raw: any): any {
  // Normalize questions
  if (raw.questions) {
    raw.questions = raw.questions.map((q: any, i: number) => ({
      id: q.id || `q${i + 1}`,
      type: q.type || 'single',
      text: q.text || q.question || '',
      subtitle: q.subtitle || '',
      options: (q.options || []).map((o: any, j: number) => ({
        id: o.id || String.fromCharCode(97 + j),
        text: o.text || o.label || '',
        score: o.score ?? o.value ?? 0,
      })),
    }));
  }

  // Normalize outcomes/results
  const outcomes = raw.outcomes || raw.results || [];
  raw.outcomes = outcomes.map((r: any, i: number) => ({
    id: r.id || `r${i + 1}`,
    title: r.title || `Result ${i + 1}`,
    description: r.description || '',
    minScore: r.minScore ?? 0,
    maxScore: r.maxScore ?? 100,
    ctaText: r.ctaText || r.cta_text || 'Learn More',
    ctaUrl: r.ctaUrl || r.cta_url || '',
  }));

  // Keep results for backward compat
  raw.results = raw.outcomes;

  return raw;
}

async function callClaude(
  websiteUrl: string,
  quizType: string,
  goal: string,
  brandData?: any
): Promise<any> {
  const businessSummary = brandData?.business?.summary || '';
  const siteName = brandData?.site_name || (() => { try { return new URL(websiteUrl).hostname; } catch { return websiteUrl; } })();
  const brandColorPrimary = brandData?.colors?.primary || '#000000';

  const systemPrompt = `You are a world-class quiz funnel strategist who creates high-converting lead generation quizzes for businesses.

Your job: analyze the website content provided and create a quiz that is DEEPLY RELEVANT to what this business actually does and sells.

CRITICAL RULES:
- The quiz MUST be about the business's products, services, or industry — NOT about the business name or domain name
- Read the website content carefully to understand what they sell/offer
- Questions should help segment visitors into buyer personas or match them with the right product/service
- Each question should feel valuable to the quiz taker — like they're getting a personalized recommendation
- Use professional, engaging language that matches the business's tone
- The quiz title should be compelling and benefit-driven (e.g. "Which [product] is perfect for you?" or "What's your [industry] strategy style?")
- Results should provide genuine value with actionable insights specific to this business
- IMPORTANT: For the "text" field of questions, write the actual question text
- Always respond with ONLY valid JSON. No markdown. No explanation. Start with { end with }.`;

  const userPrompt = `Create a high-converting quiz funnel for this business:

WEBSITE: ${websiteUrl}
BUSINESS NAME: ${siteName}

WEBSITE CONTENT (read this carefully to understand what the business does):
${businessSummary || `(Could not scrape website content — use the URL and business name to infer what the business likely does. Be specific, not generic.)`}

QUIZ TYPE: ${quizType}
BUSINESS GOAL: ${goal}

Generate a quiz with 4-5 questions and 3 outcome profiles. The quiz should help visitors discover which product/service/approach is right for them based on their needs.

Return ONLY this JSON:
{
  "title": "Compelling quiz title",
  "description": "One line explaining what they'll discover",
  "questions": [
    {
      "id": "q1",
      "type": "single",
      "text": "The actual question text that reveals visitor's situation or need?",
      "subtitle": "Optional helpful context",
      "options": [
        { "id": "a", "text": "Option specific to this business", "score": 3 },
        { "id": "b", "text": "Another option", "score": 2 },
        { "id": "c", "text": "Third option", "score": 1 },
        { "id": "d", "text": "Fourth option", "score": 0 }
      ]
    }
  ],
  "outcomes": [
    {
      "id": "r1",
      "title": "Result name",
      "description": "2-3 sentences of personalized insight referencing this business's specific products/services.",
      "minScore": 10,
      "maxScore": 15,
      "ctaText": "Get Started",
      "ctaUrl": ""
    }
  ],
  "leadGate": {
    "headline": "Your personalized results are ready!",
    "subtext": "Enter your email to see your recommendation",
    "buttonText": "Show my results"
  },
  "settings": {
    "primaryColor": "${brandColorPrimary}",
    "showProgressBar": true,
    "requireEmail": true
  }
}`;

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const raw = message.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');

  try {
    const parsed = JSON.parse(extractJSON(raw));
    return normalizeQuiz(parsed);
  } catch {
    console.error('Parse failed, raw:', raw.substring(0, 300));
    throw new Error('Failed to generate quiz. Please try again.');
  }
}

/**
 * Process an "Other" free-text answer by matching it to the closest outcome.
 */
async function processOtherAnswer(
  freeText: string,
  availableOutcomes: { id: string; title: string; description?: string }[]
): Promise<{ matched_outcome_id: string; personalised_insight: string }> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: 'You match free-text quiz answers to the best outcome. Respond with ONLY JSON.',
    messages: [{
      role: 'user',
      content: `The user wrote: "${freeText}"\n\nAvailable outcomes:\n${availableOutcomes.map(o => `- ${o.id}: ${o.title} — ${o.description || ''}`).join('\n')}\n\nReturn: { "matched_outcome_id": "...", "personalised_insight": "1 sentence of personalized insight" }`,
    }],
  });

  const raw = message.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
  try {
    return JSON.parse(extractJSON(raw));
  } catch {
    return { matched_outcome_id: availableOutcomes[0]?.id ?? '', personalised_insight: '' };
  }
}

export { processOtherAnswer };
export const generateQuizWithClaude = callClaude;
export const generateQuiz = callClaude;
export const generateQuizContent = callClaude;
export default callClaude;
