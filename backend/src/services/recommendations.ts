/**
 * Smart recommendations engine.
 *
 * Analyzes a user's quiz portfolio and returns actionable suggestions
 * to improve conversion, engagement, and revenue.
 *
 * Each recommendation has a type, priority (1-5), title, body, and action URL.
 */

import { supabase } from '../db/supabaseClient';

export interface Recommendation {
  type: string;
  priority: number;
  title: string;
  body: string;
  actionUrl: string;
  actionLabel: string;
}

export async function getRecommendations(userId: string): Promise<Recommendation[]> {
  var recs: Recommendation[] = [];

  // Fetch user data
  var { data: user } = await supabase
    .from('users')
    .select('plan, brand_kit, created_at')
    .eq('id', userId)
    .single();

  // Fetch quizzes
  var { data: quizzes } = await supabase
    .from('quizzes')
    .select('id, title, status, slug, view_count, lead_count, questions, outcomes, settings, mode, created_at')
    .eq('user_id', userId);

  var allQuizzes = quizzes || [];
  var liveQuizzes = allQuizzes.filter(function(q: any) { return q.status === 'live'; });
  var draftQuizzes = allQuizzes.filter(function(q: any) { return q.status === 'draft'; });

  // Fetch campaigns
  var { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, status')
    .eq('user_id', userId);

  var allCampaigns = campaigns || [];
  var sentCampaigns = allCampaigns.filter(function(c: any) { return c.status === 'sent'; });

  // Fetch sequences
  var { data: sequences } = await supabase
    .from('email_sequences')
    .select('id, enabled, quiz_id')
    .in('quiz_id', allQuizzes.map(function(q: any) { return q.id; }));

  var enabledSequences = (sequences || []).filter(function(s: any) { return s.enabled; });

  // ── No quizzes at all ──────────────────────────────────────────
  if (allQuizzes.length === 0) {
    recs.push({
      type: 'create_quiz',
      priority: 1,
      title: 'Create your first quiz',
      body: 'Paste your Squarespace URL and our AI will generate a branded quiz in under 60 seconds.',
      actionUrl: '/dashboard/quizzes',
      actionLabel: 'Create quiz',
    });
    return recs;
  }

  // ── Draft quizzes not published ────────────────────────────────
  for (var i = 0; i < draftQuizzes.length; i++) {
    var dq = draftQuizzes[i];
    recs.push({
      type: 'publish_draft',
      priority: 2,
      title: 'Publish "' + (dq as any).title + '"',
      body: 'This quiz is still in draft. Publish it so visitors can start taking it and you can capture leads.',
      actionUrl: '/dashboard/' + (dq as any).id,
      actionLabel: 'Open editor',
    });
  }

  // ── Low view count on live quizzes ─────────────────────────────
  for (var j = 0; j < liveQuizzes.length; j++) {
    var lq = liveQuizzes[j] as any;
    if (lq.view_count < 10 && lq.status === 'live') {
      recs.push({
        type: 'low_views',
        priority: 3,
        title: 'Promote "' + lq.title + '"',
        body: 'This quiz has only ' + lq.view_count + ' views. Embed it on a high-traffic page or share the link on social media.',
        actionUrl: '/dashboard/embed',
        actionLabel: 'Get embed code',
      });
      break; // Only show once
    }
  }

  // ── Low completion rate ────────────────────────────────────────
  for (var k = 0; k < liveQuizzes.length; k++) {
    var cq = liveQuizzes[k] as any;
    if (cq.view_count > 20) {
      var completionRate = cq.lead_count / cq.view_count;
      if (completionRate < 0.1) {
        var questionCount = Array.isArray(cq.questions) ? cq.questions.length : 0;
        recs.push({
          type: 'low_conversion',
          priority: 2,
          title: 'Improve conversion on "' + cq.title + '"',
          body: questionCount > 8
            ? 'This quiz has ' + questionCount + ' questions and only a ' + Math.round(completionRate * 100) + '% conversion rate. Try reducing to 5-7 questions.'
            : 'Only ' + Math.round(completionRate * 100) + '% of visitors complete this quiz. Consider making questions more engaging or adding outcome previews.',
          actionUrl: '/dashboard/' + cq.id,
          actionLabel: 'Edit quiz',
        });
        break;
      }
    }
  }

  // ── No brand kit set up ────────────────────────────────────────
  if (!user?.brand_kit) {
    recs.push({
      type: 'brand_kit',
      priority: 3,
      title: 'Set up your brand kit',
      body: 'Add your logo, colors, and fonts so every quiz and email automatically matches your Squarespace site.',
      actionUrl: '/dashboard/brand-kit',
      actionLabel: 'Set up brand',
    });
  }

  // ── No email sequences ─────────────────────────────────────────
  if (liveQuizzes.length > 0 && enabledSequences.length === 0) {
    var firstLive = liveQuizzes[0] as any;
    recs.push({
      type: 'add_sequence',
      priority: 2,
      title: 'Set up a follow-up email sequence',
      body: 'Leads who get a follow-up email within 24 hours are 3x more likely to convert. Add an automated drip sequence.',
      actionUrl: '/dashboard/quizzes/' + firstLive.id + '/sequences',
      actionLabel: 'Create sequence',
    });
  }

  // ── No email campaigns sent ────────────────────────────────────
  if (liveQuizzes.length > 0 && sentCampaigns.length === 0) {
    recs.push({
      type: 'send_campaign',
      priority: 3,
      title: 'Send your first email campaign',
      body: 'You have leads waiting. Send a targeted email campaign based on quiz outcomes to drive conversions.',
      actionUrl: '/dashboard/emails',
      actionLabel: 'Create campaign',
    });
  }

  // ── Free plan upsell ───────────────────────────────────────────
  var plan = user?.plan || 'free';
  if (plan === 'free' || plan === 'trial') {
    var totalLeads = 0;
    for (var m = 0; m < allQuizzes.length; m++) {
      totalLeads += (allQuizzes[m] as any).lead_count || 0;
    }
    if (totalLeads > 50) {
      recs.push({
        type: 'upgrade',
        priority: 4,
        title: 'Upgrade to Growth for more leads',
        body: 'You have captured ' + totalLeads + ' leads. Upgrade to Growth ($29/mo) to remove limits and unlock Zapier integration.',
        actionUrl: '/pricing',
        actionLabel: 'View plans',
      });
    }
  }

  // Sort by priority (lower = more important)
  recs.sort(function(a, b) { return a.priority - b.priority; });

  // Return top 5
  return recs.slice(0, 5);
}
