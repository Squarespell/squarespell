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
import type { OpportunityReport, GoalAwareOpportunityReport, EffortLevel, OpportunityOwner, PriorityLevel } from './opportunity';
import { GOAL_LABELS } from './opportunity';

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
  /**
   * Set only when a goal-aware report was supplied and this diagnosis's
   * source opportunity is strongly relevant to the stated goal (see
   * opportunity.ts `applyGoalAwareness`). Always an observation about
   * relevance, never a claim about outcomes the audit has no data for —
   * e.g. never "this is costing you bookings," only "this is on the path to
   * the booking goal you told us about."
   */
  goalNote?: string;
}

export function buildWebsiteDoctor(
  opportunities: OpportunityReport,
  allFindings: Finding[],
  goalAware?: GoalAwareOpportunityReport
): Diagnosis[] {
  const byId = new Map(allFindings.map((f) => [f.id, f] as const));
  const goalById = goalAware?.goal ? new Map(goalAware.all.map((o) => [o.id, o] as const)) : null;

  return opportunities.all.map((o) => {
    const sourceFindings = o.findingIds.map((id) => byId.get(id)).filter((f): f is Finding => Boolean(f));
    // Only worth naming as "contributing factors" when there is more than one
    // finding behind the diagnosis — a single finding is the diagnosis, not a
    // factor contributing to it.
    const likelyContributingFactors = sourceFindings.length > 1 ? sourceFindings.map((f) => f.title) : [];

    const goalMatch = goalById?.get(o.id);
    const goalNote =
      goalAware?.goal && goalMatch && goalMatch.goalRelevanceScore >= 85
        ? `This is directly on the path to your stated goal of ${GOAL_LABELS[goalAware.goal] ?? goalAware.goal} — currently ranked ${goalMatch.priority} priority based on what was actually found, not on the goal itself.`
        : undefined;

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
      goalNote,
    };
  });
}
