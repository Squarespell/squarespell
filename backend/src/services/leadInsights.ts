import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export interface AnswerSummary {
  question: string;
  answer: string;
}

/**
 * Generate AI-powered insight summary for a lead based on their quiz answers.
 * Uses Claude Haiku for fast, cost-effective generation.
 * Non-blocking operation - should be called in the background after lead creation.
 *
 * @param quizTitle - Title of the quiz taken
 * @param quizMode - The quiz mode (lead_quiz, price_calculator, etc.)
 * @param answers - Array of question-answer pairs
 * @param outcome - The outcome/result the lead matched
 * @param score - Optional numeric score
 * @returns Summary string (2-3 sentences about needs and buying readiness)
 */
export async function generateLeadInsight(
  quizTitle: string,
  quizMode: string,
  answers: AnswerSummary[],
  outcome: string,
  score?: number
): Promise<string> {
  try {
    // Build the answer summary for the prompt
    const answersSummary = answers
      .map((a) => `Q: ${a.question}\nA: ${a.answer}`)
      .join('\n\n');

    const prompt = `You are analyzing quiz responses to provide brief, actionable insights about a lead's needs and sales readiness.

Quiz: "${quizTitle}" (${quizMode} mode)

Answers:
${answersSummary}

Result/Outcome: ${outcome}
${score !== undefined ? `Score: ${score}` : ''}

Based on these responses, write 2-3 concise sentences summarizing:
1. What specific needs or pain points this person likely has
2. Their apparent readiness to buy/take action (low, moderate, or high)

Keep it practical and direct. No preamble or explanation text.`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract text from response
    const textContent = response.content.find((block) => block.type === 'text');
    if (textContent && textContent.type === 'text') {
      return textContent.text.trim();
    }

    return '';
  } catch (error) {
    console.error('[LeadInsights] Generation failed:', error);
    // Return empty string on error - don't break lead creation
    return '';
  }
}
