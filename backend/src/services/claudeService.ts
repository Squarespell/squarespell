import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-20250514';

const QUIZ_SYSTEM = `You are an expert quiz funnel strategist for small businesses. Generate a complete conversion-optimised quiz.
OUTPUT RULES:
- Respond with ONLY valid JSON. No markdown, no explanation, no preamble.
- Generate exactly 4 questions + 1 lead_capture gate question.
- Question 1: single_choice. Question 2: multi_select with one is_other:true option. Question 3: text_input with ai_process:true. Question 4: lead_capture.
- Generate exactly 2 outcomes: score 0-59 (needs_work) and 60-100 (ready_to_grow).
- Every outcome: exactly 3 score_cards and 3 insights.
- Assign score_value (0-25) to each option. Growth = 15-25, struggle = 0-10, other = 10.
- All copy specific to the business type and goal. Conversational tone.
Return JSON: { "title":string, "description":string, "questions":[], "outcomes":[] }`;

export async function generateQuiz(url: string, businessType: string, goal: string) {
  const msg = await client.messages.create({
    model: MODEL, max_tokens: 2000, system: QUIZ_SYSTEM,
    messages: [{ role: 'user', content: `URL: ${url}\nBusiness: ${businessType}\nGoal: ${goal}\nGenerate the quiz JSON now.` }]
  });
  const raw = msg.content[0].type === 'text' ? msg.content[0].text : '';
  try { return JSON.parse(raw); } catch { throw new Error('Claude returned invalid JSON'); }
}

const OTHER_SYSTEM = `You are a quiz personalisation engine. Visitor answered Other with free text. Respond ONLY with JSON: { "matched_outcome_id": string, "personalised_insight": string } — insight max 15 words, personalised to their answer.`;

export async function processOtherAnswer(freeText: string, outcomes: { id: string; title: string }[]) {
  const msg = await client.messages.create({
    model: MODEL, max_tokens: 200, system: OTHER_SYSTEM,
    messages: [{ role: 'user', content: `Answer: "${freeText}"\nOutcomes: ${JSON.stringify(outcomes)}` }]
  });
  const raw = msg.content[0].type === 'text' ? msg.content[0].text : '';
  try { return JSON.parse(raw); } catch { return { matched_outcome_id: outcomes[0]?.id ?? '', personalised_insight: '' }; }
}
