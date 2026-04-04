import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Robustly extract JSON from Claude's response — handles markdown fences and extra text
function extractJSON(text: string): string {
  // Strip ```json ... ``` or ``` ... ```
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Find first JSON object or array
  const start = text.search(/[\[{]/);
  if (start !== -1) {
    const chunk = text.slice(start);
    // Find the matching closing bracket
    const endObj = chunk.lastIndexOf('}');
    const endArr = chunk.lastIndexOf(']');
    const end = Math.max(endObj, endArr);
    if (end !== -1) return chunk.slice(0, end + 1).trim();
    return chunk.trim();
  }
  return text.trim();
}

const SYSTEM_PROMPT = `You are a quiz funnel expert for Squarespace businesses.
You generate high-converting quiz funnels that capture qualified leads.
CRITICAL: Respond with ONLY a valid JSON object. 
No markdown formatting. No code fences. No explanation text.
Start your response with { and end with }.`;

function buildPrompt(websiteUrl: string, quizType: string, goal: string, brandData?: any): string {
  return `Create a quiz funnel for this Squarespace business.

Website: ${websiteUrl}
Quiz type: ${quizType}  
Business goal: ${goal}
Brand data: ${brandData ? JSON.stringify(brandData, null, 2) : 'Not provided'}

Return ONLY this exact JSON structure with no additional text:
{
  "title": "Engaging quiz title",
  "description": "One sentence description",
  "questions": [
    {
      "id": "q1",
      "type": "single",
      "question": "Question text here?",
      "subtitle": "",
      "options": [
        { "id": "a", "text": "Option A text", "score": 3 },
        { "id": "b", "text": "Option B text", "score": 2 },
        { "id": "c", "text": "Option C text", "score": 1 }
      ]
    },
    {
      "id": "q2",
      "type": "single",
      "question": "Second question?",
      "subtitle": "",
      "options": [
        { "id": "a", "text": "Option A", "score": 3 },
        { "id": "b", "text": "Option B", "score": 2 },
        { "id": "c", "text": "Option C", "score": 1 }
      ]
    }
  ],
  "results": [
    {
      "id": "r1",
      "title": "High-potential result title",
      "description": "Personalised result description for high scorers",
      "minScore": 6,
      "maxScore": 100,
      "ctaText": "Book a free call",
      "ctaUrl": ""
    },
    {
      "id": "r2",
      "title": "Growth-stage result title",
      "description": "Personalised result description for mid scorers",
      "minScore": 0,
      "maxScore": 5,
      "ctaText": "Get started",
      "ctaUrl": ""
    }
  ],
  "leadGate": {
    "headline": "Your results are ready!",
    "subtext": "Enter your email to unlock your personalised action plan",
    "buttonText": "Show my results"
  },
  "settings": {
    "primaryColor": "${brandData?.colors?.[0] || '#000000'}",
    "showProgressBar": true,
    "requireEmail": true,
    "estimatedTime": "2 minutes"
  }
}`;
}

async function callClaude(websiteUrl: string, quizType: string, goal: string, brandData?: any): Promise<any> {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildPrompt(websiteUrl, quizType, goal, brandData) }]
  });

  const rawText = message.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');

  const cleanJSON = extractJSON(rawText);

  try {
    return JSON.parse(cleanJSON);
  } catch (err) {
    console.error('JSON parse failed. Raw length:', rawText.length, 'First 300 chars:', rawText.substring(0, 300));
    throw new Error('Failed to generate quiz. Please try again.');
  }
}

// Export all function name variants so any route file works
export const generateQuizWithClaude = callClaude;
export const generateQuiz = callClaude;
export const generateQuizContent = callClaude;
export default callClaude;
