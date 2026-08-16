/**
 * Website Doctor.
 *
 * A diagnostic *presentation* layer over the Opportunity Engine — it invents
 * no new facts and runs no new checks. Every `Diagnosis` is a re-framing of
 * an `Opportunity` (opportunity.ts) into the shape a non-technical reader
 * asks for: what's wrong, what's the proof, what likely caused it, why does
 * it matter, what do I do, how hard is it, and who should do it.
 *
 * Cause vs. symptom (see module comment in opportunity.ts, point 1 —
 * grouping is a fixed, auditable table): where an opportunity combines more
 * than one finding, this reports the individual findings as "likely
 * contributing factors," never as an established causal chain. The engine
 * has no way to confirm that finding A *causes* finding B; it only knows
 * they co-occur and belong to the same theme. The language says so.
 */

import type { Finding } from './types';
import type { OpportunityReport, EffortLevel, OpportunityOwner, PriorityLevel } from './opportunity';

export interface Diagnosis {
  id: string;
  /** WHAT appears to be wrong, in plain language. */
  diagnosis: string;
  /** WHAT PROVES IT — the concrete evidence behind the diagnosis. */
  evidence: Finding['evidence'];
  /**
   * Likely contributing factors, in the "cause, not confirmed cause" sense
   * described above. Empty when the diagnosis rests on a single finding —
   * there is nothing to call a contributing factor to itself.
   */
  likelyContributingFactors: string[];
  /** WHY IT MATTERS, framed for this business. */
  impact: string;
  /** WHAT TO DO. */
  prescription: string;
  effort: EffortLevel;
  owner: OpportunityOwner;
  priority: PriorityLevel;
  affectedPages: string[];
  /** The Opportunity this diagnosis was built from, for cross-referencing. */
  sourceOpportunityId: string;
}

export function buildWebsiteDoctor(opportunities: OpportunityReport, allFindings: Finding[]): Diagnosis[] {
  const byId = new Map(allFindings.map((f) => [f.id, f] as const));

  return opportunities.all.map((o) => {
    const sourceFindings = o.findingIds.map((id) => byId.get(id)).filter((f): f is Finding => Boolean(f));
    // Only worth naming as "contributing factors" when there is more than one
    // finding behind the diagnosis — a single finding is the diagnosis, not a
    // factor contributing to it.
    const likelyContributingFactors = sourceFindings.length > 1 ? sourceFindings.map((f) => f.title) : [];

    return {
      id: o.id,
      diagnosis: o.title,
      evidence: o.evidence,
      likelyContributingFactors,
      impact: o.businessRelevance,
      prescription: o.recommendedAction,
      effort: o.effort,
      owner: o.owner,
      priority: o.priority,
      affectedPages: o.affectedPages,
      sourceOpportunityId: o.id,
    };
  });
}
