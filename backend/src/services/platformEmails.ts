/**
 * platformEmails.ts — Squarespell → User lifecycle email system.
 *
 * These are the emails Squarespell (the platform) sends to its own users —
 * welcome, onboarding nudges, trial reminders, billing notifications,
 * engagement digests, and win-back sequences. They are completely separate
 * from the user→visitor email sequences that power quiz lead nurturing.
 *
 * Every send is logged to `platform_email_logs` so a given (user, email_type)
 * pair is never sent twice. The unsubscribe list is checked before every send.
 *
 * Code-style: var, function(){}, string concatenation (project convention).
 */

import { supabase } from '../db/supabaseClient';
import { resendProvider } from './email/resendProvider';
import { log } from '../lib/logger';

var APP_URL = process.env.APP_URL || 'https://app.squarespell.com';
var MARKETING_URL = process.env.MARKETING_URL || 'https://squarespell.com';
var FROM_EMAIL = process.env.PLATFORM_EMAIL_FROM || 'Squarespell <hello@squarespell.com>';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PlatformEmailType =
  // Onboarding (Stage 1)
  | 'welcome'
  | 'getting_started'
  | 'template_showcase'
  | 'first_quiz_nudge'
  | 'first_lead_congrats'
  // Trial (Stage 2)
  | 'trial_day7_halfway'
  | 'trial_day11_3days'
  | 'trial_day13_lastday'
  | 'trial_day14_expired'
  // Billing (Stage 3)
  | 'payment_confirmed'
  | 'payment_failed'
  | 'plan_upgraded'
  | 'subscription_cancelled'
  // Engagement (Stage 4)
  | 'weekly_digest'
  | 'monthly_report'
  | 'lead_milestone'
  // Win-back (Stage 5)
  | 'winback_7d'
  | 'winback_30d'
  | 'winback_60d';

interface PlatformEmailOpts {
  userId: string;
  email: string;
  emailType: PlatformEmailType;
  firstName?: string;
  /** Extra data for template rendering — varies by email type */
  data?: Record<string, any>;
}

// ─── Dedup + Unsubscribe Guard ───────────────────────────────────────────────

async function alreadySent(userId: string, emailType: string): Promise<boolean> {
  var { data } = await supabase
    .from('platform_email_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('email_type', emailType)
    .limit(1)
    .maybeSingle();
  return !!data;
}

async function isUnsubscribedFromPlatform(email: string): Promise<boolean> {
  var { data } = await supabase
    .from('email_unsubscribes')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  return !!data;
}

async function logSend(userId: string, email: string, emailType: string, messageId: string): Promise<void> {
  await supabase.from('platform_email_logs').insert({
    user_id: userId,
    email: email.toLowerCase(),
    email_type: emailType,
    message_id: messageId,
    sent_at: new Date().toISOString(),
  });
}

// ─── Public send function ────────────────────────────────────────────────────

export async function sendPlatformEmail(opts: PlatformEmailOpts): Promise<boolean> {
  var userId = opts.userId;
  var email = opts.email;
  var emailType = opts.emailType;
  var firstName = opts.firstName || '';
  var data = opts.data || {};

  // Guard: already sent this email to this user?
  var sent = await alreadySent(userId, emailType);
  if (sent) {
    log.info('[PlatformEmail] Skipping (already sent): ' + emailType + ' for user ' + userId);
    return false;
  }

  // Guard: unsubscribed?
  var unsub = await isUnsubscribedFromPlatform(email);
  if (unsub) {
    log.info('[PlatformEmail] Skipping (unsubscribed): ' + emailType + ' for ' + email);
    return false;
  }

  // Render template
  var template = renderTemplate(emailType, firstName, data);
  if (!template) {
    log.warn('[PlatformEmail] No template for type: ' + emailType);
    return false;
  }

  try {
    var result = await resendProvider.send({
      from: FROM_EMAIL,
      to: email,
      subject: template.subject,
      html: template.html,
    });
    await logSend(userId, email, emailType, result.messageId);
    log.info('[PlatformEmail] Sent ' + emailType + ' to ' + email + ' (msgId=' + result.messageId + ')');
    return true;
  } catch (err: any) {
    log.error('[PlatformEmail] Failed to send ' + emailType + ' to ' + email, { err: err?.message });
    return false;
  }
}

// ─── Shared HTML wrapper ─────────────────────────────────────────────────────

function wrapEmail(body: string, preheader?: string): string {
  var preheaderHtml = preheader
    ? '<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">' + preheader + '</div>'
    : '';
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>',
    '<body style="margin:0;padding:0;background:#F7F7F5;font-family:\'DM Sans\',system-ui,-apple-system,sans-serif">',
    preheaderHtml,
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F5"><tr><td align="center" style="padding:40px 16px">',
    '<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">',
    // Logo header
    '<tr><td style="padding:0 0 24px">',
    '  <table cellpadding="0" cellspacing="0"><tr>',
    '    <td style="width:36px;height:36px;background:#0D7377;border-radius:10px;text-align:center;vertical-align:middle">',
    '      <img src="https://app.squarespell.com/logo-icon-white.png" width="16" height="16" alt="" style="display:inline-block;vertical-align:middle" />',
    '    </td>',
    '    <td style="padding-left:10px;font-size:17px;font-weight:700;color:#1A1A1A;letter-spacing:-0.02em">Squarespell</td>',
    '  </tr></table>',
    '</td></tr>',
    // Body card
    '<tr><td style="background:#FFFFFF;border-radius:16px;padding:36px 32px">',
    body,
    '</td></tr>',
    // Footer
    '<tr><td style="padding:24px 0;text-align:center">',
    '  <p style="font-size:12px;color:rgba(26,26,26,0.35);margin:0;line-height:1.6">',
    '    Squarespell &middot; Quiz funnels for Squarespace<br>',
    '    <a href="' + APP_URL + '/dashboard/billing" style="color:rgba(26,26,26,0.5);text-decoration:underline">Email preferences</a>',
    '    &nbsp;&middot;&nbsp;',
    '    <a href="' + MARKETING_URL + '" style="color:rgba(26,26,26,0.5);text-decoration:underline">squarespell.com</a>',
    '  </p>',
    '</td></tr>',
    '</table>',
    '</td></tr></table>',
    '</body></html>',
  ].join('\n');
}

function btn(text: string, href: string, bg?: string): string {
  var bgColor = bg || '#0D7377';
  return '<a href="' + href + '" style="display:inline-block;padding:14px 28px;background:' + bgColor + ';color:#FFFFFF;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:-0.01em">' + text + '</a>';
}

function heading(text: string): string {
  return '<h1 style="font-size:24px;font-weight:800;color:#1A1A1A;letter-spacing:-0.03em;margin:0 0 8px;line-height:1.3">' + text + '</h1>';
}

function para(text: string): string {
  return '<p style="font-size:15px;color:rgba(26,26,26,0.7);line-height:1.6;margin:0 0 20px">' + text + '</p>';
}

function divider(): string {
  return '<div style="border-top:1px solid #E4E3E0;margin:24px 0"></div>';
}

function infoBox(text: string): string {
  return '<div style="background:rgba(13,115,119,0.06);border:1px solid rgba(13,115,119,0.15);border-radius:10px;padding:16px 18px;margin:20px 0">' +
    '<div style="font-size:14px;color:#1A1A1A;line-height:1.55">' + text + '</div></div>';
}

function statCard(label: string, value: string, accent?: boolean): string {
  var color = accent ? '#0D7377' : '#1A1A1A';
  return '<td style="padding:16px 20px;width:50%">' +
    '<div style="font-size:11px;font-weight:700;color:rgba(26,26,26,0.4);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">' + label + '</div>' +
    '<div style="font-size:26px;font-weight:800;color:' + color + ';letter-spacing:-0.03em">' + value + '</div>' +
    '</td>';
}

function featureList(items: string[]): string {
  var rows = items.map(function(item) {
    return '<tr><td style="padding:6px 0;font-size:14px;color:#1A1A1A;line-height:1.5">' +
      '<span style="color:#0D7377;font-weight:700;margin-right:8px">&#10003;</span>' + item + '</td></tr>';
  });
  return '<table cellpadding="0" cellspacing="0" style="margin:16px 0">' + rows.join('') + '</table>';
}

// ─── Template Rendering ──────────────────────────────────────────────────────

interface RenderedEmail { subject: string; html: string; }

function renderTemplate(type: PlatformEmailType, firstName: string, data: Record<string, any>): RenderedEmail | null {
  var name = firstName || 'there';
  var greeting = 'Hi ' + name + ',';

  switch (type) {

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 1: ONBOARDING
    // ═══════════════════════════════════════════════════════════════════════

    case 'welcome':
      return {
        subject: 'Welcome to Squarespell! Your quiz funnel journey starts now',
        html: wrapEmail([
          heading('Welcome to Squarespell!'),
          para(greeting + ' Thanks for signing up. You\'re about to turn your Squarespace site into a lead-generating machine with interactive quiz funnels.'),
          para('Your 14-day free trial is active — here\'s what you can do right now:'),
          featureList([
            'Create unlimited quizzes from any website URL',
            'Collect leads with built-in email capture',
            'See real-time analytics on every quiz',
            'Set up automated email follow-ups',
          ]),
          '<div style="text-align:center;margin:28px 0">' + btn('Create your first quiz', APP_URL + '/tools/quiz-funnel/build') + '</div>',
          para('It only takes about 2 minutes. Paste your site URL and we\'ll generate a branded quiz automatically.'),
        ].join('\n'), 'Your 14-day trial is active. Create your first quiz in 2 minutes.'),
      };

    case 'getting_started':
      return {
        subject: 'Quick tip: Create your first quiz in 2 minutes',
        html: wrapEmail([
          heading('Ready to build your first quiz?'),
          para(greeting + ' Here\'s the fastest way to get started:'),
          '<div style="background:#F7F7F5;border:1px solid #E4E3E0;border-radius:12px;padding:20px 22px;margin:20px 0">',
          '<table cellpadding="0" cellspacing="0" width="100%">',
          '<tr><td style="padding:8px 0;font-size:14px;color:#1A1A1A"><strong style="color:#0D7377;margin-right:10px">1.</strong> Paste your website URL</td></tr>',
          '<tr><td style="padding:8px 0;font-size:14px;color:#1A1A1A"><strong style="color:#0D7377;margin-right:10px">2.</strong> Pick a quiz style from 3 options</td></tr>',
          '<tr><td style="padding:8px 0;font-size:14px;color:#1A1A1A"><strong style="color:#0D7377;margin-right:10px">3.</strong> Publish and share — done!</td></tr>',
          '</table>',
          '</div>',
          para('Our AI reads your site\'s brand colors, content, and audience — then generates a quiz that matches your brand perfectly.'),
          '<div style="text-align:center;margin:28px 0">' + btn('Build a quiz now', APP_URL + '/tools/quiz-funnel/build') + '</div>',
        ].join('\n'), 'Three steps to your first quiz funnel.'),
      };

    case 'template_showcase':
      return {
        subject: 'Need inspiration? Check out these quiz templates',
        html: wrapEmail([
          heading('Quiz templates for every niche'),
          para(greeting + ' Not sure what kind of quiz to build? We\'ve got templates for every Squarespace business type:'),
          '<div style="background:#F7F7F5;border:1px solid #E4E3E0;border-radius:12px;padding:20px 22px;margin:20px 0">',
          '<table cellpadding="0" cellspacing="0" width="100%">',
          '<tr><td style="padding:8px 0;font-size:14px;color:#1A1A1A"><strong>Product Recommendation</strong> — help visitors find the right product</td></tr>',
          '<tr><td style="padding:8px 0;font-size:14px;color:#1A1A1A"><strong>Knowledge Check</strong> — test and educate your audience</td></tr>',
          '<tr><td style="padding:8px 0;font-size:14px;color:#1A1A1A"><strong>Personality Quiz</strong> — fun, shareable, and viral</td></tr>',
          '<tr><td style="padding:8px 0;font-size:14px;color:#1A1A1A"><strong>Lead Qualifier</strong> — segment and score incoming leads</td></tr>',
          '<tr><td style="padding:8px 0;font-size:14px;color:#1A1A1A"><strong>Assessment</strong> — diagnose a problem and recommend solutions</td></tr>',
          '</table>',
          '</div>',
          para('Every template adapts to your brand automatically when you paste your URL.'),
          '<div style="text-align:center;margin:28px 0">' + btn('Browse templates', APP_URL + '/tools/quiz-funnel/build') + '</div>',
        ].join('\n'), 'Templates for product recommenders, personality quizzes, and more.'),
      };

    case 'first_quiz_nudge':
      return {
        subject: 'You haven\'t created a quiz yet — need help?',
        html: wrapEmail([
          heading('Still setting up?'),
          para(greeting + ' We noticed you haven\'t created your first quiz yet. No worries — we\'re here to help.'),
          para('Most users create their first quiz in under 2 minutes. Just paste your Squarespace URL and our AI does the rest.'),
          infoBox('Tip: Product recommendation quizzes convert 3-5x better than static pages for most Squarespace stores.'),
          '<div style="text-align:center;margin:28px 0">' + btn('Create a quiz', APP_URL + '/tools/quiz-funnel/build') + '</div>',
          para('If you\'re stuck or have questions, just reply to this email — we read every response.'),
        ].join('\n'), 'Most users build their first quiz in under 2 minutes.'),
      };

    case 'first_lead_congrats':
      var leadCount = data.leadCount || 1;
      return {
        subject: 'You just got your first quiz lead!',
        html: wrapEmail([
          heading('Your first lead is in! &#127881;'),
          para(greeting + ' Congratulations — someone just completed your quiz and left their details. Your quiz funnel is working!'),
          '<div style="background:rgba(13,115,119,0.06);border:1px solid rgba(13,115,119,0.15);border-radius:12px;padding:20px 22px;margin:20px 0;text-align:center">',
          '<div style="font-size:11px;font-weight:700;color:#0D7377;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">Total leads collected</div>',
          '<div style="font-size:36px;font-weight:800;color:#0D7377;letter-spacing:-0.03em">' + leadCount + '</div>',
          '</div>',
          para('Here\'s what to do next:'),
          featureList([
            'Check your leads dashboard to see the details',
            'Set up an email follow-up sequence for new leads',
            'Share your quiz on social media to drive more traffic',
          ]),
          '<div style="text-align:center;margin:28px 0">' + btn('View your leads', APP_URL + '/dashboard/leads') + '</div>',
        ].join('\n'), 'Your quiz funnel is working — check your first lead.'),
      };

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 2: TRIAL
    // ═══════════════════════════════════════════════════════════════════════

    case 'trial_day7_halfway':
      return {
        subject: 'Your trial is halfway through — 7 days left',
        html: wrapEmail([
          heading('7 days left on your trial'),
          para(greeting + ' Your 14-day free trial is at the halfway mark. Here\'s a quick summary of what you\'ve accomplished:'),
          '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F5;border:1px solid #E4E3E0;border-radius:12px;overflow:hidden;margin:20px 0">',
          '<tr>' + statCard('Quizzes', String(data.quizCount || 0)) + statCard('Leads', String(data.leadCount || 0), true) + '</tr>',
          '</table>',
          para('Make the most of your remaining trial days:'),
          featureList([
            'Set up automated email follow-ups for your leads',
            'Try A/B testing different quiz styles',
            'Connect your favourite tools via integrations',
          ]),
          '<div style="text-align:center;margin:28px 0">' + btn('Go to dashboard', APP_URL + '/dashboard') + '</div>',
          divider(),
          para('Want to lock in your access? <a href="' + MARKETING_URL + '/pricing" style="color:#0D7377;font-weight:700;text-decoration:none">View plans &rarr;</a>'),
        ].join('\n'), '7 days left — here\'s what you\'ve built so far.'),
      };

    case 'trial_day11_3days':
      return {
        subject: 'Only 3 days left on your Squarespell trial',
        html: wrapEmail([
          heading('3 days left'),
          para(greeting + ' Your free trial ends in 3 days. After that, your quizzes will go offline and you won\'t be able to collect new leads.'),
          para('Upgrade now to keep everything running:'),
          featureList([
            'All your quizzes stay live and collecting leads',
            'Keep your analytics history and lead data',
            'Unlock unlimited email sequences',
            'Priority support from our team',
          ]),
          '<div style="text-align:center;margin:28px 0">' + btn('Upgrade now', MARKETING_URL + '/pricing') + '</div>',
          infoBox('Plans start at just $19/month. Cancel any time, no contracts.'),
        ].join('\n'), 'Your trial ends in 3 days — upgrade to keep your quizzes live.'),
      };

    case 'trial_day13_lastday':
      return {
        subject: 'Last day: Your Squarespell trial ends tomorrow',
        html: wrapEmail([
          heading('Your trial ends tomorrow'),
          para(greeting + ' This is your last day with full access. After tomorrow, your quizzes will go offline.'),
          para('Upgrading takes 30 seconds — pick a plan and your quizzes keep running without any interruption.'),
          '<div style="text-align:center;margin:28px 0">' + btn('Keep my quizzes live', MARKETING_URL + '/pricing') + '</div>',
          divider(),
          '<div style="font-size:13px;color:rgba(26,26,26,0.5);line-height:1.5">Not ready? No problem. Your data is saved for 30 days. You can upgrade any time to pick up where you left off.</div>',
        ].join('\n'), 'Tomorrow your quizzes go offline. Upgrade in 30 seconds.'),
      };

    case 'trial_day14_expired':
      return {
        subject: 'Your Squarespell trial has ended',
        html: wrapEmail([
          heading('Your trial has ended'),
          para(greeting + ' Your 14-day free trial is over. Your quizzes are now offline and won\'t collect new leads or views.'),
          para('The good news: all your data — quizzes, leads, analytics — is saved. Upgrade to reactivate everything instantly.'),
          '<div style="text-align:center;margin:28px 0">' + btn('Reactivate my account', MARKETING_URL + '/pricing') + '</div>',
          infoBox('Your data is kept for 30 days. After that it will be permanently deleted.'),
        ].join('\n'), 'Your trial is over, but your data is safe for 30 days.'),
      };

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 3: BILLING
    // ═══════════════════════════════════════════════════════════════════════

    case 'payment_confirmed':
      var planName = data.planName || 'Pro';
      return {
        subject: 'Payment confirmed — welcome to Squarespell ' + planName,
        html: wrapEmail([
          heading('You\'re on the ' + planName + ' plan!'),
          para(greeting + ' Your payment has been processed successfully. Here\'s what\'s included in your plan:'),
          featureList([
            'Unlimited quizzes and leads',
            'Advanced analytics and segmentation',
            'Email follow-up sequences',
            'Priority support',
            data.planName === 'Agency' ? 'White-label and custom domains' : 'Custom branding',
          ]),
          '<div style="text-align:center;margin:28px 0">' + btn('Go to dashboard', APP_URL + '/dashboard') + '</div>',
          divider(),
          '<div style="font-size:13px;color:rgba(26,26,26,0.5);line-height:1.5">You can manage your subscription and view invoices in <a href="' + APP_URL + '/dashboard/billing" style="color:#0D7377;text-decoration:none">Billing settings</a>.</div>',
        ].join('\n'), 'Welcome to Squarespell ' + planName + '. Your account is active.'),
      };

    case 'payment_failed':
      return {
        subject: 'Action needed: Your Squarespell payment failed',
        html: wrapEmail([
          heading('Payment failed'),
          para(greeting + ' We tried to charge your card but the payment didn\'t go through. Please update your payment method to keep your account active.'),
          infoBox('If your payment isn\'t updated within 7 days, your quizzes will be paused and stop collecting leads.'),
          '<div style="text-align:center;margin:28px 0">' + btn('Update payment method', APP_URL + '/dashboard/billing') + '</div>',
          para('If you think this is a mistake, check with your bank or try a different card. You can also reply to this email and we\'ll help sort it out.'),
        ].join('\n'), 'Your payment failed — update your card to keep your quizzes live.'),
      };

    case 'plan_upgraded':
      var newPlan = data.planName || 'Pro';
      return {
        subject: 'You\'ve upgraded to Squarespell ' + newPlan + '!',
        html: wrapEmail([
          heading('Upgraded to ' + newPlan + '!'),
          para(greeting + ' Nice move. Your account has been upgraded and all new features are available immediately.'),
          para('Here\'s what\'s new on your plan:'),
          featureList(data.newFeatures || [
            'Higher lead and email limits',
            'Advanced integrations',
            'Priority support',
          ]),
          '<div style="text-align:center;margin:28px 0">' + btn('Explore new features', APP_URL + '/dashboard') + '</div>',
        ].join('\n'), 'Your upgrade is live — new features are ready.'),
      };

    case 'subscription_cancelled':
      return {
        subject: 'Your Squarespell subscription has been cancelled',
        html: wrapEmail([
          heading('Subscription cancelled'),
          para(greeting + ' Your subscription has been cancelled. You\'ll still have access until the end of your current billing period' + (data.endsAt ? ' (' + data.endsAt + ')' : '') + '.'),
          para('After that, your quizzes will go offline. Your data will be saved for 30 days in case you change your mind.'),
          '<div style="text-align:center;margin:28px 0">' + btn('Resubscribe', MARKETING_URL + '/pricing') + '</div>',
          divider(),
          '<div style="font-size:13px;color:rgba(26,26,26,0.5);line-height:1.5">We\'d love to know why you cancelled. Just reply to this email — your feedback helps us improve.</div>',
        ].join('\n'), 'Your subscription is cancelled. Access continues until your billing period ends.'),
      };

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 4: ENGAGEMENT
    // ═══════════════════════════════════════════════════════════════════════

    case 'weekly_digest':
      // Weekly digest is handled by the existing cron. This template is here
      // for completeness but the existing weekly-digest cron sends directly
      // via Resend. We keep this to allow future migration.
      return null;

    case 'monthly_report':
      var stats = data.stats || {};
      return {
        subject: 'Your ' + (data.monthName || 'monthly') + ' Squarespell report',
        html: wrapEmail([
          heading('Your ' + (data.monthName || 'monthly') + ' report'),
          para(greeting + ' Here\'s how your quizzes performed this month.'),
          '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F5;border:1px solid #E4E3E0;border-radius:12px;overflow:hidden;margin:20px 0">',
          '<tr>' + statCard('Views', String(stats.views || 0)) + statCard('Leads', String(stats.leads || 0), true) + '</tr>',
          '<tr>' + statCard('Completions', String(stats.completions || 0)) + statCard('Conversion', (stats.conversionRate || 0) + '%') + '</tr>',
          '</table>',
          stats.topQuiz ? '<div style="margin-bottom:20px"><div style="font-size:11px;font-weight:700;color:rgba(26,26,26,0.4);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">Top performing quiz</div><div style="font-size:15px;font-weight:600;color:#1A1A1A">' + stats.topQuiz + '</div></div>' : '',
          '<div style="text-align:center;margin:28px 0">' + btn('View full analytics', APP_URL + '/dashboard/analytics') + '</div>',
        ].join('\n'), 'Your monthly quiz performance summary is ready.'),
      };

    case 'lead_milestone':
      var milestone = data.milestone || 100;
      return {
        subject: 'Milestone: You\'ve collected ' + milestone + ' leads!',
        html: wrapEmail([
          heading(milestone + ' leads collected! &#127881;'),
          para(greeting + ' Your quiz funnels have now captured ' + milestone + ' leads. That\'s a serious achievement.'),
          infoBox('At this pace, you could reach ' + (milestone * 2) + ' leads within the next month. Keep your quizzes promoted and active!'),
          para('Here are some ways to accelerate your lead generation:'),
          featureList([
            'Embed quizzes on your highest-traffic pages',
            'Share on social media with a compelling hook',
            'Set up email sequences to convert leads into customers',
            'Try A/B testing different quiz titles',
          ]),
          '<div style="text-align:center;margin:28px 0">' + btn('View your leads', APP_URL + '/dashboard/leads') + '</div>',
        ].join('\n'), 'Congratulations — ' + milestone + ' leads and counting.'),
      };

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 5: WIN-BACK
    // ═══════════════════════════════════════════════════════════════════════

    case 'winback_7d':
      return {
        subject: 'We miss you! Your quizzes are waiting',
        html: wrapEmail([
          heading('It\'s been a week'),
          para(greeting + ' We noticed you haven\'t logged in for a while. Your quizzes are still live and collecting data — here\'s a quick update:'),
          '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F5;border:1px solid #E4E3E0;border-radius:12px;overflow:hidden;margin:20px 0">',
          '<tr>' + statCard('Views', String(data.recentViews || 0)) + statCard('New leads', String(data.recentLeads || 0), true) + '</tr>',
          '</table>',
          '<div style="text-align:center;margin:28px 0">' + btn('Check your dashboard', APP_URL + '/dashboard') + '</div>',
        ].join('\n'), 'Your quizzes collected data while you were away.'),
      };

    case 'winback_30d':
      return {
        subject: 'Your Squarespell quizzes need attention',
        html: wrapEmail([
          heading('30 days without a visit'),
          para(greeting + ' It\'s been a month since you last checked in. Your quizzes may need some attention to keep performing well.'),
          para('Here are a few things worth checking:'),
          featureList([
            'Review new leads that came in while you were away',
            'Check if any email sequences need updating',
            'Look at your analytics for optimization opportunities',
          ]),
          '<div style="text-align:center;margin:28px 0">' + btn('Log in now', APP_URL + '/dashboard') + '</div>',
          divider(),
          '<div style="font-size:13px;color:rgba(26,26,26,0.5);line-height:1.5">Not using Squarespell anymore? Just reply and let us know — we\'d love your feedback.</div>',
        ].join('\n'), 'It\'s been 30 days. Your quizzes are waiting.'),
      };

    case 'winback_60d':
      return {
        subject: 'Last check-in: Is Squarespell still right for you?',
        html: wrapEmail([
          heading('We haven\'t seen you in a while'),
          para(greeting + ' It\'s been 60 days since your last visit. We want to make sure Squarespell is still serving you well.'),
          para('If you\'re still interested in quiz funnels, we\'d love to help you get back on track. A lot has improved since your last visit.'),
          '<div style="text-align:center;margin:28px 0">' + btn('Come back and explore', APP_URL + '/dashboard') + '</div>',
          divider(),
          '<div style="font-size:13px;color:rgba(26,26,26,0.5);line-height:1.5">If Squarespell isn\'t for you, no hard feelings. Reply to this email if there\'s anything we could have done better — it genuinely helps us improve.</div>',
        ].join('\n'), 'It\'s been 2 months. We\'d love to hear from you.'),
      };

    default:
      return null;
  }
}
