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

async function callClaude(websiteUrl: string, quizType: string, goal: string, brandData?: any): Promise<any> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: 'You are a quiz funnel expert. Always respond with ONLY valid JSON. No markdown. No explanation. Start with { end with }.',
    messages: [{
      role: 'user',
      content: `Create a quiz funnel for: ${websiteUrl}\nType: ${quizType}\nGoal: ${goal}\nBrand: ${JSON.stringify(brandData || {})}

Return ONLY this JSON:
{
  "title": "Quiz title",
  "description": "Short description",
  "questions": [
    { "id": "q1", "type": "single", "question": "Question?", "subtitle": "", "options": [
      { "id": "a", "text": "Option A", "score": 3 },
      { "id": "b", "text": "Option B", "score": 2 },
      { "id": "c", "text": "Option C", "score": 1 }
    ]},
    { "id": "q2", "type": "single", "question": "Second question?", "subtitle": "", "options": [
      { "id": "a", "text": "Option A", "score": 3 },
      { "id": "b", "text": "Option B", "score": 2 },
      { "id": "c", "text": "Option C", "score": 1 }
    ]},
    { "id": "q3", "type": "single", "question": "Third question?", "subtitle": "", "options": [
      { "id": "a", "text": "Option A", "score": 3 },
      { "id": "b", "text": "Option B", "score": 2 },
      { "id": "c", "text": "Option C", "score": 1 }
    ]}
  ],
  "results": [
    { "id": "r1", "title": "Result title", "description": "Description", "minScore": 6, "maxScore": 9, "ctaText": "Get started", "ctaUrl": "" },
    { "id": "r2", "title": "Another result", "description": "Description", "minScore": 0, "maxScore": 5, "ctaText": "Learn more", "ctaUrl": "" }
  ],
  "leadGate": { "headline": "Your results are ready!", "subtext": "Enter your email to unlock your results", "buttonText": "Show my results" },
  "settings": { "primaryColor": "#000000", "showProgressBar": true, "requireEmail": true }
}`
    }]
  });

  const raw = message.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
  try {
    return JSON.parse(extractJSON(raw));
  } catch {
    console.error('Parse failed, raw:', raw.substring(0, 200));
    throw new Error('Failed to generate quiz. Please try again.');
  }
}

export const generateQuizWithClaude = callClaude;
export const generateQuiz = callClaude;
export const generateQuizContent = callClaude;
export default callClaude;
