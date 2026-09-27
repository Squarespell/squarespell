/**
 * Quiz branching (next_question_rules). A rule on a question says: if the visitor picked option <if_answer>, jump to
 * question <goto>. Jumps only ever go FORWARD, so a path can never loop, and a rule that points at an unknown or
 * earlier question is ignored. The browser (frontend/lib/quiz/branching.ts) uses the same algorithm; the server uses
 * it to score only the questions the visitor could actually have seen, so answers left over from a path the visitor
 * backed out of never count toward the score or the outcome.
 */

export interface BranchRule {
  if_answer: string;
  goto: string;
}

export function hasBranching(questions: any[]): boolean {
  return Array.isArray(questions) && questions.some((q) => Array.isArray(q?.next_question_rules) && q.next_question_rules.length > 0);
}

/** The id of the option picked for a question. Answers are option indexes (the live wire format) or option ids. */
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

/** Indexes of the questions on the path the answers describe, in order, starting at question 0. */
export function resolveVisitedPath(questions: any[], answers: Record<string, any> | undefined): number[] {
  const list = Array.isArray(questions) ? questions : [];
  const idToIndex = new Map<string, number>();
  list.forEach((q, i) => {
    if (q && q.id !== undefined) idToIndex.set(String(q.id), i);
  });

  const visited: number[] = [];
  let i = 0;
  while (i >= 0 && i < list.length && visited.length <= list.length) {
    visited.push(i);
    const q = list[i];
    const answer = answers ? (answers[i] !== undefined ? answers[i] : q && q.id !== undefined ? answers[String(q.id)] : undefined) : undefined;
    let next = i + 1;
    const rules: BranchRule[] = Array.isArray(q?.next_question_rules) ? q.next_question_rules : [];
    const chosen = rules.length ? chosenOptionId(q, answer) : null;
    if (chosen !== null) {
      const rule = rules.find((r) => r && String(r.if_answer) === chosen);
      const target = rule ? idToIndex.get(String(rule.goto)) : undefined;
      if (target !== undefined && target > i) next = target;
    }
    i = next;
  }
  return visited;
}
