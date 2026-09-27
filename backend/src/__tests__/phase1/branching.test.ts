/**
 * Phase 1 - branching (next_question_rules) and skip logic (show_conditions), and scoring through branched paths.
 * The browser runner and the server share one rule: jumps only go forward, so a path cannot loop.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { api, makeUser, makeQuiz, nextIp } from '../helpers/testkit';
import { resetData, sql } from '../helpers/db';
import { hasBranching, resolveVisitedPath } from '../../services/branching';
import { shouldShowQuestion, buildQuestionSequence, validateShowConditions } from '../../services/skipLogic';

beforeEach(resetData);

const opts = () => [
  { id: 'a', text: 'A', score: 0 },
  { id: 'b', text: 'B', score: 1 },
  { id: 'c', text: 'C', score: 2 },
];
const branched = (): any[] => [
  { id: 'q1', text: 'Q1', type: 'single', options: opts(), next_question_rules: [{ if_answer: 'c', goto: 'q3' }] },
  { id: 'q2', text: 'Q2', type: 'single', options: opts() },
  { id: 'q3', text: 'Q3', type: 'single', options: opts() },
];
const outcomes = [
  { id: 'low', title: 'Low', description: 'low', minScore: 0, maxScore: 1 },
  { id: 'mid', title: 'Mid', description: 'mid', minScore: 2, maxScore: 3 },
  { id: 'high', title: 'High', description: 'high', minScore: 4, maxScore: 6 },
];

describe('branching path', () => {
  it('a quiz without rules is not branching and runs in order', () => {
    const plain = branched().map(({ next_question_rules, ...q }) => q);
    expect(hasBranching(plain)).toBe(false);
    expect(hasBranching(branched())).toBe(true);
    expect(resolveVisitedPath(plain, {})).toEqual([0, 1, 2]);
  });

  it('a matching rule skips the questions in between (answers by option index or by option id)', () => {
    expect(resolveVisitedPath(branched(), { 0: 2 })).toEqual([0, 2]);
    expect(resolveVisitedPath(branched(), { q1: 'c' })).toEqual([0, 2]);
    expect(resolveVisitedPath(branched(), { 0: 0 })).toEqual([0, 1, 2]);
  });

  it('an unanswered rule question, or an answer no rule mentions, continues in order', () => {
    expect(resolveVisitedPath(branched(), {})).toEqual([0, 1, 2]);
    expect(resolveVisitedPath(branched(), { 0: 1 })).toEqual([0, 1, 2]);
  });

  it('the first matching rule wins and rules are evaluated per question', () => {
    const qs = branched();
    qs[0].next_question_rules = [{ if_answer: 'c', goto: 'q3' }, { if_answer: 'c', goto: 'q2' }];
    expect(resolveVisitedPath(qs, { 0: 2 })).toEqual([0, 2]);
  });

  it('an invalid reference (unknown question id) is ignored', () => {
    const qs = branched();
    qs[0].next_question_rules = [{ if_answer: 'c', goto: 'does-not-exist' }];
    expect(resolveVisitedPath(qs, { 0: 2 })).toEqual([0, 1, 2]);
  });

  it('cycle prevention: a rule that jumps to itself or to an earlier question is ignored, so every path ends', () => {
    const qs = branched();
    qs[1].next_question_rules = [{ if_answer: 'a', goto: 'q1' }];
    qs[2].next_question_rules = [{ if_answer: 'a', goto: 'q3' }];
    const path = resolveVisitedPath(qs, { 0: 0, 1: 0, 2: 0 });
    expect(path).toEqual([0, 1, 2]);
    expect(new Set(path).size).toBe(path.length);
  });
});

describe('skip logic (show_conditions): AND semantics and earlier-question references', () => {
  const conds: any[] = [
    { question_index: 0, op: 'eq', value: 1 },
    { question_index: 1, op: 'any_of', value: [0, 2] },
  ];

  it('every condition must match', () => {
    expect(shouldShowQuestion(conds, { 0: 1, 1: 2 })).toBe(true);
    expect(shouldShowQuestion(conds, { 0: 1, 1: 1 })).toBe(false);
    expect(shouldShowQuestion(conds, { 0: 0, 1: 0 })).toBe(false);
    expect(shouldShowQuestion(conds, { 0: 1 })).toBe(false);
  });

  it('no conditions always shows; answered / not_answered / neq / gt / lt behave', () => {
    expect(shouldShowQuestion(undefined, {})).toBe(true);
    expect(shouldShowQuestion([], {})).toBe(true);
    expect(shouldShowQuestion([{ question_index: 0, op: 'answered' }] as any, { 0: 0 })).toBe(true);
    expect(shouldShowQuestion([{ question_index: 0, op: 'answered' }] as any, {})).toBe(false);
    expect(shouldShowQuestion([{ question_index: 0, op: 'not_answered' }] as any, {})).toBe(true);
    expect(shouldShowQuestion([{ question_index: 0, op: 'neq', value: 1 }] as any, {})).toBe(true);
    expect(shouldShowQuestion([{ question_index: 0, op: 'gt', value: 1 }] as any, { 0: 2 })).toBe(true);
    expect(shouldShowQuestion([{ question_index: 0, op: 'lt', value: 1 }] as any, { 0: 2 })).toBe(false);
  });

  it('buildQuestionSequence keeps only the questions whose conditions hold', () => {
    const qs = [{ text: 'a' }, { text: 'b', show_conditions: [{ question_index: 0, op: 'eq', value: 1 }] }, { text: 'c' }];
    expect(buildQuestionSequence(qs, { 0: 1 }).map((x) => x.index)).toEqual([0, 1, 2]);
    expect(buildQuestionSequence(qs, { 0: 0 }).map((x) => x.index)).toEqual([0, 2]);
  });

  it('validation only accepts references to EARLIER questions that exist (which also rules out cycles)', () => {
    expect(validateShowConditions(2, [{ question_index: 0, op: 'eq', value: 1 }] as any, 3).valid).toBe(true);
    const forward = validateShowConditions(1, [{ question_index: 2, op: 'eq', value: 1 }] as any, 3);
    expect(forward.valid).toBe(false);
    const self = validateShowConditions(1, [{ question_index: 1, op: 'eq', value: 1 }] as any, 3);
    expect(self.valid).toBe(false);
    const missing = validateShowConditions(1, [{ question_index: 9, op: 'eq', value: 1 }] as any, 3);
    expect(missing.valid).toBe(false);
    expect(missing.errors.join(' ')).toMatch(/out of range/);
  });
});

describe('scoring and outcomes through a branched path (server is the source of truth)', () => {
  async function submit(quiz: any, answers: Record<string, number>, email: string) {
    const r = await (await api()).post('/api/quiz/' + quiz.slug + '/lead').set('X-Forwarded-For', nextIp()).send({ name: 'Ada Lovelace', email, answers });
    expect(r.status).toBe(201);
    return (await sql<any>('select score, outcome_id from leads where id=$1', [r.body.lead_id]))[0];
  }

  it('answers left over from a skipped question do not count: only the visited path is scored', async () => {
    const owner = await makeUser({ plan: 'pro' });
    const quiz = await makeQuiz(owner, { slug: 'branch-' + Math.random().toString(36).slice(2, 7), questions: branched(), outcomes });
    // Q1=C jumps to Q3, so Q2 was never on the path: its stale answer (C = 2) must be ignored. 2 + 1 = 3 -> mid.
    const row = await submit(quiz, { 0: 2, 1: 2, 2: 1 }, 'branch1@customer.example');
    expect(row.score).toBe(3);
    expect(row.outcome_id).toBe('mid');
  });

  it('the long path scores every visited question and can reach a different outcome', async () => {
    const owner = await makeUser({ plan: 'pro' });
    const quiz = await makeQuiz(owner, { slug: 'branch-' + Math.random().toString(36).slice(2, 7), questions: branched(), outcomes });
    const row = await submit(quiz, { 0: 0, 1: 2, 2: 2 }, 'branch2@customer.example');
    expect(row.score).toBe(4);
    expect(row.outcome_id).toBe('high');
  });

  it('a forged answer for a question the visitor could not reach cannot raise the score', async () => {
    const owner = await makeUser({ plan: 'pro' });
    const quiz = await makeQuiz(owner, { slug: 'branch-' + Math.random().toString(36).slice(2, 7), questions: branched(), outcomes });
    const row = await submit(quiz, { 0: 2, 1: 2, 2: 0 }, 'branch3@customer.example');
    expect(row.score).toBe(2);
    expect(row.outcome_id).toBe('mid');
  });
});
