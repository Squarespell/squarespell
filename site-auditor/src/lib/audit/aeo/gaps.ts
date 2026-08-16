/**
 * Which of those questions the site actually answers.
 *
 * Three outcomes per question, and the middle one is the interesting one:
 *
 *   answered  the topic is covered and the page carries the shape of evidence a
 *             real answer needs (a price for a cost question, a duration for a
 *             timing question)
 *   partial   the topic is covered but the answer is not there. This is the
 *             "we have a pricing page that never mentions a number" case, and
 *             it is the single most common reason an AI assistant will describe
 *             a competitor instead of you
 *   missing   nothing on the site addresses it
 *
 * Reported as opportunities rather than faults. A business is allowed to decide
 * not to publish prices; it should just know what that costs.
 */

import type { PageFacts } from '../extract';
import { Bm25, hasAnswerSignal } from './text';
import type { CandidateQuestion } from './questions';
import type { SiteProfile } from './profile';

export interface QuestionGap {
  question: string;
  kind: CandidateQuestion['kind'];
  source: CandidateQuestion['source'];
  weight: number;
  status: 'answered' | 'partial' | 'missing';
  /** Best-matching page, when the topic is covered at all. */
  pageUrl?: string;
  /** 0..1, how much of the question's vocabulary the best page covers. */
  coverage: number;
}

export interface FaqAnalysis {
  profile: SiteProfile;
  gaps: QuestionGap[];
  answered: QuestionGap[];
  partial: QuestionGap[];
  missing: QuestionGap[];
  /** Highest-value unanswered questions, ordered. */
  opportunities: QuestionGap[];
  /** Question-shaped headings already on the site. */
  existingQuestionHeadings: number;
  hasFaqSchema: boolean;
  /** True when there was enough signal to run this analysis at all. */
  ran: boolean;
}

/** Above this, the site clearly talks about the subject of the question. */
const TOPIC_THRESHOLD = 0.5;

/**
 * A lower bar that applies only when the page contains the question's most
 * distinctive word. Without any floor, "how do I track my order" matched a blog
 * post about booking wedding florals on the strength of one shared word, and
 * the report pointed the reader at a page that had nothing to do with it.
 */
const SUBJECT_THRESHOLD = 0.45;

export function analyseQuestions(
  profile: SiteProfile,
  questions: CandidateQuestion[],
  pages: PageFacts[]
): FaqAnalysis {
  const existingQuestionHeadings = pages.reduce(
    (n, p) =>
      n +
      p.headings.filter(
        (h) =>
          h.level >= 2 &&
          h.level <= 4 &&
          (h.text.trim().endsWith('?') ||
            /^(how|what|why|when|where|who|which|can|do|does|is|are|should|will)\b/i.test(h.text))
      ).length,
    0
  );
  const hasFaqSchema = pages.some((p) => p.schemaTypes.some((t) => /FAQPage|QAPage/i.test(t)));

  if (!profile.confident || !questions.length || !pages.length) {
    return {
      profile,
      gaps: [],
      answered: [],
      partial: [],
      missing: [],
      opportunities: [],
      existingQuestionHeadings,
      hasFaqSchema,
      ran: false,
    };
  }

  // Title and headings are repeated so they weigh more than body text. BM25 on
  // its own favours short documents, which meant a brief testimonials page
  // mentioning a treatment in passing outranked the page actually about that
  // treatment. What a page is called is the strongest statement of what it is
  // about, so it counts more than the same words buried in prose.
  const index = new Bm25(
    pages.map((p) => {
      const title = p.title || '';
      const headings = p.headings.map((h) => h.text).join(' ');
      // The URL slug counts too. On sites where Squarespace has fallen back to
      // the site name for every title and the page has no H1, the slug is the
      // only place the page says what it is about, and /dermaplaning is a
      // clearer statement of subject than a paragraph mentioning the word.
      const slug = (() => {
        try {
          return decodeURIComponent(new URL(p.url).pathname).replace(/[/_-]+/g, ' ').trim();
        } catch {
          return '';
        }
      })();
      return {
        id: p.url,
        text: `${title} ${title} ${slug} ${slug} ${slug} ${headings} ${headings} ${p.mainText}`,
      };
    })
  );
  const byUrl = new Map(pages.map((p) => [p.url, p]));

  const gaps: QuestionGap[] = [];
  for (const q of questions) {
    const best = index.best(q.text);
    const coverage = best ? Math.min(1, best.score) : 0;
    let status: QuestionGap['status'] = 'missing';
    let pageUrl: string | undefined;

    // Covered either because the page matches most of the question, or because
    // it is plainly the page about the thing being asked about.
    if (
      best &&
      (coverage >= TOPIC_THRESHOLD ||
        (best.matchedSubject && coverage >= SUBJECT_THRESHOLD))
    ) {
      // The verdict uses the best whole-question match; the page we cite is the
      // one the reader would expect, which is the page about the subject.
      pageUrl = best.subjectPage || best.id;
      const page = byUrl.get(best.id);
      // Link text and targets count as page content here: "Book an appointment"
      // is usually a button, not a sentence, and a question about booking is
      // answered by the button existing.
      const haystack = page
        ? `${page.title} ${page.mainText} ${page.links.map((l) => `${l.text} ${l.href}`).join(' ')}`
        : '';
      status = hasAnswerSignal(q.kind, haystack) ? 'answered' : 'partial';
    }

    gaps.push({
      question: q.text,
      kind: q.kind,
      source: q.source,
      weight: q.weight,
      status,
      pageUrl,
      coverage: Math.round(coverage * 100) / 100,
    });
  }

  const answered = gaps.filter((g) => g.status === 'answered');
  const partial = gaps.filter((g) => g.status === 'partial');
  const missing = gaps.filter((g) => g.status === 'missing');

  // Order by commercial weight, then by how close the site already is, so the
  // list opens with the questions that matter and are cheapest to close.
  const opportunities = [...partial, ...missing]
    .sort((a, b) => b.weight - a.weight || b.coverage - a.coverage)
    .slice(0, 10);

  return {
    profile,
    gaps,
    answered,
    partial,
    missing,
    opportunities,
    existingQuestionHeadings,
    hasFaqSchema,
    ran: true,
  };
}
