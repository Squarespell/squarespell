/**
 * The questions a customer would actually ask this business.
 *
 * Two sources, in order of trust:
 *
 *  1. The site's own profile. Services, trade and location come from the crawl,
 *     so a question built from them is about this business rather than about
 *     businesses in general. "How much does brand photography cost?" beats
 *     "Do you have an FAQ page?" every time.
 *  2. Buyer-intent questions that decide any enquiry, and commerce or local
 *     questions where those apply.
 *
 * Google autocomplete was tried as a third source and removed. Completions for
 * a trade term are dominated by people who want to enter that trade rather than
 * buy from it ("how to start a design studio"), and prefix matching drifts to
 * unrelated brands ("how much does coachella make" from a seed of "coach").
 * Wrong questions cost more credibility than missing ones, and it added a
 * third-party dependency to an otherwise self-contained audit.
 *
 * Questions are never invented about a business we could not identify. If the
 * profile is not confident, this returns nothing.
 */

import type { AnswerKind } from './text';
import type { SiteProfile } from './profile';

export interface CandidateQuestion {
  /** The question as a customer would type it. */
  text: string;
  /** The shape of evidence a real answer would contain. */
  kind: AnswerKind;
  /** Where the question came from. */
  source: 'buyer-intent' | 'service' | 'commerce' | 'local' | 'search-demand';
  /** Commercial weight, 1 (nice to have) to 3 (deciding factor). */
  weight: 1 | 2 | 3;
  /** The service this question is about, when it is about one. */
  service?: string;
}

/** True when the service name is plural, so the verb has to agree with it. */
function isPlural(s: string): boolean {
  const last = s.trim().split(/\s+/).pop() || '';
  return /[^s]s$/i.test(last) && !/\b(business|address|process|analysis|wellness|fitness)$/i.test(last);
}

/**
 * Questions every service buyer has, phrased around a specific service.
 * "How much does treatments cost" is the kind of sentence that tells a reader
 * a machine wrote this, so the verb agrees with the name.
 */
const SERVICE_TEMPLATES: Array<{ t: (s: string) => string; kind: AnswerKind; weight: 1 | 2 | 3 }> = [
  { t: (s) => `How much ${isPlural(s) ? 'do' : 'does'} ${s.toLowerCase()} cost?`, kind: 'price', weight: 3 },
  { t: (s) => `What is included in ${s.toLowerCase()}?`, kind: 'definition', weight: 2 },
  { t: (s) => `How long ${isPlural(s) ? 'do' : 'does'} ${s.toLowerCase()} take?`, kind: 'duration', weight: 2 },
  { t: (s) => `How do I book ${s.toLowerCase()}?`, kind: 'booking', weight: 2 },
];

/** Questions that decide an enquiry regardless of trade. */
const BUYER_TEMPLATES: Array<{ text: string; kind: AnswerKind; weight: 1 | 2 | 3 }> = [
  { text: 'How much do you charge?', kind: 'price', weight: 3 },
  { text: 'What happens after I get in touch?', kind: 'process', weight: 2 },
  { text: 'How far in advance do I need to book?', kind: 'duration', weight: 2 },
  { text: 'What is your cancellation policy?', kind: 'policy', weight: 2 },
  { text: 'Who will I be working with?', kind: 'definition', weight: 1 },
  { text: 'Can I see examples of your previous work?', kind: 'yesno', weight: 2 },
  { text: 'What do I need to prepare beforehand?', kind: 'process', weight: 1 },
];

const COMMERCE_TEMPLATES: Array<{ text: string; kind: AnswerKind; weight: 1 | 2 | 3 }> = [
  { text: 'How long does delivery take?', kind: 'duration', weight: 3 },
  { text: 'How much is shipping?', kind: 'price', weight: 3 },
  { text: 'What is your returns policy?', kind: 'policy', weight: 3 },
  { text: 'Do you ship internationally?', kind: 'location', weight: 2 },
  { text: 'How do I track my order?', kind: 'process', weight: 1 },
];

export function templateQuestions(profile: SiteProfile): CandidateQuestion[] {
  if (!profile.confident) return [];
  const out: CandidateQuestion[] = [];

  // Shop products are excluded: a price already sits on the product page, and
  // "how much does the antioxidant toner cost" is not a question anybody needs
  // an FAQ for. Commerce gets its own template set below.
  const namedServices = profile.services.filter((s) => s.source !== 'product').slice(0, 4);
  for (const s of namedServices) {
    for (const tpl of SERVICE_TEMPLATES) {
      out.push({ text: tpl.t(s.name), kind: tpl.kind, source: 'service', weight: tpl.weight, service: s.name });
    }
  }

  // A shop with no named services is not taking bookings, so the questions that
  // assume a working relationship ("who will I be working with") do not apply.
  const shopOnly = profile.isCommerce && namedServices.length === 0;
  const buyerSet = shopOnly
    ? BUYER_TEMPLATES.filter((b) => /charge|get in touch/i.test(b.text))
    : BUYER_TEMPLATES;
  for (const b of buyerSet) {
    out.push({ text: b.text, kind: b.kind, source: 'buyer-intent', weight: b.weight });
  }

  if (profile.isCommerce) {
    for (const c of COMMERCE_TEMPLATES) {
      out.push({ text: c.text, kind: c.kind, source: 'commerce', weight: c.weight });
    }
  }

  if (profile.location) {
    out.push({
      text: `Where are you based, and which areas do you cover?`,
      kind: 'location',
      source: 'local',
      weight: 2,
    });
    // Phrased without the trade noun on purpose: "Do you offer coach in Upland"
    // is what happens when a template is handed a one-word category.
    out.push({
      text: `Do you cover ${profile.location} and the surrounding area?`,
      kind: 'location',
      source: 'local',
      weight: 2,
    });
  }

  // Dedupe and cap. A list of forty questions is a wall, not advice.
  const seen = new Set<string>();
  return out.filter((q) => {
    const k = q.text.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 30);
}
