/**
 * aiEmails.ts — API routes for the AI email campaign intelligence engine.
 *
 * Routes:
 *   POST /api/ai-emails/generate-subjects    — AI subject line generation
 *   POST /api/ai-emails/generate-email       — Full AI email generation
 *   POST /api/ai-emails/generate-variants    — A/B variant generation
 *   POST /api/ai-emails/spam-check           — Spam safety analysis
 *   POST /api/ai-emails/smart-campaign       — Auto-generate campaigns by lifecycle
 *   GET  /api/ai-emails/send-time            — Optimal send time recommendation
 *   GET  /api/ai-emails/flow-templates       — List automation flow templates
 *   POST /api/ai-emails/flow-templates/:type — Get specific flow template
 *
 *   POST /api/ai-emails/lead-scores          — Score all leads for tenant
 *   GET  /api/ai-emails/lead-scores/:stage   — Get leads by lifecycle stage
 *
 *   POST /api/ai-emails/ab-test              — Create email A/B test
 *   GET  /api/ai-emails/ab-test/:campaignId  — Get A/B test results
 *   POST /api/ai-emails/ab-test/:campaignId/check-winner — Check & declare winner
 *
 * Code-style: var, function(){}, string concatenation (project convention).
 */

import { Router } from 'express';
import { requireAuth, attachUser, AuthenticatedRequest } from '../middleware/auth';
import {
  generateSubjectLines,
  generateEmail,
  generateVariants,
  checkSpamSafety,
  recommendSendTime,
  detectCampaignType,
} from '../services/aiEmailEngine';
import type { CampaignGoal, LeadProfile } from '../services/aiEmailEngine';
import {
  scoreLeadsForTenant,
  getLeadsByLifecycleStage,
  scoreSingleLead,
} from '../services/leadScoring';
import type { LifecycleStage } from '../services/leadScoring';
import {
  buildSmartCampaigns,
  getFlowTemplate,
  listFlowTemplates,
  decideFollowUp,
  filterRecipients,
} from '../services/smartCampaignBuilder';
import {
  createEmailAbTest,
  generateAbVariants,
  getAbTestResults,
  checkAndDeclareWinner,
} from '../services/emailAbTesting';
import { supabase } from '../db/supabaseClient';

export var aiEmailRouter = Router();
aiEmailRouter.use(requireAuth, attachUser);

// ─── AI Subject Line Generation ─────────────────────────────────────────────

aiEmailRouter.post('/generate-subjects', async function(req: AuthenticatedRequest, res) {
  try {
    var { goal, lead_profile, count } = req.body;
    if (!goal || !goal.type || !goal.brand_name) {
      return res.status(400).json({ error: 'goal.type and goal.brand_name required' });
    }
    var result = await generateSubjectLines(
      goal as CampaignGoal,
      lead_profile || {},
      count || 5
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Full AI Email Generation ───────────────────────────────────────────────

aiEmailRouter.post('/generate-email', async function(req: AuthenticatedRequest, res) {
  try {
    var { goal, lead_profile } = req.body;
    if (!goal || !goal.type || !goal.brand_name) {
      return res.status(400).json({ error: 'goal.type and goal.brand_name required' });
    }
    var result = await generateEmail(goal as CampaignGoal, lead_profile || {});
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── A/B Variant Generation ─────────────────────────────────────────────────

aiEmailRouter.post('/generate-variants', async function(req: AuthenticatedRequest, res) {
  try {
    var { goal, lead_profile, variant_count } = req.body;
    if (!goal || !goal.type || !goal.brand_name) {
      return res.status(400).json({ error: 'goal.type and goal.brand_name required' });
    }
    var result = await generateVariants(
      goal as CampaignGoal,
      lead_profile || {},
      variant_count || 3
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Spam Safety Check ──────────────────────────────────────────────────────

aiEmailRouter.post('/spam-check', async function(req: AuthenticatedRequest, res) {
  try {
    var { subject, html_body } = req.body;
    if (!subject || !html_body) {
      return res.status(400).json({ error: 'subject and html_body required' });
    }
    var result = checkSpamSafety(subject, html_body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Smart Campaign Builder ─────────────────────────────────────────────────

aiEmailRouter.post('/smart-campaign', async function(req: AuthenticatedRequest, res) {
  try {
    var tenantId = req.dbUserId!;
    var { quiz_id, brand_name, brand_voice, industry, from_name, from_email, cta_url } = req.body;

    if (!quiz_id || !brand_name || !from_name || !from_email) {
      return res.status(400).json({ error: 'quiz_id, brand_name, from_name, from_email required' });
    }

    var result = await buildSmartCampaigns({
      tenant_id: tenantId,
      quiz_id: quiz_id,
      brand_name: brand_name,
      brand_voice: brand_voice,
      industry: industry,
      from_name: from_name,
      from_email: from_email,
      cta_url: cta_url,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Optimal Send Time ──────────────────────────────────────────────────────

aiEmailRouter.get('/send-time', async function(req: AuthenticatedRequest, res) {
  try {
    var tenantId = req.dbUserId!;

    // Get engagement data for this tenant's leads
    var { data: engagementData } = await supabase
      .from('email_engagement_log')
      .select('hour_of_day')
      .eq('tenant_id', tenantId)
      .eq('event_type', 'email_opened');

    // Aggregate by hour
    var hourCounts: Record<number, number> = {};
    (engagementData || []).forEach(function(row: any) {
      var h = row.hour_of_day;
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    });

    var hourArray = Object.entries(hourCounts).map(function(entry) {
      return { hour_of_day: parseInt(entry[0]), count: entry[1] as number };
    });

    var recommendation = recommendSendTime(hourArray);
    res.json(recommendation);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Flow Templates ─────────────────────────────────────────────────────────

aiEmailRouter.get('/flow-templates', async function(_req: AuthenticatedRequest, res) {
  res.json({ templates: listFlowTemplates() });
});

aiEmailRouter.post('/flow-templates/:type', async function(req: AuthenticatedRequest, res) {
  var flowType = req.params.type;
  var template = getFlowTemplate(flowType);
  res.json({ flow_type: flowType, steps: template });
});

// ─── Follow-up Decision ─────────────────────────────────────────────────────

aiEmailRouter.post('/follow-up-decision', async function(req: AuthenticatedRequest, res) {
  try {
    var { days_since_last, total_sends, total_opens, total_clicks, lifecycle_stage } = req.body;
    var decision = decideFollowUp(
      days_since_last || 0,
      total_sends || 0,
      total_opens || 0,
      total_clicks || 0,
      lifecycle_stage || 'new'
    );
    res.json(decision);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Lead Scoring ───────────────────────────────────────────────────────────

aiEmailRouter.post('/lead-scores', async function(req: AuthenticatedRequest, res) {
  try {
    var tenantId = req.dbUserId!;
    var results = await scoreLeadsForTenant(tenantId);
    res.json({
      scored: results.length,
      summary: {
        new: results.filter(function(r) { return r.lifecycle_stage === 'new'; }).length,
        engaged: results.filter(function(r) { return r.lifecycle_stage === 'engaged'; }).length,
        hot: results.filter(function(r) { return r.lifecycle_stage === 'hot'; }).length,
        inactive: results.filter(function(r) { return r.lifecycle_stage === 'inactive'; }).length,
        churned: results.filter(function(r) { return r.lifecycle_stage === 'churned'; }).length,
      },
      leads: results.slice(0, 50), // Return first 50 for preview
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

aiEmailRouter.get('/lead-scores/:stage', async function(req: AuthenticatedRequest, res) {
  try {
    var tenantId = req.dbUserId!;
    var stage = req.params.stage as LifecycleStage;
    var validStages = ['new', 'engaged', 'hot', 'inactive', 'churned'];
    if (validStages.indexOf(stage) === -1) {
      return res.status(400).json({ error: 'Invalid stage. Use: ' + validStages.join(', ') });
    }
    var leads = await getLeadsByLifecycleStage(tenantId, stage);
    res.json({ stage: stage, count: leads.length, leads: leads });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Smart Recipient Filtering ──────────────────────────────────────────────

aiEmailRouter.post('/smart-filter', async function(req: AuthenticatedRequest, res) {
  try {
    var tenantId = req.dbUserId!;
    var { quiz_id, filters } = req.body;
    if (!quiz_id) return res.status(400).json({ error: 'quiz_id required' });
    var recipients = await filterRecipients(tenantId, quiz_id, filters || {});
    res.json({ count: recipients.length, emails: recipients });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Email A/B Testing ──────────────────────────────────────────────────────

aiEmailRouter.post('/ab-test', async function(req: AuthenticatedRequest, res) {
  try {
    var { campaign_id, variants, sample_percentage, winning_metric, auto_send_winner, test_duration_hours } = req.body;
    if (!campaign_id || !variants || !Array.isArray(variants) || variants.length < 2) {
      return res.status(400).json({ error: 'campaign_id and at least 2 variants required' });
    }
    var result = await createEmailAbTest(campaign_id, {
      variants: variants,
      sample_percentage: sample_percentage || 20,
      winning_metric: winning_metric || 'open_rate',
      auto_send_winner: auto_send_winner !== false,
      test_duration_hours: test_duration_hours || 24,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

aiEmailRouter.post('/ab-test/ai-generate', async function(req: AuthenticatedRequest, res) {
  try {
    var { campaign_id, goal, variant_count } = req.body;
    if (!campaign_id || !goal) {
      return res.status(400).json({ error: 'campaign_id and goal required' });
    }

    // Get current campaign HTML
    var { data: campaign } = await supabase
      .from('email_campaigns')
      .select('html')
      .eq('id', campaign_id)
      .single();

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    var variants = await generateAbVariants(
      campaign_id,
      goal as CampaignGoal,
      campaign.html,
      variant_count || 3
    );
    res.json({ variants: variants });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

aiEmailRouter.get('/ab-test/:campaignId', async function(req: AuthenticatedRequest, res) {
  try {
    var results = await getAbTestResults(req.params.campaignId);
    if (!results) return res.status(404).json({ error: 'No A/B test found for this campaign' });
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

aiEmailRouter.post('/ab-test/:campaignId/check-winner', async function(req: AuthenticatedRequest, res) {
  try {
    var minConfidence = req.body?.min_confidence || 80;
    var result = await checkAndDeclareWinner(req.params.campaignId, minConfidence);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Campaign Type Detection ────────────────────────────────────────────────

aiEmailRouter.post('/detect-campaign-type', async function(req: AuthenticatedRequest, res) {
  try {
    var { lead_profile } = req.body;
    var campaignType = detectCampaignType(lead_profile || {});
    res.json({ recommended_type: campaignType });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
