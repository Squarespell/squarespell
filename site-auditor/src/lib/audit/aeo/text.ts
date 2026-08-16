/**
 * Text utilities for the AEO layer: tokenising, a small BM25 index, and the
 * answer-signal detectors.
 *
 * Why BM25 rather than embeddings: an embedding model would need a network
 * call per audit, a key, and a budget, and it would make the result
 * non-deterministic. BM25 over the pages we already crawled is instant, free,
 * explainable, and reproducible, which matters because every claim in this
 * report has to be defensible from the bytes we fetched.
 *
 * BM25 alone answers "does this page talk about the topic". It does not answer
 * "does this page answer the question", which is the thing that actually
 * decides whether an AI assistant can quote you. So each question also carries
 * an answer signal: a cost question needs a price on the page, a duration
 * question needs a time expression, a process question needs an ordered list or
 * step language. Topic match without answer signal is exactly the "we have a
 * page about it but never actually say" case, and it is worth reporting
 * separately from having no page at all.
 */

const STOPWORDS = new Set(
  ('a about above after again against all am an and any are as at be because been before being below between both but by ' +
    'can cannot could did do does doing down during each few for from further had has have having he her here hers herself ' +
    'him himself his how i if in into is it its itself me more most my myself no nor not of off on once only or other ought ' +
    'our ours ourselves out over own same she should so some such than that the their theirs them themselves then there ' +
    'these they this those through to too under until up very was we were what when where which while who whom why with ' +
    'would you your yours yourself yourselves will just also get got make made use used using like need needs').split(' ')
);

/** Crude but stable suffix stripping. Good enough to match "pricing"/"prices"/"price". */
export function stem(word: string): string {
  let w = word;
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 4 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ers')) w = w.slice(0, -3);
  else if (w.length > 3 && w.endsWith('es')) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  return w;
}

export function tokenise(text: string, keepStopwords = false): string[] {
  return (text.toLowerCase().match(/[a-z][a-z'-]{1,}/g) || [])
    .map((w) => w.replace(/'s$/, ''))
    .filter((w) => keepStopwords || !STOPWORDS.has(w))
    .map(stem)
    .filter((w) => w.length > 1);
}

/**
 * Words that carry the shape of a question rather than its subject. They are
 * kept in the index, because matching them is still evidence, but they are
 * never treated as what a question is about.
 */
const QUANTIFIERS = new Set(
  ['much', 'many', 'long', 'far', 'often', 'soon', 'quick', 'quickli', 'fast', 'cheap', 'expens'].map(stem)
);

export interface Doc {
  id: string;
  text: string;
}

/** Minimal BM25. k1 and b are the standard defaults; nothing here is tuned to a corpus we do not have. */
export class Bm25 {
  private readonly docs: Array<{ id: string; len: number; tf: Map<string, number> }> = [];
  private readonly df = new Map<string, number>();
  private avgLen = 0;

  constructor(docs: Doc[]) {
    for (const d of docs) {
      const terms = tokenise(d.text);
      const tf = new Map<string, number>();
      for (const t of terms) tf.set(t, (tf.get(t) || 0) + 1);
      for (const t of tf.keys()) this.df.set(t, (this.df.get(t) || 0) + 1);
      this.docs.push({ id: d.id, len: terms.length, tf });
    }
    this.avgLen = this.docs.length
      ? this.docs.reduce((a, d) => a + d.len, 0) / this.docs.length
      : 0;
  }

  get size() {
    return this.docs.length;
  }

  /**
   * Highest-scoring document for a query, with its normalised score in 0..1.
   *
   * `matchedSubject` reports whether the document contains the question's most
   * distinctive term. "How much does dermaplaning cost" against a page that
   * explains dermaplaning but never mentions a price should read as "you have a
   * page on this, it just does not answer the question", not as "nothing on
   * your site addresses this".
   */
  best(query: string): {
    id: string;
    score: number;
    matched: string[];
    matchedSubject: boolean;
    /** The question's most distinctive term. */
    subject: string;
    /** The page that is most about that term, which is not always the page
     *  that best matches the whole question. */
    subjectPage: string | null;
  } | null {
    const terms = Array.from(new Set(tokenise(query)));
    if (!terms.length || !this.docs.length) return null;
    const k1 = 1.5;
    const b = 0.75;
    const N = this.docs.length;

    let best: {
      id: string;
      score: number;
      matched: string[];
      matchedSubject: boolean;
      subject: string;
      subjectPage: string | null;
    } | null = null;
    let bestRaw = 0;

    // The ceiling counts only terms that exist somewhere in the corpus.
    //
    // Including terms the site never uses would cap every score below one and
    // make the threshold depend on question phrasing rather than on coverage:
    // "how much does X cost" scored lower than "what is X" purely because the
    // word "much" appears on very few websites. Normalising against what is
    // actually matchable makes the score mean "of the parts of this question
    // your site could answer, how much does the best page cover".
    const present = terms.filter((t) => (this.df.get(t) || 0) > 0);
    if (!present.length) return null;

    // The reference document: one occurrence of every matchable term, at the
    // average document length. Normalising against the theoretical maximum
    // instead (a term repeated infinitely often) meant a page that answered a
    // question perfectly still scored around 0.4, and the threshold became a
    // number tuned to the maths rather than to meaning.
    let ceiling = 0;
    for (const t of present) {
      const n = this.df.get(t) || 0;
      ceiling += Math.log(1 + (N - n + 0.5) / (n + 0.5));
    }
    if (ceiling <= 0) return null;

    // A single incidental word in common should not read as coverage, unless
    // that word is the subject of the question.
    const minTerms = Math.min(2, present.length);

    // The subject is the rarest *content* word. Picking the rarest word full
    // stop chose "much" in "how much does dermaplaning cost", because that word
    // appeared on exactly one page, and every cost question was then attributed
    // to whichever page happened to contain it.
    const candidates = present.filter((t) => !QUANTIFIERS.has(t));
    const pool = candidates.length ? candidates : present;
    const subject = pool.reduce((rarest, t) =>
      (this.df.get(t) || 0) < (this.df.get(rarest) || 0) ? t : rarest
    );

    for (const d of this.docs) {
      let s = 0;
      const matched: string[] = [];
      for (const t of terms) {
        const f = d.tf.get(t) || 0;
        if (!f) continue;
        matched.push(t);
        const n = this.df.get(t) || 0;
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
        s += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.len) / (this.avgLen || 1))));
      }
      const matchedSubject = matched.includes(subject);
      if (matched.length < minTerms && !matchedSubject) continue;
      // Rank on the raw score and report the normalised one. Ranking on the
      // clamped value made every strong page score exactly 1.0, so the "best"
      // page for "how much does dermaplaning cost" could come out as the
      // testimonials page rather than the dermaplaning page.
      if (!bestRaw || s > bestRaw) {
        bestRaw = s;
        best = {
          id: d.id,
          score: Math.min(1, s / ceiling),
          matched,
          matchedSubject,
          subject,
          subjectPage: null,
        };
      }
    }
    if (best) best.subjectPage = this.topFor(subject);
    return best;
  }

  /**
   * The document most about a single term.
   *
   * Used for the page we show the reader. "How much does dermaplaning cost"
   * matches a short testimonials page best, because that page happens to
   * contain both "dermaplaning" and "cost" while the dermaplaning page never
   * mentions price. Pointing at the testimonials page would be technically
   * right and practically useless, so the reference is the page about the
   * subject and the verdict stays based on the whole question.
   */
  topFor(term: string): string | null {
    let bestId: string | null = null;
    let bestScore = 0;
    const k1 = 1.5;
    const b = 0.75;
    const N = this.docs.length;
    const n = this.df.get(term) || 0;
    if (!n) return null;
    const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
    for (const d of this.docs) {
      const f = d.tf.get(term) || 0;
      if (!f) continue;
      const s = idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.len) / (this.avgLen || 1))));
      if (s > bestScore) {
        bestScore = s;
        bestId = d.id;
      }
    }
    return bestId;
  }
}

/**
 * Answer signals. Each is a shape of evidence that a page has actually answered
 * a kind of question rather than merely mentioning the subject.
 */
export type AnswerKind = 'price' | 'duration' | 'process' | 'location' | 'policy' | 'yesno' | 'definition' | 'booking';

const PRICE_RE = /(?:[$£€]\s?\d[\d,]*(?:\.\d{2})?)|(\b\d[\d,]*\s?(?:usd|gbp|eur|dollars|pounds)\b)|(\bfrom\s+[$£€]?\d)|(\bstarting at\b)|(\bper (?:hour|session|month|person|night|day|week|project)\b)/i;
const DURATION_RE = /\b\d+\s?(?:-|to|–)?\s?\d*\s?(?:minute|min|hour|hr|day|week|month|year|business day)s?\b|\bsame[- ]day\b|\bwithin \d+\b|\bturnaround\b|\blead time\b/i;
const PROCESS_RE = /\b(step \d|first,|then,|finally,|the process|how it works|what to expect|stage \d|our approach)\b/i;
const LOCATION_RE = /\b(based in|located in|serving|we serve|service area|studio in|office in|covering|travel to|within \d+ (?:miles|km))\b/i;
const POLICY_RE = /\b(cancel|cancellation|refund|reschedul|deposit|terms|guarantee|warranty|return policy|no[- ]show)\w*/i;
const DEFINITION_RE = /\b(is a|are a|means|refers to|we are|we're a|specialis|specializ|we help|we provide|we offer)\b/i;
/** "How do I book this" is answered by a booking route, not by prose about one. */
const BOOKING_RE = /\b(book (now|online|here|a|your)|book an appointment|schedule (a|your|an)|reserve your|request an appointment|make an appointment|booking link|appointments?)\b/i;

export function hasAnswerSignal(kind: AnswerKind, text: string): boolean {
  switch (kind) {
    case 'price':
      return PRICE_RE.test(text);
    case 'duration':
      return DURATION_RE.test(text);
    case 'process':
      return PROCESS_RE.test(text);
    case 'location':
      return LOCATION_RE.test(text);
    case 'policy':
      return POLICY_RE.test(text);
    case 'definition':
      return DEFINITION_RE.test(text);
    case 'booking':
      return BOOKING_RE.test(text);
    case 'yesno':
    default:
      return true;
  }
}

/** Title-cases a service phrase for display without mangling acronyms. */
export function titleish(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w.length > 3 && w === w.toLowerCase() ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}
