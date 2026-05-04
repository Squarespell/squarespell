/**
 * leadScoring.ts — Engagement-based lead lifecycle engine.
 *
 * Inspired by HubSpot contact scoring, Klaviyo predictive analytics,
 * and ActiveCampaign lead scoring. Calculates a 0-100 engagement score
 * and assigns lifecycle stages that drive automation flow selection.
 *
 * Lifecycle stages:
 *   new       → just signed up / took quiz (0-3 days, no engagement)
 *   engaged   → opening emails, clicking links (moderate activity)
 *   hot       → high engagement, ready to convert (frequent opens/clicks)
 *   inactive  → no engagement in 30+ days
 *   churned   → no engagement in 60+ days, unresponsive
 *
 * Code-style: var, function(){}, string concatenation (project convention).
 */

import { log } from '../lib/logger';
import { supabase } from '../db/supabaseClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LifecycleStage = 'new' | 'engaged' | 'hot' | 'inactive' | 'churned';

export interface LeadEngagementData {
  lead_id: string;
  email: string;
  name: string | null;
  created_at: string;
  email_sends_count: number;
  email_opens_count: number;
  email_clicks_count: number;
  last_email_opened_at: string | null;
  last_email_clicked_at: string | null;
  days_since_signup: number;
  days_since_last_open: number | null;
  days_since_last_click: number | null;
}

export interface ScoredLead {
  lead_id: string;
  engagement_score: number;
  lifecycle_stage: LifecycleStage;
  factors: string[];
}

// ---------------------------------------------------------------------------
// Scoring weights (tuned from industry benchmarks)
// ---------------------------------------------------------------------------

var WEIGHTS = {
  // Recency signals (most important — Klaviyo-style)
  OPENED_LAST_7D: 30,
  OPENED_LAST_14D: 20,
  OPENED_LAST_30D: 10,
  CLICKED_LAST_7D: 35,
  CLICKED_LAST_14D: 25,
  CLICKED_LAST_30D: 15,

  // Frequency signals
  OPEN_RATE_BONUS: 15,         // per 10% open rate above 20%
  CLICK_RATE_BONUS: 20,        // per 5% click rate above 3%

  // Engagement depth
  QUIZ_COMPLETED: 10,          // they actually completed the quiz
  HAS_NAME: 5,                 // provided real info
  HAS_CONSENT: 5,              // GDPR consent given

  // Penalties
  NO_OPENS_30D: -20,
  NO_OPENS_60D: -40,
  UNSUBSCRIBED: -100,
};

// ---------------------------------------------------------------------------
// Score calculation
// ---------------------------------------------------------------------------

export function calculateEngagementScore(data: LeadEngagementData): ScoredLead {
  var score = 0;
  var factors: string[] = [];

  // Base: everyone starts at 10 for signing up
  score += 10;
  factors.push('+10 quiz signup');

  // Recency: when did they last engage?
  if (data.days_since_last_open !== null) {
    if (data.days_since_last_open <= 7) {
      score += WEIGHTS.OPENED_LAST_7D;
      factors.push('+' + WEIGHTS.OPENED_LAST_7D + ' opened email in last 7 days');
    } else if (data.days_since_last_open <= 14) {
      score += WEIGHTS.OPENED_LAST_14D;
      factors.push('+' + WEIGHTS.OPENED_LAST_14D + ' opened email in last 14 days');
    } else if (data.days_since_last_open <= 30) {
      score += WEIGHTS.OPENED_LAST_30D;
      factors.push('+' + WEIGHTS.OPENED_LAST_30D + ' opened email in last 30 days');
    }
  }

  if (data.days_since_last_click !== null) {
    if (data.days_since_last_click <= 7) {
      score += WEIGHTS.CLICKED_LAST_7D;
      factors.push('+' + WEIGHTS.CLICKED_LAST_7D + ' clicked in last 7 days');
    } else if (data.days_since_last_click <= 14) {
      score += WEIGHTS.CLICKED_LAST_14D;
      factors.push('+' + WEIGHTS.CLICKED_LAST_14D + ' clicked in last 14 days');
    } else if (data.days_since_last_click <= 30) {
      score += WEIGHTS.CLICKED_LAST_30D;
      factors.push('+' + WEIGHTS.CLICKED_LAST_30D + ' clicked in last 30 days');
    }
  }

  // Frequency: open rate and click rate
  if (data.email_sends_count > 0) {
    var openRate = data.email_opens_count / data.email_sends_count;
    if (openRate > 0.2) {
      var openBonus = Math.floor((openRate - 0.2) * 10 * WEIGHTS.OPEN_RATE_BONUS);
      score += Math.min(openBonus, 30);
      factors.push('+' + Math.min(openBonus, 30) + ' high open rate (' + Math.round(openRate * 100) + '%)');
    }

    var clickRate = data.email_clicks_count / data.email_sends_count;
    if (clickRate > 0.03) {
      var clickBonus = Math.floor((clickRate - 0.03) * 20 * WEIGHTS.CLICK_RATE_BONUS);
      score += Math.min(clickBonus, 40);
      factors.push('+' + Math.min(clickBonus, 40) + ' high click rate (' + Math.round(clickRate * 100) + '%)');
    }
  }

  // Engagement depth
  if (data.name && data.name.trim().length > 0) {
    score += WEIGHTS.HAS_NAME;
    factors.push('+' + WEIGHTS.HAS_NAME + ' provided name');
  }

  // Penalties: inactivity
  if (data.email_sends_count > 2) {
    if (data.days_since_last_open === null || data.days_since_last_open > 60) {
      score += WEIGHTS.NO_OPENS_60D;
      factors.push(WEIGHTS.NO_OPENS_60D + ' no opens in 60+ days');
    } else if (data.days_since_last_open > 30) {
      score += WEIGHTS.NO_OPENS_30D;
      factors.push(WEIGHTS.NO_OPENS_30D + ' no opens in 30+ days');
    }
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine lifecycle stage
  var stage = determineLifecycleStage(score, data);

  return {
    lead_id: data.lead_id,
    engagement_score: score,
    lifecycle_stage: stage,
    factors: factors,
  };
}

function determineLifecycleStage(score: number, data: LeadEngagementData): LifecycleStage {
  // Brand new (< 3 days, no email engagement yet)
  if (data.days_since_signup <= 3 && data.email_opens_count === 0) {
    return 'new';
  }

  // Churned: 60+ days no engagement + low score
  if (score < 15 && data.days_since_signup > 60) {
    return 'churned';
  }

  // Inactive: 30+ days no engagement
  if (score < 25 && data.days_since_signup > 30) {
    return 'inactive';
  }

  // Hot: high engagement score
  if (score >= 65) {
    return 'hot';
  }

  // Engaged: moderate engagement
  if (score >= 25) {
    return 'engaged';
  }

  // Default for new leads without enough data
  return 'new';
}

// ---------------------------------------------------------------------------
// Batch scoring — score all leads for a tenant
// ---------------------------------------------------------------------------

export async function scoreLeadsForTenant(tenantId: string): Promise<ScoredLead[]> {
  var { data: leads, error } = await supabase
    .from('leads')
    .select('id, email, name, created_at, email_sends_count, email_opens_count, email_clicks_count, last_email_opened_at, last_email_clicked_at, consent')
    .eq('user_id', tenantId)
    .is('archived_at', null);

  if (error || !leads) {
    log.error('[LeadScoring] Failed to fetch leads', { error: error?.message });
    return [];
  }

  var now = Date.now();
  var results: ScoredLead[] = [];

  for (var i = 0; i < leads.length; i++) {
    var lead = leads[i];
    var createdMs = new Date(lead.created_at).getTime();
    var daysSinceSignup = Math.floor((now - createdMs) / 86400000);

    var daysLastOpen: number | null = null;
    if (lead.last_email_opened_at) {
      daysLastOpen = Math.floor((now - new Date(lead.last_email_opened_at).getTime()) / 86400000);
    }

    var daysLastClick: number | null = null;
    if (lead.last_email_clicked_at) {
      daysLastClick = Math.floor((now - new Date(lead.last_email_clicked_at).getTime()) / 86400000);
    }

    var engData: LeadEngagementData = {
      lead_id: lead.id,
      email: lead.email,
      name: lead.name,
      created_at: lead.created_at,
      email_sends_count: lead.email_sends_count || 0,
      email_opens_count: lead.email_opens_count || 0,
      email_clicks_count: lead.email_clicks_count || 0,
      last_email_opened_at: lead.last_email_opened_at,
      last_email_clicked_at: lead.last_email_clicked_at,
      days_since_signup: daysSinceSignup,
      days_since_last_open: daysLastOpen,
      days_since_last_click: daysLastClick,
    };

    results.push(calculateEngagementScore(engData));
  }

  // Batch update leads with new scores
  for (var j = 0; j < results.length; j++) {
    var scored = results[j];
    await supabase
      .from('leads')
      .update({
        engagement_score: scored.engagement_score,
        lifecycle_stage: scored.lifecycle_stage,
      })
      .eq('id', scored.lead_id);
  }

  log.info('[LeadScoring] Scored ' + results.length + ' leads for tenant ' + tenantId);
  return results;
}

// ---------------------------------------------------------------------------
// Single lead scoring (for real-time on lead creation/event)
// ---------------------------------------------------------------------------

export async function scoreSingleLead(leadId: string): Promise<ScoredLead | null> {
  var { data: lead, error } = await supabase
    .from('leads')
    .select('id, email, name, created_at, email_sends_count, email_opens_count, email_clicks_count, last_email_opened_at, last_email_clicked_at')
    .eq('id', leadId)
    .single();

  if (error || !lead) return null;

  var now = Date.now();
  var createdMs = new Date(lead.created_at).getTime();

  var daysLastOpen: number | null = null;
  if (lead.last_email_opened_at) {
    daysLastOpen = Math.floor((now - new Date(lead.last_email_opened_at).getTime()) / 86400000);
  }
  var daysLastClick: number | null = null;
  if (lead.last_email_clicked_at) {
    daysLastClick = Math.floor((now - new Date(lead.last_email_clicked_at).getTime()) / 86400000);
  }

  var engData: LeadEngagementData = {
    lead_id: lead.id,
    email: lead.email,
    name: lead.name,
    created_at: lead.created_at,
    email_sends_count: lead.email_sends_count || 0,
    email_opens_count: lead.email_opens_count || 0,
    email_clicks_count: lead.email_clicks_count || 0,
    last_email_opened_at: lead.last_email_opened_at,
    last_email_clicked_at: lead.last_email_clicked_at,
    days_since_signup: Math.floor((now - createdMs) / 86400000),
    days_since_last_open: daysLastOpen,
    days_since_last_click: daysLastClick,
  };

  var scored = calculateEngagementScore(engData);

  await supabase
    .from('leads')
    .update({
      engagement_score: scored.engagement_score,
      lifecycle_stage: scored.lifecycle_stage,
    })
    .eq('id', leadId);

  return scored;
}

// ---------------------------------------------------------------------------
// Segment leads by lifecycle stage
// ---------------------------------------------------------------------------

export async function getLeadsByLifecycleStage(
  tenantId: string,
  stage: LifecycleStage
): Promise<{ id: string; email: string; name: string | null; engagement_score: number }[]> {
  var { data, error } = await supabase
    .from('leads')
    .select('id, email, name, engagement_score')
    .eq('user_id', tenantId)
    .eq('lifecycle_stage', stage)
    .is('archived_at', null);

  if (error) {
    log.error('[LeadScoring] Failed to get leads by stage', { error: error.message });
    return [];
  }

  return data || [];
}

// ---------------------------------------------------------------------------
// Engagement event tracking (updates lead engagement counters)
// ---------------------------------------------------------------------------

export async function trackEngagementEvent(
  leadId: string,
  tenantId: string,
  eventType: 'email_sent' | 'email_opened' | 'email_clicked',
  campaignId?: string
): Promise<void> {
  var now = new Date().toISOString();
  var hourOfDay = new Date().getHours();
  var dayOfWeek = new Date().getDay();

  // Fetch current lead counters
  var { data: currentLead } = await supabase
    .from('leads')
    .select('email_sends_count, email_opens_count, email_clicks_count')
    .eq('id', leadId)
    .single();

  if (!currentLead) return;

  // Update lead counters based on event type
  if (eventType === 'email_sent') {
    await supabase.from('leads').update({
      email_sends_count: (currentLead.email_sends_count || 0) + 1,
      last_email_sent_at: now,
    }).eq('id', leadId);
  } else if (eventType === 'email_opened') {
    await supabase.from('leads').update({
      email_opens_count: (currentLead.email_opens_count || 0) + 1,
      last_email_opened_at: now,
    }).eq('id', leadId);
  } else if (eventType === 'email_clicked') {
    await supabase.from('leads').update({
      email_clicks_count: (currentLead.email_clicks_count || 0) + 1,
      last_email_clicked_at: now,
    }).eq('id', leadId);
  }

  // Log to engagement history (for send-time optimization)
  await supabase.from('email_engagement_log').insert({
    lead_id: leadId,
    tenant_id: tenantId,
    event_type: eventType,
    hour_of_day: hourOfDay,
    day_of_week: dayOfWeek,
    campaign_id: campaignId || null,
  });

  // Re-score the lead after engagement event
  await scoreSingleLead(leadId);
}
