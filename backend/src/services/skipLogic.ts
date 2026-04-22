/**
 * skipLogic.ts — Simplified skip/show logic for quiz questions.
 *
 * Instead of complex goto-based branching, this provides a declarative
 * "show this question only if..." system.
 *
 * Each question can have a `show_conditions` array:
 * [
 *   { question_index: 2, op: 'eq', value: 1 },          // show if Q2 answer == option 1
 *   { question_index: 0, op: 'neq', value: 3 },         // show if Q0 answer != option 3
 *   { question_index: 1, op: 'any_of', value: [0, 2] }, // show if Q1 answer is 0 or 2
 * ]
 *
 * Logic: ALL conditions must match (AND). Empty = always show.
 */

// ── Types ────────────────────────────────────────────────────────────────────

interface ShowCondition {
  question_index: number;
  op: 'eq' | 'neq' | 'any_of' | 'none_of' | 'gt' | 'lt' | 'answered' | 'not_answered';
  value?: any;
}

// ── Evaluation ───────────────────────────────────────────────────────────────

/**
 * Evaluate whether a question should be shown based on current answers.
 */
export function shouldShowQuestion(
  conditions: ShowCondition[] | undefined,
  currentAnswers: Record<string, any>
): boolean {
  if (!conditions || conditions.length === 0) return true;

  return conditions.every(function(cond) {
    var answer = currentAnswers[String(cond.question_index)];
    var hasAnswer = answer !== undefined && answer !== null;

    switch (cond.op) {
      case 'eq':
        return hasAnswer && String(answer) === String(cond.value);
      case 'neq':
        return !hasAnswer || String(answer) !== String(cond.value);
      case 'any_of':
        if (!hasAnswer || !Array.isArray(cond.value)) return false;
        return cond.value.map(String).includes(String(answer));
      case 'none_of':
        if (!hasAnswer || !Array.isArray(cond.value)) return true;
        return !cond.value.map(String).includes(String(answer));
      case 'gt':
        return hasAnswer && Number(answer) > Number(cond.value);
      case 'lt':
        return hasAnswer && Number(answer) < Number(cond.value);
      case 'answered':
        return hasAnswer;
      case 'not_answered':
        return !hasAnswer;
      default:
        return true;
    }
  });
}

/**
 * Build the effective question sequence for a quiz session,
 * filtering out questions whose show_conditions aren't met.
 */
export function buildQuestionSequence(
  questions: any[],
  currentAnswers: Record<string, any>
): { index: number; question: any }[] {
  var sequence: { index: number; question: any }[] = [];

  for (var i = 0; i < questions.length; i++) {
    var q = questions[i];
    var conditions = q.show_conditions as ShowCondition[] | undefined;

    if (shouldShowQuestion(conditions, currentAnswers)) {
      sequence.push({ index: i, question: q });
    }
  }

  return sequence;
}

/**
 * Validate show conditions (check for circular references, invalid indices).
 */
export function validateShowConditions(
  questionIndex: number,
  conditions: ShowCondition[],
  totalQuestions: number
): { valid: boolean; errors: string[] } {
  var errors: string[] = [];

  for (var i = 0; i < conditions.length; i++) {
    var cond = conditions[i];

    if (cond.question_index < 0 || cond.question_index >= totalQuestions) {
      errors.push('Condition ' + i + ': question_index ' + cond.question_index + ' is out of range');
    }

    if (cond.question_index >= questionIndex) {
      errors.push('Condition ' + i + ': cannot reference question ' + cond.question_index + ' (must reference earlier questions)');
    }

    var validOps = ['eq', 'neq', 'any_of', 'none_of', 'gt', 'lt', 'answered', 'not_answered'];
    if (!validOps.includes(cond.op)) {
      errors.push('Condition ' + i + ': invalid operator "' + cond.op + '"');
    }
  }

  return { valid: errors.length === 0, errors: errors };
}

export type { ShowCondition };
