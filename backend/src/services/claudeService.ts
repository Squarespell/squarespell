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

async function callClaude(
  websiteUrl: string,
  quizType: string,
  goal: string,
  brandData?: any
): Promise<any> {
  // Extract business context from brand data if available
  const businessSummary = brandData?.business?.summary || '';
  const siteName = brandData?.site_name || new URL(websiteUrl).hostname;
  const brandColorPrimary = brandData?.colors?.primary || '#000000';

  const systemPrompt = `You are a world-class quiz funnel strategist who creates high-converting lead generation quizzes for businesses.

Your job: analyze the website content provided and create a quiz that is DEEPLY RELEVANT to what this business actually does and sells.

CRITICAL RULES:
- The quiz MUST be about the business's products, services, or industry — NOT about the business name or domain
- Read the website content carefully to understand what they sell/offer
- Questions should help segment visitors into buyer personas or match them with the right product/service
- Each question should feel valuable to the quiz taker — like they're getting a personalized recommendation
- Use professional, engaging language that matches the business's tone
- The quiz title should be compelling and benefit-driven (e.g. "Which [product] is perfect for you?" or "What's your [industry] strategy style?")
- Results should provide genuine value with actionable insights specific to this business
- Always respond with ONLY valid JSON. No markdown. No explanation.`;

  const userPrompt = `Create a high-converting quiz funnel for this business:

WEBSITE: ${websiteUrl}
BUSINESS NAME: ${siteName}

WEBSITE CONTENT (read this carefully to understand what the business does):
${businessSummary || `(Could not scrape content — infer from URL: ${websiteUrl})`}

QUIZ TYPE: ${quizType}
BUSINESS GOAL: ${goal}

Generate a quiz with 4-5 questions and 3 outcome profiles. The quiz should help visitors discover which product/service/approach is right for them based on their needs.

Return ONLY this JSON structure:
{
  "title": "Compelling quiz title that speaks to the visitor's needs",
  "description": "One line explaining what they'll discover",
  "questions": [
    {
      "id": "q1",
      "type": "single",
      "question": "Question that reveals visitor's situation or need",
      "subtitle": "Optional helpful context",
      "options": [
        { "id": "a", "text": "Option text (specific to this business)", "score": 3 },
        { "id": "b", "text": "Option text", "score": 2 },
        { "id": "c", "text": "Option text", "score": 1 },
        { "id": "d", "text": "Option text", "score": 0 }
      ]
    }
  ],
  "results": [
    {
      "id": "r1",
      "title": "Result persona/recommendation name",
      "description": "2-3 sentences of personalized insight + what they should do next. Reference specific products/services from the business.",
      "minScore": 10,
      "maxScore": 15,
      "ctaText": "Get Started",
      "ctaUrl": ""
    },
    {
      "id": "r2",
      "title": "Second result type",
      "description": "Different recommendation for medium scorers",
      "minScore": 5,
      "maxScore": 9,
      "ctaText": "Learn More",
      "ctaUrl": ""
    },
    {
      "id": "r3",
      "title": "Third result type",
      "description": "Recommendation for lower scorers — still positive and helpful",
      "minScore": 0,
      "maxScore": 4,
      "ctaText": "Explore Options",
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
    return JSON.parse(extractJSON(raw));
  } catch {
    console.error('Parse failed, raw:', raw.substring(0, 300));
    throw new Error('Failed to generate quiz. Please try again.');
  }
}

export const generateQuizWithClaude = callClaude;
export const generateQuiz = callClaude;
export const generateQuizContent = callClaude;
export default callClaude;
