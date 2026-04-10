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
 */
function normalizeQuiz(raw: any): any {
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

  console.log(`[Claude] Generating quiz for: ${siteName} (${websiteUrl})`);
  console.log(`[Claude] Business summary available: ${businessSummary.length} chars`);

  const systemPrompt = `You are an expert lead-generation quiz creator. Your job is to create quizzes that help website visitors discover which product or service from a specific business is right for them.

CRITICAL INSTRUCTIONS:
1. You will receive scraped content from a real business website. READ IT CAREFULLY.
2. Your quiz MUST be 100% specific to this exact business and what they sell/offer.
3. Every question must help segment visitors based on the business's actual products, services, or solutions.
4. Every outcome must recommend a specific product/service/solution from THIS business.

BANNED CONTENT (instant failure if included):
- "Squarespace" — NEVER mention Squarespace, website building, templates, plugins, or web design unless the business ACTUALLY sells those things
- "journey" — do not ask "where are you in your [X] journey"
- Generic personality quiz questions that don't relate to the business
- Questions about the visitor's experience with the business's platform/tools
- Questions about website design, SEO, or marketing unless the business sells those services

HOW TO CREATE A GREAT QUIZ:
- Read the website content to identify: what they sell, who they serve, what problems they solve
- Title should promise a personalized recommendation for the visitor (e.g., "Which [product category] fits your needs?")
- Questions should uncover the visitor's situation, needs, budget, timeline, or preferences
- Each answer option should map to different products/services the business offers
- Results should name specific offerings and explain why they're the best fit

OUTPUT: Return ONLY valid JSON. No markdown, no backticks, no explanation text.`;

  const userPrompt = `Create a lead-generation quiz for this business. Read the website content below, then generate a quiz that matches visitors to this business's specific products/services.

BUSINESS: ${siteName}
URL: ${websiteUrl}

${'='.repeat(60)}
WEBSITE CONTENT — READ THIS CAREFULLY:
${'='.repeat(60)}
${businessSummary || `Could not scrape the website. Based on the URL "${websiteUrl}" and business name "${siteName}", research what this business likely sells. Create a quiz about their probable products/services. Be specific — guess based on the domain name and business name.`}
${'='.repeat(60)}

TASK: Based on the content above, identify what ${siteName} sells or offers. Then create a quiz that:
1. Helps visitors figure out which of ${siteName}'s products/services is right for them
2. Asks about the VISITOR's needs, goals, situation — NOT about the business itself
3. Uses language and terminology from the website content
4. Recommends specific products/services from ${siteName} in the outcomes

Generate exactly 10 questions with 4 options each, and 3-5 outcomes. Return this JSON structure:
{
  "title": "Which [specific product/service category from ${siteName}] is right for you?",
  "description": "One line promising personalized recommendation",
  "questions": [
    {
      "id": "q1",
      "type": "single",
      "text": "Question about the visitor's needs that maps to products/services?",
      "subtitle": "Optional context",
      "options": [
        { "id": "a", "text": "Option mapping to product/service A", "score": 3 },
        { "id": "b", "text": "Option mapping to product/service B", "score": 2 },
        { "id": "c", "text": "Option mapping to product/service C", "score": 1 },
        { "id": "d", "text": "Option for unsure visitors", "score": 0 }
      ]
    }
  ],
  "outcomes": [
    {
      "id": "r1",
      "title": "Specific product/service name from ${siteName}",
      "description": "2-3 sentences explaining why this is the best fit, referencing specific features/benefits from the website.",
      "minScore": 10,
      "maxScore": 15,
      "ctaText": "Explore [product name]",
      "ctaUrl": ""
    }
  ],
  "leadGate": {
    "headline": "Your personalized recommendation is ready!",
    "subtext": "Enter your email to see which ${siteName} solution fits you best",
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
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const raw = message.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');

  console.log(`[Claude] Response length: ${raw.length} chars`);
  console.log(`[Claude] First 200 chars: ${raw.slice(0, 200)}`);

  try {
    const parsed = JSON.parse(extractJSON(raw));
    const normalized = normalizeQuiz(parsed);
    console.log(`[Claude] Quiz title: "${normalized.title}"`);
    console.log(`[Claude] Questions: ${normalized.questions?.length}, Outcomes: ${normalized.outcomes?.length}`);
    return normalized;
  } catch {
    console.error('[Claude] Parse failed, raw:', raw.substring(0, 500));
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
