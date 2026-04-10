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

  const systemPrompt = `You are a world-class quiz funnel strategist. You create lead generation quizzes that convert visitors into leads for businesses.

STEP 1 — UNDERSTAND THE BUSINESS:
Read ALL the website content below very carefully. Identify:
- What specific products or services does this business sell?
- Who is their target customer?
- What problems do they solve?
- What makes them different from competitors?

STEP 2 — CREATE A QUIZ THAT MATCHES VISITORS TO PRODUCTS/SERVICES:
The quiz should help visitors figure out which of this business's specific offerings is right for them.

ABSOLUTE RULES:
1. Questions MUST reference the business's actual products, services, or customer pain points — NOT generic "what's your situation" questions
2. NEVER ask about the business name, domain, or "Squarespace journey" — ask about what the VISITOR needs
3. Each option should map to a real product/service the business offers
4. Results MUST recommend specific products/services from this business with concrete details
5. Quiz title should promise a personalized recommendation (e.g. "Which [specific product category] is right for your project?")
6. Write like a knowledgeable advisor, not a generic quiz bot
7. For the "text" field, write the actual question
8. Respond with ONLY valid JSON. No markdown, no backticks, no explanation.`;

  const userPrompt = `Create a high-converting lead generation quiz for this business.

WEBSITE URL: ${websiteUrl}
BUSINESS NAME: ${siteName}

=== WEBSITE CONTENT (READ THIS CAREFULLY) ===
${businessSummary || `(Scraping failed — use the URL "${websiteUrl}" and name "${siteName}" to research what this business likely sells. Look at the domain name for clues. Be specific about likely products/services, not generic.)`}
=== END WEBSITE CONTENT ===

Based on the website content above, first understand what this business specifically sells/offers. Then create a quiz that:
- Asks about the VISITOR's needs, goals, and situation (NOT about the business itself)
- Matches visitors to specific products/services this business offers
- Questions reference real products, services, or use cases from the website
- Results recommend specific offerings with real details from the site

QUIZ TYPE: ${quizType}
GOAL: ${goal}

Generate exactly 5 questions and 3 outcomes. Return ONLY this JSON:
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
