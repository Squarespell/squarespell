/**
 * Quiz branching (next_question_rules) for the browser runner. Same algorithm as backend/src/services/branching.ts,
 * which the server uses to score only the questions on the visitor's path: a rule jumps FORWARD to a later question,
 * and a rule that points at an unknown or earlier question is ignored, so a path can never loop.
 */

export interface BranchRule {
  if_answer: string;
  goto: string;
}

export function hasBranching(questions: any[]): boolean {
  return Array.isArray(questions) && questions.some((q) => Array.isArray(q?.next_question_rules) && q.next_question_rules.length > 0);
}

function chosenOptionId(question: any, answer: unknown): string | null {
  const first = Array.isArray(answer) ? answer[0] : answer;
  if (first === undefined || first === null) return null;
  const options: any[] = Array.isArray(question?.options) ? question.options : [];
  const isIndex = typeof first === 'number' || (typeof first === 'string' && /^\d+$/.test(first));
  if (isIndex) {
    const opt = options[Number(first)];
    if (opt && opt.id !== undefined) return String(opt.id);
  }
  const byId = options.find((o) => o && String(o.id) === String(first));
  return byId ? String(byId.id) : null;
}

/** Index of the question to show after `currentIdx` was answered with option `selectedOptionId` (no rule: the next one in order). */
export function nextQuestionIndex(questions: any[], currentIdx: number, selectedOptionId: string): number {
  const q = questions[currentIdx];
  const rules: BranchRule[] = Array.isArray(q?.next_question_rules) ? q.next_question_rules : [];
  if (rules.length && selectedOptionId) {
    const rule = rules.find((r) => r && String(r.if_answer) === String(selectedOptionId));
    if (rule) {
      const target = questions.findIndex((x) => x && x.id !== undefined && String(x.id) === String(rule.goto));
      if (target > currentIdx) return target;
    }
  }
  return currentIdx + 1;
}

/** Indexes of the questions on the path the answers describe, in order, starting at question 0. */
export function resolveVisitedPath(questions: any[], answers: Record<string, any> | undefined): number[] {
  const list = Array.isArray(questions) ? questions : [];
  const visited: number[] = [];
  let i = 0;
  while (i >= 0 && i < list.length && visited.length <= list.length) {
    visited.push(i);
    const q = list[i];
    const answer = answers ? (answers[i] !== undefined ? answers[i] : q && q.id !== undefined ? answers[String(q.id)] : undefined) : undefined;
    const chosen = Array.isArray(q?.next_question_rules) && q.next_question_rules.length ? chosenOptionId(q, answer) : null;
    i = nextQuestionIndex(list, i, chosen === null ? '' : chosen);
  }
  return visited;
}
