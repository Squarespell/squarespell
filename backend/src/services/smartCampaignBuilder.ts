/**
 * smartCampaignBuilder.ts — AI campaign orchestrator.
 *
 * Auto-generates personalized email campaigns by combining:
 *  - Lead lifecycle stage (from leadScoring.ts)
 *  - AI email generation (from aiEmailEngine.ts)
 *  - Merge tag personalization (from mergeTags.ts)
 *  - Automation decision trees
 *
 * Decision tree logic (inspired by HubSpot workflows + Klaviyo flows):
 *
 *  Lead Created
 *    └→ [immediate] Welcome email with quiz result
 *    └→ [+1 day] Value-first nurture tip
 *    └→ [+3 days] If opened welcome → upsell / deeper content
 *                  If NOT opened → resend with new subject
 *    └→ [+7 days] If clicked any → hot lead, send offer
 *                  If no engagement → re-engagement
 *    └→ [+14 days] If still no engagement → win-back
 *    └→ [+30 days] If no engagement → sunset / final
 *
 * Code-style: var, function(){}, string concatenation (project convention).
 */

import { log } from '../lib/logger';
import { supabase } from '../db/supabaseClient';
import {
  generateEmail,
  generateSubjectLines,
  generateVariants,
  detectCampaignType,
  checkSpamSafety,
  recommendSendTime,
} from './aiEmailEngine';
import type { CampaignGoal, LeadProfile } from './aiEmailEngine';
import { scoreLeadsForTenant, getLeadsByLifecycleStage } from './leadScoring';
import type { LifecycleStage } from './leadScoring';
import { buildMergeContext } from './mergeTags';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AutoCampaignRequest {
  tenant_id: string;
  quiz_id: string;
  brand_name: string;
  brand_voice?: string;
  industry?: string;
  from_name: string;
  from_email: string;
  cta_url?: string;
}

export interface AutoCampaignResult {
  campaigns_created: number;
  campaigns: Array<{
    id: string;
    name: string;
    type: string;
    lifecycle_stage: string;
    recipient_count: number;
    subject: string;
    spam_safety: { score: number; verdict: string };
  }>;
}

export interface FollowUpDecision {
  action: 'send_followup' | 'resend_new_subject' | 'escalate_to_offer' | 'move_to_reengagement' | 'sunset' | 'skip';
  reason: string;
  campaign_type: CampaignGoal['type'];
  delay_hours: number;
}

// ---------------------------------------------------------------------------
// Automation decision tree
// ---------------------------------------------------------------------------

export function decideFollowUp(
  daysSinceLast: number,
  totalSends: number,
  totalOpens: number,
  totalClicks: number,
  lifecycleStage: LifecycleStage
): FollowUpDecision {
  var openRate = totalSends > 0 ? totalOpens / totalSends : 0;
  var clickRate = totalSends > 0 ? totalClicks / totalSends : 0;

  // Never sent before: welcome flow
  if (totalSends === 0) {
    return {
      action: 'send_followup',
      reason: 'New lead, no emails sent yet',
      campaign_type: 'welcome',
      delay_hours: 0,
    };
  }

  // Highly engaged: clicked recently
  if (totalClicks > 0 && daysSinceLast < 7) {
    return {
      action: 'escalate_to_offer',
      reason: 'Lead clicked recently - hot prospect',
      campaign_type: 'upsell',
      delay_hours: 24,
    };
  }

  // Opened but not clicked: nurture with more value
  if (totalOpens > 0 && totalClicks === 0 && daysSinceLast < 14) {
    return {
      action: 'send_followup',
      reason: 'Opens but no clicks - needs more compelling content',
      campaign_type: 'nurture',
      delay_hours: 48,
    };
  }

  // No opens on recent send: resend with new subject
  if (totalOpens === 0 && totalSends <= 2 && daysSinceLast >= 2 && daysSinceLast < 7) {
    return {
      action: 'resend_new_subject',
      reason: 'No opens yet - try different subject line',
      campaign_type: 'result_delivery',
      delay_hours: 0,
    };
  }

  // 7-14 days no engagement: re-engagement
  if (openRate < 0.1 && daysSinceLast >= 7 && daysSinceLast < 30) {
    return {
      action: 'move_to_reengagement',
      reason: 'No engagement in 7+ days',
      campaign_type: 'reengagement',
      delay_hours: 0,
    };
  }

  // 30+ days no engagement: win-back
  if (openRate < 0.1 && daysSinceLast >= 30 && daysSinceLast < 60) {
    return {
      action: 'send_followup',
      reason: '30+ days inactive - win-back attempt',
      campaign_type: 'winback',
      delay_hours: 0,
    };
  }

  // 60+ days: sunset
  if (daysSinceLast >= 60) {
    return {
      action: 'sunset',
      reason: '60+ days no engagement - remove from active list',
      campaign_type: 'winback',
      delay_hours: 0,
    };
  }

  // Default: nurture on a 3-day cadence
  if (daysSinceLast >= 3) {
    return {
      action: 'send_followup',
      reason: 'Regular nurture cadence',
      campaign_type: 'nurture',
      delay_hours: 0,
    };
  }

  return {
    action: 'skip',
    reason: 'Too soon since last email',
    campaign_type: 'nurture',
    delay_hours: 72,
  };
}

// ---------------------------------------------------------------------------
// Auto-generate campaigns for each lifecycle segment
// ---------------------------------------------------------------------------

export async function buildSmartCampaigns(
  request: AutoCampaignRequest
): Promise<AutoCampaignResult> {
  var result: AutoCampaignResult = { campaigns_created: 0, campaigns: [] };

  // First, score all leads
  await scoreLeadsForTenant(request.tenant_id);

  // Get leads grouped by lifecycle stage
  var stages: LifecycleStage[] = ['new', 'engaged', 'hot', 'inactive', 'churned'];
  var campaignTypeMap: Record<LifecycleStage, CampaignGoal['type']> = {
    new: 'welcome',
    engaged: 'nurture',
    hot: 'upsell',
    inactive: 'reengagement',
    churned: 'winback',
  };

  for (var si = 0; si < stages.length; si++) {
    var stage = stages[si];
    var leads = await getLeadsByLifecycleStage(request.tenant_id, stage);

    if (leads.length === 0) continue;

    var campaignType = campaignTypeMap[stage];
    var goal: CampaignGoal = {
      type: campaignType,
      brand_name: request.brand_name,
      brand_voice: request.brand_voice,
      industry: request.industry,
      cta_url: request.cta_url,
    };

    // Use a sample lead for AI generation context
    var sampleLead: Partial<LeadProfile> = {
      first_name: '{{first_name}}',
      lifecycle_stage: stage,
      engagement_score: leads[0].engagement_score || 0,
    };

    // Generate the email
    var generated = await generateEmail(goal, sampleLead);

    // Check spam safety
    var spamCheck = checkSpamSafety(generated.subject, generated.html_body);

    // Create the campaign in database
    var campaignName = stageLabel(stage) + ' - ' + request.brand_name;
    var { data: campaign, error } = await supabase
      .from('email_campaigns')
      .insert({
        tenant_id: request.tenant_id,
        name: campaignName,
        subject: generated.subject,
        html: generated.html_body,
        from_name: request.from_name,
        from_email: request.from_email,
        status: 'draft',
        mode: stage === 'new' ? 'live' : 'blast',
        source_quiz_id: request.quiz_id,
        source_filters: {},
        trigger_type: stage === 'new' ? 'quiz_completed' : null,
        trigger_delay_minutes: 0,
        sent_count: 0,
      })
      .select()
      .single();

    if (error) {
      log.error('[SmartCampaign] Failed to create campaign', { stage: stage, error: error.message });
      continue;
    }

    result.campaigns_created++;
    result.campaigns.push({
      id: campaign.id,
      name: campaignName,
      type: campaignType,
      lifecycle_stage: stage,
      recipient_count: leads.length,
      subject: generated.subject,
      spam_safety: { score: spamCheck.score, verdict: spamCheck.verdict },
    });
  }

  log.info('[SmartCampaign] Built ' + result.campaigns_created + ' campaigns for tenant ' + request.tenant_id);
  return result;
}

function stageLabel(stage: LifecycleStage): string {
  var labels: Record<string, string> = {
    new: 'Welcome Flow',
    engaged: 'Nurture Sequence',
    hot: 'Conversion Offer',
    inactive: 'Re-engagement',
    churned: 'Win-back',
  };
  return labels[stage] || stage;
}

// ---------------------------------------------------------------------------
// Email sequence builder (multi-step flows)
// ---------------------------------------------------------------------------

export interface SequenceStep {
  delay_days: number;
  campaign_type: CampaignGoal['type'];
  subject_strategy: string;
  condition?: {
    type: 'opened_previous' | 'clicked_previous' | 'not_opened' | 'not_clicked';
  };
}

var FLOW_TEMPLATES: Record<string, SequenceStep[]> = {
  onboarding: [
    { delay_days: 0, campaign_type: 'result_delivery', subject_strategy: 'result reveal' },
    { delay_days: 1, campaign_type: 'welcome', subject_strategy: 'value introduction' },
    { delay_days: 3, campaign_type: 'nurture', subject_strategy: 'quick tip', condition: { type: 'opened_previous' } },
    { delay_days: 3, campaign_type: 'result_delivery', subject_strategy: 'resend with curiosity', condition: { type: 'not_opened' } },
    { delay_days: 7, campaign_type: 'upsell', subject_strategy: 'personalized offer', condition: { type: 'clicked_previous' } },
    { delay_days: 7, campaign_type: 'nurture', subject_strategy: 'social proof', condition: { type: 'not_clicked' } },
    { delay_days: 14, campaign_type: 'reengagement', subject_strategy: 'what is new', condition: { type: 'not_opened' } },
  ],

  post_purchase: [
    { delay_days: 0, campaign_type: 'welcome', subject_strategy: 'thank you' },
    { delay_days: 3, campaign_type: 'nurture', subject_strategy: 'getting started tips' },
    { delay_days: 7, campaign_type: 'nurture', subject_strategy: 'advanced tips' },
    { delay_days: 14, campaign_type: 'upsell', subject_strategy: 'complementary product' },
  ],

  reengagement: [
    { delay_days: 0, campaign_type: 'reengagement', subject_strategy: 'curiosity gap' },
    { delay_days: 3, campaign_type: 'promo', subject_strategy: 'exclusive offer', condition: { type: 'opened_previous' } },
    { delay_days: 7, campaign_type: 'winback', subject_strategy: 'break-up email', condition: { type: 'not_opened' } },
  ],

  promotion: [
    { delay_days: 0, campaign_type: 'promo', subject_strategy: 'offer announcement' },
    { delay_days: 2, campaign_type: 'promo', subject_strategy: 'reminder', condition: { type: 'not_opened' } },
    { delay_days: 2, campaign_type: 'upsell', subject_strategy: 'benefit focused', condition: { type: 'opened_previous' } },
    { delay_days: 4, campaign_type: 'promo', subject_strategy: 'last chance urgency' },
  ],
};

export function getFlowTemplate(flowType: string): SequenceStep[] {
  return FLOW_TEMPLATES[flowType] || FLOW_TEMPLATES.onboarding;
}

export function listFlowTemplates(): string[] {
  return Object.keys(FLOW_TEMPLATES);
}

// ---------------------------------------------------------------------------
// Smart recipient filtering
// ---------------------------------------------------------------------------

export interface SmartFilter {
  lifecycle_stages?: LifecycleStage[];
  min_engagement_score?: number;
  max_engagement_score?: number;
  outcome_ids?: string[];
  exclude_recently_emailed_hours?: number;
  exclude_unsubscribed?: boolean;
}

export async function filterRecipients(
  tenantId: string,
  quizId: string,
  filters: SmartFilter
): Promise<string[]> {
  var q = supabase
    .from('leads')
    .select('id, email')
    .eq('user_id', tenantId)
    .eq('quiz_id', quizId)
    .is('archived_at', null)
    .not('email', 'is', null);

  if (filters.lifecycle_stages && filters.lifecycle_stages.length > 0) {
    q = q.in('lifecycle_stage', filters.lifecycle_stages);
  }
  if (typeof filters.min_engagement_score === 'number') {
    q = q.gte('engagement_score', filters.min_engagement_score);
  }
  if (typeof filters.max_engagement_score === 'number') {
    q = q.lte('engagement_score', filters.max_engagement_score);
  }
  if (filters.outcome_ids && filters.outcome_ids.length > 0) {
    q = q.in('outcome_id', filters.outcome_ids);
  }
  if (filters.exclude_recently_emailed_hours) {
    var cutoff = new Date(Date.now() - filters.exclude_recently_emailed_hours * 3600000).toISOString();
    q = q.or('last_email_sent_at.is.null,last_email_sent_at.lt.' + cutoff);
  }

  var { data, error } = await q;
  if (error) {
    log.error('[SmartCampaign] Filter failed', { error: error.message });
    return [];
  }

  var emails = (data || [])
    .map(function(r: any) { return (r.email || '').trim().toLowerCase(); })
    .filter(function(e: string) { return e.length > 0; });

  // Remove duplicates
  var unique = Array.from(new Set(emails));

  // Exclude unsubscribed
  if (filters.exclude_unsubscribed !== false && unique.length > 0) {
    var { data: unsubs } = await supabase
      .from('email_unsubscribes')
      .select('email')
      .in('email', unique);
    var unsubSet = new Set((unsubs || []).map(function(u: any) { return u.email; }));
    unique = unique.filter(function(e) { return !unsubSet.has(e); });
  }

  return unique;
}
