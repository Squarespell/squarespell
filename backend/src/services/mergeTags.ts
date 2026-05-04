// Backend merge-tag resolution. At send time we replace {{outcome_name}},
// {{answer:slug}}, {{quiz_name}}, {{first_name}}, etc. with real lead data so
// recipients see personalized content instead of raw tag placeholders.

import { supabase } from '../db/supabaseClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MergeContext {
  first_name: string;
  last_name: string;
  email: string;
  quiz_name: string;
  quiz_url: string;
  outcome_name: string;
  outcome_description: string;
  outcome_score: string;
  brand_name: string;
  cta_url: string;
  // Answer map keyed by question id -> human-readable answer text
  answers: Record<string, string>;
  // Extra keys the caller can inject (e.g. footer fields)
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Tag resolution (mirrors frontend applyMergeTags exactly)
// ---------------------------------------------------------------------------

// camelCase → snake_case alias map so templates written with either
// convention resolve correctly (e.g. {{firstName}} → first_name).
var CAMEL_ALIASES: Record<string, string> = {
  firstName: 'first_name',
  lastName: 'last_name',
  quizName: 'quiz_name',
  quizTitle: 'quiz_name',
  quizUrl: 'quiz_url',
  outcomeName: 'outcome_name',
  outcomeTitle: 'outcome_name',
  outcomeDescription: 'outcome_description',
  outcomeScore: 'outcome_score',
  brandName: 'brand_name',
  brand: 'brand_name',
  ctaUrl: 'cta_url',
};

function resolveTag(tag: string, ctx: MergeContext): string {
  const trimmed = tag.trim();
  if (trimmed.startsWith('answer:')) {
    const slug = trimmed.slice('answer:'.length);
    const v = ctx.answers && ctx.answers[slug];
    return v == null ? '' : String(v);
  }
  // Try direct key first, then camelCase alias
  const key = CAMEL_ALIASES[trimmed] || trimmed;
  const v = (ctx as Record<string, unknown>)[key];
  return v == null ? '' : String(v);
}

export function applyMergeTags(input: string, ctx: MergeContext): string {
  if (!input) return '';
  return input.replace(/\{\{([^}]+)\}\}/g, (_m: string, tag: string) => {
    return resolveTag(tag, ctx);
  });
}

// ---------------------------------------------------------------------------
// Context builder - fetches lead + quiz data and returns a MergeContext
// ---------------------------------------------------------------------------

interface Question {
  id: string;
  question: string;
  options?: { id: string; text: string; score?: number }[];
  [key: string]: unknown;
}

interface Outcome {
  id: string;
  title: string;
  description?: string;
  ctaUrl?: string;
  ctaText?: string;
  [key: string]: unknown;
}

/**
 * Build a MergeContext for a specific lead. Fetches lead row + quiz row from
 * Supabase so the caller doesn't have to assemble everything manually.
 */
export async function buildMergeContext(leadId: string): Promise<MergeContext | null> {
  const { data: lead } = await supabase
    .from('leads')
    .select('id, email, name, answers, outcome_id, score, quiz_id')
    .eq('id', leadId)
    .single();

  if (!lead) return null;

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('title, slug, questions, outcomes, branding')
    .eq('id', lead.quiz_id)
    .single();

  const quizTitle = quiz?.title || '';
  const questions = (quiz?.questions || []) as Question[];
  const outcomes = (quiz?.outcomes || []) as Outcome[];
  const branding = (quiz?.branding || {}) as Record<string, any>;

  // Resolve outcome
  const matchedOutcome = lead.outcome_id
    ? outcomes.find((o) => o.id === lead.outcome_id)
    : undefined;

  // Build answer map: question.id -> selected option text
  // Answers in DB are index-based: {"0": 0, "1": 2, ...}
  // Keys = question index, values = option index
  const rawAnswers = (lead.answers || {}) as Record<string, number>;
  const answerMap: Record<string, string> = {};
  for (const [qIdx, optIdx] of Object.entries(rawAnswers)) {
    const qi = parseInt(qIdx, 10);
    const question = questions[qi];
    if (!question) continue;
    const key = question.id || `q${qi}`;
    const options = question.options || [];
    const oi = typeof optIdx === 'number' ? optIdx : parseInt(String(optIdx), 10);
    const option = options[oi];
    answerMap[key] = option ? option.text : String(optIdx);
  }

  // Parse first/last name from the lead's name field
  const nameParts = (lead.name || '').trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

  const appBase = process.env.FRONTEND_URL || 'https://app.squarespell.com';
  const quizSlug = quiz?.slug || lead.quiz_id;

  return {
    first_name: firstName,
    last_name: lastName,
    email: lead.email || '',
    quiz_name: quizTitle,
    quiz_url: `${appBase}/q/${quizSlug}`,
    outcome_name: matchedOutcome?.title || '',
    outcome_description: matchedOutcome?.description || '',
    outcome_score: lead.score != null ? String(lead.score) : '',
    brand_name: branding.site_name || 'Squarespell',
    cta_url: matchedOutcome?.ctaUrl || '',
    answers: answerMap,
  };
}

/**
 * Lightweight context builder when you already have the lead + quiz data in
 * hand (avoids extra DB round-trips in hot paths like campaign blasts).
 */
export function buildMergeContextFromData(
  lead: {
    email: string;
    name?: string | null;
    answers?: Record<string, number> | null;
    outcome_id?: string | null;
    score?: number | null;
  },
  quiz: {
    title?: string | null;
    slug?: string | null;
    questions?: Question[] | null;
    outcomes?: Outcome[] | null;
    branding?: Record<string, any> | null;
  },
): MergeContext {
  const questions = quiz.questions || [];
  const outcomes = quiz.outcomes || [];
  const branding = quiz.branding || {};

  const matchedOutcome = lead.outcome_id
    ? outcomes.find((o) => o.id === lead.outcome_id)
    : undefined;

  const rawAnswers = (lead.answers || {}) as Record<string, number>;
  const answerMap: Record<string, string> = {};
  for (const [qIdx, optIdx] of Object.entries(rawAnswers)) {
    const qi = parseInt(qIdx, 10);
    const question = questions[qi];
    if (!question) continue;
    const key = question.id || `q${qi}`;
    const options = question.options || [];
    const oi = typeof optIdx === 'number' ? optIdx : parseInt(String(optIdx), 10);
    const option = options[oi];
    answerMap[key] = option ? option.text : String(optIdx);
  }

  const nameParts = (lead.name || '').trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

  const appBase = process.env.FRONTEND_URL || 'https://app.squarespell.com';

  return {
    first_name: firstName,
    last_name: lastName,
    email: lead.email || '',
    quiz_name: quiz.title || '',
    quiz_url: `${appBase}/q/${quiz.slug || ''}`,
    outcome_name: matchedOutcome?.title || '',
    outcome_description: matchedOutcome?.description || '',
    outcome_score: lead.score != null ? String(lead.score) : '',
    brand_name: branding.site_name || 'Squarespell',
    cta_url: matchedOutcome?.ctaUrl || '',
    answers: answerMap,
  };
}
