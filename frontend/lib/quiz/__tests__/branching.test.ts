/** The browser runner's branching: forward-only jumps, so no path can loop; invalid rules are ignored. */
import { describe, it, expect } from 'vitest';
import { hasBranching, nextQuestionIndex, resolveVisitedPath } from '../branching';

const opts = () => [
  { id: 'a', text: 'A', score: 0 },
  { id: 'b', text: 'B', score: 1 },
  { id: 'c', text: 'C', score: 2 },
];
const quiz = (): any[] => [
  { id: 'q1', options: opts(), next_question_rules: [{ if_answer: 'c', goto: 'q3' }] },
  { id: 'q2', options: opts() },
  { id: 'q3', options: opts() },
];

describe('nextQuestionIndex', () => {
  it('follows a matching rule forward and otherwise moves on in order', () => {
    expect(nextQuestionIndex(quiz(), 0, 'c')).toBe(2);
    expect(nextQuestionIndex(quiz(), 0, 'a')).toBe(1);
    expect(nextQuestionIndex(quiz(), 1, 'a')).toBe(2);
    expect(nextQuestionIndex(quiz(), 0, '')).toBe(1);
  });

  it('ignores a rule that points at an unknown question, at itself, or at an earlier question (no cycles)', () => {
    const qs = quiz();
    qs[0].next_question_rules = [{ if_answer: 'c', goto: 'nope' }];
    expect(nextQuestionIndex(qs, 0, 'c')).toBe(1);
    qs[1].next_question_rules = [{ if_answer: 'a', goto: 'q1' }, { if_answer: 'b', goto: 'q2' }];
    expect(nextQuestionIndex(qs, 1, 'a')).toBe(2);
    expect(nextQuestionIndex(qs, 1, 'b')).toBe(2);
  });
});

describe('resolveVisitedPath', () => {
  it('scores only what the visitor could have seen: a jump skips the questions in between', () => {
    expect(hasBranching(quiz())).toBe(true);
    expect(resolveVisitedPath(quiz(), { 0: 2, 1: 2, 2: 1 })).toEqual([0, 2]);
    expect(resolveVisitedPath(quiz(), { 0: 0 })).toEqual([0, 1, 2]);
    expect(resolveVisitedPath(quiz(), {})).toEqual([0, 1, 2]);
  });

  it('always terminates, even when every rule points backwards', () => {
    const qs = quiz();
    qs[1].next_question_rules = [{ if_answer: 'a', goto: 'q1' }];
    qs[2].next_question_rules = [{ if_answer: 'a', goto: 'q3' }];
    expect(resolveVisitedPath(qs, { 0: 0, 1: 0, 2: 0 })).toEqual([0, 1, 2]);
  });
});
