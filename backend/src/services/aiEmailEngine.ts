/**
 * aiEmailEngine.ts — AI-powered email campaign intelligence engine.
 *
 * Reverse-engineered best practices from HubSpot, Klaviyo, Mailchimp,
 * ActiveCampaign, ConvertKit, Customer.io, and Brevo — distilled into a
 * single service that generates, personalizes, and optimizes every email
 * Squarespell sends.
 *
 * Capabilities:
 *  1. AI subject line generation optimized for open rate
 *  2. Dynamic email body generation from lead data
 *  3. CTA optimization by campaign goal
 *  4. A/B variant generation (subject + body)
 *  5. Spam-safety scoring
 *  6. Lifecycle-aware copy (onboarding, nurture, upsell, win-back)
 *
 * Code-style: var, function(){}, string concatenation (project convention).
 */

import Anthropic from '@anthropic-ai/sdk';
import { log } from '../lib/logger';

var anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeadProfile {
  first_name: string;
  last_name: string;
  email: string;
  quiz_name: string;
  outcome_name: string;
  outcome_description: string;
  score: number | null;
  lifecycle_stage: string;   // new | engaged | hot | inactive | churned
  engagement_score: number;
  days_since_signup: number;
  email_opens_count: number;
  email_clicks_count: number;
  answers_summary: string;   // human-readable answer summary
  source: string;
  custom_fields: Record<string, any>;
}

export interface CampaignGoal {
  type: 'welcome' | 'result_delivery' | 'nurture' | 'upsell' | 'reengagement' | 'winback' | 'announcement' | 'promo';
  product_name?: string;
  offer_details?: string;
  cta_url?: string;
  cta_text?: string;
  brand_name: string;
  brand_voice?: string;  // e.g. "friendly and professional", "playful", "authoritative"
  industry?: string;
}

export interface GeneratedEmail {
  subject: string;
  preview_text: string;
  html_body: string;
  plain_text: string;
  spam_score: number;      // 0-100, lower is better
  estimated_open_rate: string;
  tags: string[];
}

export interface SubjectLineResult {
  subjects: Array<{
    text: string;
    estimated_open_rate: string;
    strategy: string;
  }>;
}

export interface EmailVariants {
  variants: Array<{
    label: string;
    subject: string;
    preview_text: string;
    html_body: string;
    strategy: string;
  }>;
}

// ---------------------------------------------------------------------------
// Spam word detection (industry standard blocklist)
// ---------------------------------------------------------------------------

var SPAM_TRIGGERS = [
  'free', 'guarantee', 'no obligation', 'winner', 'congratulations',
  'act now', 'limited time', 'urgent', 'click here', 'buy now',
  'order now', 'special promotion', 'risk free', 'no cost',
  'double your', 'earn money', 'cash bonus', 'million dollars',
  'credit card', 'no strings', 'apply now', 'instant',
  'lowest price', 'bargain', 'cheap', 'incredible deal',
  'all caps subject', 'excessive punctuation', 'RE: fake reply',
];

function computeSpamScore(subject: string, body: string): number {
  var score = 0;
  var combined = (subject + ' ' + body).toLowerCase();

  // Check spam trigger words
  for (var i = 0; i < SPAM_TRIGGERS.length; i++) {
    if (combined.indexOf(SPAM_TRIGGERS[i]) !== -1) {
      score += 5;
    }
  }

  // All-caps subject
  if (subject === subject.toUpperCase() && subject.length > 5) score += 20;

  // Excessive exclamation marks
  var exclamations = (combined.match(/!/g) || []).length;
  if (exclamations > 2) score += exclamations * 3;

  // Excessive capitalization in body
  var capsRatio = (body.match(/[A-Z]/g) || []).length / Math.max(body.length, 1);
  if (capsRatio > 0.3) score += 15;

  // URL count (too many links is suspicious)
  var urlCount = (body.match(/https?:\/\//g) || []).length;
  if (urlCount > 5) score += (urlCount - 5) * 3;

  // Missing unsubscribe
  if (body.toLowerCase().indexOf('unsubscribe') === -1) score += 10;

  // Subject line length (too short or too long)
  if (subject.length < 10) score += 5;
  if (subject.length > 80) score += 5;

  return Math.min(score, 100);
}

// ---------------------------------------------------------------------------
// Email copywriting frameworks (derived from top platforms)
// ---------------------------------------------------------------------------

var FRAMEWORK_PROMPTS: Record<string, string> = {
  welcome: `FRAMEWORK: Welcome / Onboarding
GOAL: Make the new lead feel valued, set expectations, and give them one clear next step.
TONE: Warm, enthusiastic but not over-the-top. Like a knowledgeable friend.
STRUCTURE:
- Personalized greeting using first name
- Acknowledge what they just did (took a quiz, signed up)
- Brief value prop of what they will get from you
- Single clear CTA
- P.S. line with social proof or quick tip
SUBJECT LINE STRATEGIES: Curiosity gap, personal name, question format
AVOID: Multiple CTAs, long paragraphs, sales pressure`,

  result_delivery: `FRAMEWORK: Quiz Result Delivery
GOAL: Deliver their personalized result and guide them to the next action.
TONE: Expert, personalized, slightly celebratory.
STRUCTURE:
- "Hi [name], your results are in" opening
- Their specific outcome/result prominently displayed
- 2-3 sentence explanation of what it means for them
- Personalized recommendation based on their result
- Clear CTA to see full results or take action
SUBJECT LINE STRATEGIES: Result reveal, personal name + outcome, urgency
AVOID: Burying the result, generic copy, multiple outcomes`,

  nurture: `FRAMEWORK: Value-First Nurture
GOAL: Build trust and authority by delivering genuine value without asking for anything.
TONE: Helpful expert, educational, conversational.
STRUCTURE:
- Hook with a relevant insight or tip
- 2-3 short paragraphs of actionable advice
- Subtle link to your content/product as "learn more"
- No hard sell
SUBJECT LINE STRATEGIES: How-to, numbered tips, contrarian insight
AVOID: Sales language, multiple CTAs, self-promotion focus`,

  upsell: `FRAMEWORK: Upgrade / Upsell
GOAL: Show the lead why upgrading or buying makes sense for THEM specifically.
TONE: Consultative, data-backed, confident but not pushy.
STRUCTURE:
- Reference their current usage or engagement
- Show what they are missing or could unlock
- Social proof (X users upgraded this month)
- Limited-time element if genuine
- Single strong CTA
SUBJECT LINE STRATEGIES: Personalized benefit, exclusivity, social proof
AVOID: Pressure tactics, fake scarcity, ignoring their current value`,

  reengagement: `FRAMEWORK: Re-engagement
GOAL: Bring inactive leads back with curiosity or value, not guilt.
TONE: Casual, curious, no-pressure.
STRUCTURE:
- Light "we noticed you have been away" (no guilt)
- Something new or improved since they were last active
- Quick-win CTA (low friction, high value)
- Option to update preferences or unsubscribe
SUBJECT LINE STRATEGIES: Question, curiosity gap, "we miss you" (done right)
AVOID: Guilt-tripping, long emails, multiple asks`,

  winback: `FRAMEWORK: Win-back
GOAL: Last attempt to re-engage before sunsetting the lead.
TONE: Direct, honest, slightly urgent.
STRUCTURE:
- Acknowledge the silence directly
- One compelling reason to come back
- Make it ridiculously easy (one-click action)
- Clear "or we will stop emailing you" disclaimer
SUBJECT LINE STRATEGIES: Break-up email, direct question, final offer
AVOID: Desperation, long explanations, multiple options`,

  promo: `FRAMEWORK: Promotional / Offer
GOAL: Drive conversion on a specific offer with urgency and relevance.
TONE: Excited but credible, benefit-focused.
STRUCTURE:
- Bold headline with the offer
- Why this matters to THEM (based on their quiz result/interests)
- Clear terms (what, how much, when it expires)
- Single prominent CTA button
- Urgency element (deadline, limited spots)
SUBJECT LINE STRATEGIES: Offer + deadline, personalized discount, exclusive access
AVOID: Bait-and-switch, hidden terms, excessive urgency`,

  announcement: `FRAMEWORK: Product / Feature Announcement
GOAL: Generate excitement about something new and drive exploration.
TONE: Proud, forward-looking, community-inclusive.
STRUCTURE:
- "Something new" hook
- What it is in one clear sentence
- Why it matters to the reader
- Visual or preview if possible
- CTA to try it / learn more
SUBJECT LINE STRATEGIES: Launch announcement, sneak peek, "you asked, we built"
AVOID: Technical jargon, feature lists without benefits, no CTA`,
};

// ---------------------------------------------------------------------------
// Subject line generation
// ---------------------------------------------------------------------------

export async function generateSubjectLines(
  goal: CampaignGoal,
  leadProfile: Partial<LeadProfile>,
  count: number
): Promise<SubjectLineResult> {
  if (!anthropic) {
    return { subjects: getStaticSubjects(goal, leadProfile, count) };
  }

  var prompt = 'Generate ' + count + ' email subject lines for a ' + goal.type + ' campaign.\n\n';
  prompt += 'BRAND: ' + goal.brand_name + '\n';
  if (goal.brand_voice) prompt += 'VOICE: ' + goal.brand_voice + '\n';
  if (goal.industry) prompt += 'INDUSTRY: ' + goal.industry + '\n';
  if (goal.product_name) prompt += 'PRODUCT: ' + goal.product_name + '\n';
  if (goal.offer_details) prompt += 'OFFER: ' + goal.offer_details + '\n';
  prompt += '\nRECIPIENT CONTEXT:\n';
  if (leadProfile.first_name) prompt += '- Name: ' + leadProfile.first_name + '\n';
  if (leadProfile.outcome_name) prompt += '- Quiz result: ' + leadProfile.outcome_name + '\n';
  if (leadProfile.lifecycle_stage) prompt += '- Stage: ' + leadProfile.lifecycle_stage + '\n';
  if (leadProfile.engagement_score !== undefined) prompt += '- Engagement: ' + leadProfile.engagement_score + '/100\n';

  prompt += '\nRULES:\n';
  prompt += '- Keep under 50 characters (6-10 words ideal)\n';
  prompt += '- Use lowercase start for casual/modern feel when appropriate\n';
  prompt += '- Include first name personalization via {{first_name}} where impactful\n';
  prompt += '- No spam trigger words (free, guarantee, act now, etc.)\n';
  prompt += '- No ALL CAPS\n';
  prompt += '- Use one emoji max, and only if brand voice allows it\n';
  prompt += '- Each subject should use a DIFFERENT psychological strategy\n';
  prompt += '\nReturn ONLY valid JSON array: [{"text": "...", "estimated_open_rate": "XX%", "strategy": "..."}]';

  try {
    var response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    var text = (response.content[0] as any).text || '';
    // Extract JSON from response
    var jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      var parsed = JSON.parse(jsonMatch[0]);
      return { subjects: parsed };
    }
  } catch (err: any) {
    log.error('[AIEmail] Subject generation failed', { error: err.message });
  }

  return { subjects: getStaticSubjects(goal, leadProfile, count) };
}

function getStaticSubjects(goal: CampaignGoal, lead: Partial<LeadProfile>, count: number) {
  var templates: Record<string, string[]> = {
    welcome: [
      'Welcome, {{first_name}} - here is what is next',
      '{{first_name}}, glad you are here',
      'Your ' + (goal.brand_name || '') + ' journey starts now',
    ],
    result_delivery: [
      '{{first_name}}, your results are ready',
      'Your quiz result: {{outcome_name}}',
      'We found something perfect for you, {{first_name}}',
    ],
    nurture: [
      'A quick tip based on your result',
      '{{first_name}}, thought you would find this useful',
      '3 things to try this week',
    ],
    upsell: [
      '{{first_name}}, unlock your next level',
      'You are missing out on this, {{first_name}}',
      'Upgrade your experience today',
    ],
    reengagement: [
      'It has been a while, {{first_name}}',
      'Something new since you were last here',
      'We saved your spot, {{first_name}}',
    ],
    winback: [
      'Should we stop sending these?',
      'One last thing before we go',
      '{{first_name}}, is this goodbye?',
    ],
    promo: [
      '{{first_name}}, this is for you',
      goal.offer_details || 'A special offer inside',
      'Exclusive: limited time only',
    ],
    announcement: [
      'Something new just launched',
      '{{first_name}}, check out what is new',
      'You asked, we built it',
    ],
  };

  var pool = templates[goal.type] || templates.welcome;
  return pool.slice(0, count).map(function(text, i) {
    return {
      text: text,
      estimated_open_rate: (25 + i * 3) + '%',
      strategy: ['personalization', 'curiosity', 'benefit'][i] || 'standard',
    };
  });
}

// ---------------------------------------------------------------------------
// Full email generation
// ---------------------------------------------------------------------------

export async function generateEmail(
  goal: CampaignGoal,
  leadProfile: Partial<LeadProfile>
): Promise<GeneratedEmail> {
  var framework = FRAMEWORK_PROMPTS[goal.type] || FRAMEWORK_PROMPTS.welcome;

  if (!anthropic) {
    return buildStaticEmail(goal, leadProfile, framework);
  }

  var prompt = 'You are a world-class SaaS email copywriter. Write a single email.\n\n';
  prompt += framework + '\n\n';
  prompt += 'BRAND: ' + goal.brand_name + '\n';
  if (goal.brand_voice) prompt += 'VOICE: ' + goal.brand_voice + '\n';
  if (goal.industry) prompt += 'INDUSTRY: ' + goal.industry + '\n';
  if (goal.product_name) prompt += 'PRODUCT: ' + goal.product_name + '\n';
  if (goal.offer_details) prompt += 'OFFER: ' + goal.offer_details + '\n';
  if (goal.cta_url) prompt += 'CTA URL: ' + goal.cta_url + '\n';
  if (goal.cta_text) prompt += 'CTA TEXT: ' + goal.cta_text + '\n';

  prompt += '\nRECIPIENT:\n';
  if (leadProfile.first_name) prompt += '- Name: ' + leadProfile.first_name + ' ' + (leadProfile.last_name || '') + '\n';
  if (leadProfile.quiz_name) prompt += '- Quiz taken: ' + leadProfile.quiz_name + '\n';
  if (leadProfile.outcome_name) prompt += '- Result: ' + leadProfile.outcome_name + '\n';
  if (leadProfile.outcome_description) prompt += '- Result meaning: ' + leadProfile.outcome_description + '\n';
  if (leadProfile.score !== null && leadProfile.score !== undefined) prompt += '- Score: ' + leadProfile.score + '\n';
  if (leadProfile.lifecycle_stage) prompt += '- Lifecycle: ' + leadProfile.lifecycle_stage + '\n';
  if (leadProfile.answers_summary) prompt += '- Answers: ' + leadProfile.answers_summary + '\n';

  prompt += '\nOUTPUT FORMAT (JSON only):\n';
  prompt += '{\n';
  prompt += '  "subject": "subject line under 50 chars",\n';
  prompt += '  "preview_text": "preview text under 90 chars",\n';
  prompt += '  "html_body": "HTML email body with inline styles, 600px max-width",\n';
  prompt += '  "plain_text": "plain text version"\n';
  prompt += '}\n\n';
  prompt += 'RULES:\n';
  prompt += '- Use merge tags: {{first_name}}, {{outcome_name}}, {{quiz_name}}, {{cta_url}}\n';
  prompt += '- Body should be 3-6 short paragraphs max\n';
  prompt += '- One primary CTA button, styled as inline-block with background #0D7377\n';
  prompt += '- Include unsubscribe footer text\n';
  prompt += '- No spam triggers. No ALL CAPS. Max one emoji.\n';
  prompt += '- Mobile-friendly: use system fonts, 16px body text\n';
  prompt += '- Return ONLY valid JSON, no markdown or backticks';

  try {
    var response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    var text = (response.content[0] as any).text || '';
    var jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      var parsed = JSON.parse(jsonMatch[0]);
      var spamScore = computeSpamScore(parsed.subject || '', parsed.html_body || parsed.plain_text || '');
      return {
        subject: parsed.subject || '',
        preview_text: parsed.preview_text || '',
        html_body: parsed.html_body || '',
        plain_text: parsed.plain_text || '',
        spam_score: spamScore,
        estimated_open_rate: spamScore < 20 ? '28-35%' : spamScore < 40 ? '20-28%' : '10-20%',
        tags: [goal.type, leadProfile.lifecycle_stage || 'unknown'].filter(Boolean),
      };
    }
  } catch (err: any) {
    log.error('[AIEmail] Email generation failed', { error: err.message });
  }

  return buildStaticEmail(goal, leadProfile, framework);
}

function buildStaticEmail(goal: CampaignGoal, lead: Partial<LeadProfile>, _framework: string): GeneratedEmail {
  var name = '{{first_name}}';
  var subject = name + ', your results are in';
  var ctaUrl = goal.cta_url || '{{cta_url}}';
  var ctaText = goal.cta_text || 'See your results';

  if (goal.type === 'welcome') {
    subject = 'Welcome, ' + name;
    ctaText = 'Get started';
  } else if (goal.type === 'reengagement') {
    subject = 'We have something new for you, ' + name;
    ctaText = 'Take a look';
  } else if (goal.type === 'promo') {
    subject = name + ', this is for you';
    ctaText = goal.cta_text || 'Claim your offer';
  }

  var html = '<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">';
  html += '<h1 style="margin:0 0 16px;font-size:24px">Hi ' + name + '</h1>';
  html += '<p style="margin:0 0 16px;color:#444;line-height:1.6">Thanks for taking {{quiz_name}}. ';
  html += 'Based on your answers, your result is <strong>{{outcome_name}}</strong>.</p>';
  html += '<a href="' + ctaUrl + '" style="display:inline-block;background:#0D7377;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600">' + ctaText + '</a>';
  html += '<p style="margin:24px 0 0;font-size:12px;color:#999">You are receiving this because you took our quiz. <a href="{{unsubscribeUrl}}" style="color:#999">Unsubscribe</a></p>';
  html += '</div>';

  var plainText = 'Hi ' + name + ',\n\nThanks for taking {{quiz_name}}. Your result: {{outcome_name}}.\n\n' + ctaText + ': ' + ctaUrl;

  var spamScore = computeSpamScore(subject, html);
  return {
    subject: subject,
    preview_text: 'Your personalized result is ready',
    html_body: html,
    plain_text: plainText,
    spam_score: spamScore,
    estimated_open_rate: '25-32%',
    tags: [goal.type],
  };
}

// ---------------------------------------------------------------------------
// A/B variant generation
// ---------------------------------------------------------------------------

export async function generateVariants(
  goal: CampaignGoal,
  leadProfile: Partial<LeadProfile>,
  variantCount: number
): Promise<EmailVariants> {
  if (!anthropic || variantCount < 2) {
    var baseEmail = await generateEmail(goal, leadProfile);
    return {
      variants: [{
        label: 'A',
        subject: baseEmail.subject,
        preview_text: baseEmail.preview_text,
        html_body: baseEmail.html_body,
        strategy: 'baseline',
      }],
    };
  }

  var strategies = [
    'Direct benefit — lead with the outcome value',
    'Curiosity gap — tease without revealing the answer',
    'Social proof — reference other users or results',
    'Question format — ask a relevant question',
    'Urgency/scarcity — time-sensitive angle (if genuine)',
  ];

  var prompt = 'Generate ' + variantCount + ' DISTINCT email variants for A/B testing.\n\n';
  prompt += 'CAMPAIGN: ' + goal.type + ' for ' + goal.brand_name + '\n';
  if (goal.product_name) prompt += 'PRODUCT: ' + goal.product_name + '\n';
  if (goal.offer_details) prompt += 'OFFER: ' + goal.offer_details + '\n';
  prompt += '\nEach variant must use a DIFFERENT psychological strategy:\n';
  for (var si = 0; si < Math.min(variantCount, strategies.length); si++) {
    prompt += 'Variant ' + String.fromCharCode(65 + si) + ': ' + strategies[si] + '\n';
  }
  prompt += '\nRecipient: ' + (leadProfile.first_name || 'subscriber') + ', lifecycle: ' + (leadProfile.lifecycle_stage || 'new') + '\n';
  prompt += '\nReturn JSON: {"variants": [{"label": "A", "subject": "...", "preview_text": "...", "html_body": "...", "strategy": "..."}]}';
  prompt += '\n\nSame rules as before: merge tags, one CTA (#0D7377), no spam, inline styles, 600px.';

  try {
    var response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    var text = (response.content[0] as any).text || '';
    var jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (err: any) {
    log.error('[AIEmail] Variant generation failed', { error: err.message });
  }

  var base = await generateEmail(goal, leadProfile);
  return {
    variants: [{
      label: 'A',
      subject: base.subject,
      preview_text: base.preview_text,
      html_body: base.html_body,
      strategy: 'baseline',
    }],
  };
}

// ---------------------------------------------------------------------------
// Spam safety check (public utility)
// ---------------------------------------------------------------------------

export function checkSpamSafety(subject: string, htmlBody: string): {
  score: number;
  issues: string[];
  verdict: 'safe' | 'warning' | 'dangerous';
} {
  var score = computeSpamScore(subject, htmlBody);
  var issues: string[] = [];

  // Check specific issues
  if (subject === subject.toUpperCase() && subject.length > 5) {
    issues.push('Subject is ALL CAPS - major spam signal');
  }
  var excl = (subject.match(/!/g) || []).length;
  if (excl > 1) issues.push('Multiple exclamation marks in subject');
  if (subject.length > 80) issues.push('Subject too long (>80 chars) - may truncate');
  if (subject.length < 10) issues.push('Subject too short (<10 chars) - low engagement');
  if (htmlBody.toLowerCase().indexOf('unsubscribe') === -1) {
    issues.push('Missing unsubscribe link - CAN-SPAM violation');
  }
  var urlCount = (htmlBody.match(/https?:\/\//g) || []).length;
  if (urlCount > 5) issues.push('Too many links (' + urlCount + ') - spam trigger');
  if (urlCount === 0) issues.push('No links in email - unusual for marketing email');

  SPAM_TRIGGERS.forEach(function(trigger) {
    if ((subject + ' ' + htmlBody).toLowerCase().indexOf(trigger) !== -1) {
      issues.push('Spam trigger word detected: "' + trigger + '"');
    }
  });

  var verdict: 'safe' | 'warning' | 'dangerous' = 'safe';
  if (score > 40) verdict = 'dangerous';
  else if (score > 15) verdict = 'warning';

  return { score: score, issues: issues, verdict: verdict };
}

// ---------------------------------------------------------------------------
// Optimal send time recommendation
// ---------------------------------------------------------------------------

export function recommendSendTime(
  leadEngagement: { hour_of_day: number; count: number }[],
  timezone?: string
): { hour: number; day_of_week: number; reasoning: string } {
  // Default: Tuesday 10am (industry standard best time)
  if (!leadEngagement || leadEngagement.length === 0) {
    return {
      hour: 10,
      day_of_week: 2,
      reasoning: 'Industry standard: Tuesday 10am has highest open rates across SaaS email benchmarks.',
    };
  }

  // Find the hour with most engagement
  var bestHour = 10;
  var bestCount = 0;
  for (var i = 0; i < leadEngagement.length; i++) {
    if (leadEngagement[i].count > bestCount) {
      bestCount = leadEngagement[i].count;
      bestHour = leadEngagement[i].hour_of_day;
    }
  }

  return {
    hour: bestHour,
    day_of_week: 2, // Tuesday default, override with actual data
    reasoning: 'Based on ' + bestCount + ' engagement events, recipients are most active at ' + bestHour + ':00.',
  };
}

// ---------------------------------------------------------------------------
// Campaign type auto-detection from lead lifecycle
// ---------------------------------------------------------------------------

export function detectCampaignType(lead: Partial<LeadProfile>): CampaignGoal['type'] {
  var stage = lead.lifecycle_stage || 'new';
  var engagement = lead.engagement_score || 0;
  var daysSinceSignup = lead.days_since_signup || 0;

  // New leads (0-3 days) → welcome
  if (stage === 'new' && daysSinceSignup <= 3) return 'welcome';

  // New leads with quiz result → result delivery
  if (stage === 'new' && lead.outcome_name) return 'result_delivery';

  // Highly engaged (score > 70) → upsell
  if (stage === 'hot' || engagement > 70) return 'upsell';

  // Moderately engaged → nurture
  if (stage === 'engaged' || (engagement > 30 && engagement <= 70)) return 'nurture';

  // Inactive (no opens in 30+ days) → re-engagement
  if (stage === 'inactive' || (daysSinceSignup > 30 && engagement < 20)) return 'reengagement';

  // Churned (60+ days inactive) → win-back
  if (stage === 'churned' || daysSinceSignup > 60 && engagement < 10) return 'winback';

  return 'nurture';
}
