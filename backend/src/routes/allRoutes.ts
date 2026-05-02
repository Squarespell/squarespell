import { Router } from 'express';
import crypto from 'crypto';
import { log } from '../lib/logger';
import { requireAuth, attachUser, AuthenticatedRequest } from '../middleware/auth';
import { guardQuizCreation, getPlanLimits } from '../middleware/planGuard';
import { generateQuiz, processOtherAnswer, generateOnboardingQuestions, generateTailoredQuiz, analyzeBusinessProfile, suggestQuizIdeas } from '../services/claudeService';
import { scrapeBrand, NotSquarespaceError } from '../services/brandScraper';
import { generateLeadInsight } from '../services/leadInsights';
import { sendResultEmail } from '../services/resultEmail';
import { isUnsubscribed, buildUnsubscribeHeaders, buildUnsubscribeUrl } from '../services/unsubscribe';
import { enqueueSequenceEmails, processEmailQueue } from '../services/emailSequence';
import { prefillAcuityLink } from '../services/integrations/acuity';
import { prefillCalendlyLink } from '../services/integrations/calendly';
import { runCleanup } from '../services/databaseCleanup';
import { processScheduledCampaigns } from '../services/scheduledSendDispatcher';
import { getRecommendations } from '../services/recommendations';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, notifyNewLead } from '../services/notifications';
import * as quizPaymentsService from '../services/quizPayments';
import { supabase } from '../db/supabaseClient';
import { encryptConfig, decryptConfig } from '../utils/encryption';
import { validateWebhookUrl } from '../utils/urlValidator';
import { logIntegrationError } from '../services/integrationErrorLog';
import { getReferralCode, trackReferral, convertReferral, getReferralStats, listReferrals } from '../services/referrals';
import { runAutoTagRules } from '../services/segmentation';
import { markPartialAsConverted } from '../services/partialCompletion';
import { processAutomationEvent } from '../services/automationEngine';
import { sendPlatformEmail } from '../services/platformEmails';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { UAParser } from 'ua-parser-js';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Canonical URLs used in outgoing emails. Set APP_URL/MARKETING_URL in env to swap domains.
const APP_URL = process.env.APP_URL || 'https://app.squarespell.com';
const MARKETING_URL = process.env.MARKETING_URL || 'https://squarespell.com';

function normalizeUrl(input: string): string {
  let url = input.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  new URL(url);
  return url;
}

/**
 * Calculate lead score from answers and quiz structure.
 */
function calculateLeadScore(quiz: any, answers: Record<number, number>): number | null {
  try {
    if (!quiz?.questions || typeof answers !== 'object') return null;
    let total = 0;
    Object.entries(answers).forEach(([qi, oi]) => {
      const qIdx = Number(qi);
      const oIdx = Number(oi);
      const question = quiz.questions[qIdx];
      const option = question?.options?.[oIdx];
      if (option?.score !== undefined) {
        total += Number(option.score);
      }
    });
    return total;
  } catch {
    return null;
  }
}

/**
 * Get score label based on quiz settings and score thresholds.
 */
function getScoreLabel(score: number | null, quiz: any): string {
  if (score === null || score === undefined) return 'Unknown';

  // For client_qualifier mode, check outcome score_threshold fields
  if (quiz?.settings?.mode === 'client_qualifier' && quiz?.outcomes) {
    const qualifiedOutcome = quiz.outcomes.find((o: any) => o.type === 'qualified' && o.score_threshold !== undefined);
    if (qualifiedOutcome) {
      const threshold = Number(qualifiedOutcome.score_threshold);
      if (score >= threshold) return 'Hot';
      if (score >= threshold * 0.5) return 'Warm';
      return 'Cold';
    }
  }

  // Default scoring ranges
  if (score >= 80) return 'Hot';
  if (score >= 50) return 'Warm';
  return 'Cold';
}

// ── Generate ──────────────────────────────────────────────────────────────────
export const generateRouter = Router();
generateRouter.post('/generate', requireAuth, attachUser, guardQuizCreation, async (req: AuthenticatedRequest, res) => {
  const { url, business_type, goal } = req.body;
  if (!url || !business_type || !goal) return res.status(400).json({ error: 'url, business_type, and goal required' });
  let normalizedUrl: string;
  try { normalizedUrl = normalizeUrl(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }
  try { res.json(await generateQuiz(normalizedUrl, business_type, goal)); }
  catch (err: any) { res.status(500).json({ error: err.message ?? 'Generation failed' }); }
});

// ── Save Preview Quiz (for users coming from /try → sign-up) ─────────────────
generateRouter.post('/save-preview', requireAuth, attachUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { quiz, brand, url } = req.body;
    if (!quiz || !url) return res.status(400).json({ error: 'quiz and url required' });

    const userId = req.dbUserId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    // Generate a unique slug
    const slug = (brand?.site_name || 'quiz')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30) + '-' + Math.random().toString(36).slice(2, 8);

    // Save the quiz. NOTE: the `quizzes` table has no `website_url` column  - 
    // we stash the source URL inside the `settings` JSONB instead.
    const { data, error } = await supabase.from('quizzes').insert({
      user_id: userId,
      title: quiz.title || 'My Quiz',
      slug,
      questions: quiz.questions || [],
      outcomes: quiz.outcomes || quiz.results || [],
      branding: {
        colors: brand?.colors || {},
        font_family: brand?.font_family || 'sans-serif',
        site_name: brand?.site_name || '',
        favicon_url: brand?.favicon_url || '',
      },
      settings: { ...(quiz.settings || {}), website_url: url },
      status: 'live',
    }).select('id, slug').single();

    if (error) throw error;
    res.json({ saved: true, quiz_id: data.id, slug: data.slug });
  } catch (err: any) {
    log.error('save-preview error:', { err: err });
    res.status(500).json({ error: 'Failed to save quiz' });
  }
});

// ── Preview drafts persistence (Supabase preview_drafts table) ───────────────
// Replaced the in-memory Map with durable Supabase storage so drafts survive
// backend restarts and work across multiple instances.
async function storePreviewDraft(claimToken: string, quiz: any, brand: any, url: string): Promise<void> {
  const { error } = await supabase.from('preview_drafts').insert({
    claim_token: claimToken, quiz, brand: brand || {}, url,
  });
  if (error) {
    log.error('[PreviewDraft] Insert failed:', { err: error.message });
    throw error;
  }
  // Async cleanup: delete unclaimed drafts older than 24 hours
  supabase.from('preview_drafts')
    .delete()
    .is('claimed_at', null)
    .lt('created_at', new Date(Date.now() - 86400000).toISOString())
    .then(({ error: cleanErr }) => {
      if (cleanErr) log.warn('[PreviewDraft] Cleanup error:', { detail: cleanErr.message });
    });
}

async function getPreviewDraft(claimToken: string): Promise<{ quiz: any; brand: any; url: string } | null> {
  const { data, error } = await supabase.from('preview_drafts')
    .select('quiz, brand, url')
    .eq('claim_token', claimToken)
    .is('claimed_at', null)
    .single();
  if (error || !data) return null;
  return data;
}

async function patchPreviewDraft(claimToken: string, quizUpdates: Record<string, any>): Promise<any | null> {
  const draft = await getPreviewDraft(claimToken);
  if (!draft) return null;
  const updated = { ...draft.quiz };
  const allowed = ['title', 'questions', 'outcomes', 'branding', 'settings'];
  for (const key of allowed) {
    if (quizUpdates[key] !== undefined) updated[key] = quizUpdates[key];
  }
  const { error } = await supabase.from('preview_drafts')
    .update({ quiz: updated })
    .eq('claim_token', claimToken)
    .is('claimed_at', null);
  if (error) return null;
  return updated;
}

async function markDraftClaimed(claimToken: string, userId: string): Promise<void> {
  await supabase.from('preview_drafts')
    .update({ claimed_at: new Date().toISOString(), claimed_by: userId })
    .eq('claim_token', claimToken);
}

// ── In-memory cache for onboarding sessions (stage 2 state) ──────────────────
// Keyed by session_token. Stores the scraped brand + the owner's answers so
// build-quiz can use them without re-scraping.
const previewSessionCache = new Map<string, { brand: any; url: string; onboarding_questions: any[]; answers: Record<string, string>; createdAt: number }>();

// Evict stale in-memory preview sessions every 30 minutes (24h TTL)
var PREVIEW_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
setInterval(function() {
  var now = Date.now();
  var evicted = 0;
  previewSessionCache.forEach(function(entry, key) {
    if (now - entry.createdAt > PREVIEW_SESSION_TTL_MS) {
      previewSessionCache.delete(key);
      evicted++;
    }
  });
  if (evicted > 0) console.log('[Cache] Evicted ' + evicted + ' stale in-memory preview sessions');
}, 30 * 60 * 1000);

// ── Public Preview Generate (no auth, rate-limited by IP via Redis) ──────────
import { previewLimiter, leadLimiter, publicQuizLimiter, getClientIp } from '../services/rateLimiter';
export const previewRouter = Router();
previewRouter.post('/preview-generate', async (req, res) => {
  // Rate limit via Redis-backed Upstash limiter (replaces in-memory Map)
  const ip = getClientIp(req);
  const { success: previewRlOk } = await previewLimiter.limit('preview:' + ip);
  if (!previewRlOk) return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  let normalizedUrl: string;
  try { normalizedUrl = normalizeUrl(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }

  try {
    // Step 1: Scrape brand
    log.info(`[Preview] Starting scrape for: ${normalizedUrl}`);
    const brand = await scrapeBrand(normalizedUrl);
    log.info(`[Preview] Scrape complete. Business summary: ${brand.business?.summary?.length || 0} chars`);

    // Step 2: Generate quiz with AI
    const quiz = await generateQuiz(normalizedUrl, 'general', 'Generate more leads', brand);
    log.info(`[Preview] Quiz generated: "${quiz.title}"`);

    // Step 3: Generate a claim token and persist draft to Supabase
    const claimToken = crypto.randomBytes(16).toString('hex');
    await storePreviewDraft(claimToken, quiz, brand, normalizedUrl);

    log.info(`[Preview] Quiz stored with claim token: ${claimToken.slice(0, 8)}...`);
    res.json({ brand, quiz, claim_token: claimToken });
  } catch (err: any) {
    if (err instanceof NotSquarespaceError) {
      log.warn('[Preview] Rejected non-Squarespace site', { hostname: err.hostname });
      return res.status(422).json({
        error: err.message,
        code: 'NOT_SQUARESPACE',
        hostname: err.hostname,
      });
    }
    log.error('[Preview] Generation failed:', { err: err });
    res.status(500).json({ error: err.message ?? 'Preview generation failed' });
  }
});

// ── Stage 1 → Stage 2: Analyze the site and return 5 onboarding questions ───
previewRouter.post('/preview-analyze', async (req, res) => {
  const ip = getClientIp(req);
  const { success: analyzeRlOk } = await previewLimiter.limit('analyze:' + ip);
  if (!analyzeRlOk) return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  let normalizedUrl: string;
  try { normalizedUrl = normalizeUrl(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }

  try {
    log.info(`[PreviewAnalyze] Scraping: ${normalizedUrl}`);
    const brand = await scrapeBrand(normalizedUrl);
    log.info(`[PreviewAnalyze] Scrape done. Summary: ${brand.business?.summary?.length || 0} chars`);

    // Run AI analysis and onboarding questions in parallel for speed
    const [{ questions: onboardingQuestions }, businessProfile] = await Promise.all([
      generateOnboardingQuestions(normalizedUrl, brand),
      analyzeBusinessProfile(normalizedUrl, brand),
    ]);
    log.info(`[PreviewAnalyze] Onboarding questions generated: ${onboardingQuestions.length}`);
    log.info(`[PreviewAnalyze] Business profile: ${JSON.stringify(businessProfile)}`);

    // Merge AI-analyzed business profile into brand object
    brand.business = {
      ...brand.business,
      type: businessProfile.type,
      audience: businessProfile.audience,
      tone: businessProfile.tone,
      key_offer: businessProfile.key_offer,
    };

    const sessionToken = crypto.randomBytes(16).toString('hex');
    previewSessionCache.set(sessionToken, {
      brand,
      url: normalizedUrl,
      onboarding_questions: onboardingQuestions,
      answers: {},
      createdAt: Date.now(),
    });
    for (const [k, v] of previewSessionCache.entries()) {
      if (Date.now() - v.createdAt > 86400000) previewSessionCache.delete(k);
    }

    res.json({ brand, onboarding_questions: onboardingQuestions, session_token: sessionToken, url: normalizedUrl });
  } catch (err: any) {
    if (err instanceof NotSquarespaceError) {
      log.warn('[PreviewAnalyze] Rejected non-Squarespace site', { hostname: err.hostname });
      return res.status(422).json({
        error: err.message,
        code: 'NOT_SQUARESPACE',
        hostname: err.hostname,
      });
    }
    log.error('[PreviewAnalyze] Failed:', { err: err });
    res.status(500).json({ error: err.message ?? 'Analyze failed' });
  }
});

// ── Stage 2 → Stage 3: Build the 10-question quiz using onboarding answers ───
previewRouter.post('/preview-build-quiz', async (req, res) => {
  const { session_token, answers } = req.body as { session_token?: string; answers?: Record<string, string> };
  if (!session_token) return res.status(400).json({ error: 'session_token required' });
  const session = previewSessionCache.get(session_token);
  if (!session) return res.status(404).json({ error: 'Session not found or expired. Please start again.' });

  if (answers && typeof answers === 'object') {
    session.answers = { ...session.answers, ...answers };
  }

  // New Option C flow: answers contain goal + AI-detected profile fields
  const goal = session.answers.goal || 'capture_leads';
  const businessType = session.answers.business_type || session.brand?.business?.type || 'unknown';
  const audience = session.answers.audience || session.brand?.business?.audience || 'unknown';
  const tone = session.answers.tone || session.brand?.business?.tone || 'unknown';
  const keyOffer = session.answers.key_offer || session.brand?.business?.key_offer || 'unknown';

  // Build onboarding pairs in the format generateTailoredQuiz expects
  const onboardingPairs: { question: string; answer: string }[] = [
    { question: 'What is the primary goal of this quiz?', answer: goal.replace(/_/g, ' ') },
    { question: 'What type of business is this?', answer: businessType },
    { question: 'Who is the target audience?', answer: audience },
    { question: 'What tone should the quiz use?', answer: tone },
    { question: 'What is the key product or service?', answer: keyOffer },
  ].filter(p => p.answer && p.answer !== 'unknown');

  try {
    log.info(`[PreviewBuildQuiz] Building quiz for ${session.url} | goal=${goal} | type=${businessType} | audience=${audience} | tone=${tone} | offer=${keyOffer}`);
    const quiz = await generateTailoredQuiz(session.url, session.brand, onboardingPairs);
    log.info(`[PreviewBuildQuiz] Quiz generated: "${quiz.title}"`);

    const claimToken = crypto.randomBytes(16).toString('hex');
    await storePreviewDraft(claimToken, quiz, session.brand, session.url);

    res.json({ quiz, brand: session.brand, claim_token: claimToken, url: session.url });
  } catch (err: any) {
    log.error('[PreviewBuildQuiz] Failed:', { err: err });
    res.status(500).json({ error: err.message ?? 'Quiz build failed' });
  }
});

// ── Patch a persisted draft quiz (edits made before sign up) ─────────────────
previewRouter.patch('/preview-quiz/:token', async (req, res) => {
  const token = req.params.token;
  const updated = await patchPreviewDraft(token, req.body);
  if (!updated) return res.status(404).json({ error: 'Draft not found or expired' });
  res.json({ ok: true, quiz: updated });
});

// ── Read a persisted draft quiz back (for stage 4 visitor preview) ────────────
previewRouter.get('/preview-quiz/:token', async (req, res) => {
  const token = req.params.token;
  const draft = await getPreviewDraft(token);
  if (!draft) return res.status(404).json({ error: 'Draft not found or expired' });
  res.json({ quiz: draft.quiz, brand: draft.brand, url: draft.url });
});

// ── Claim a preview quiz (save from Supabase draft to quizzes for authenticated user) ──
previewRouter.post('/claim-quiz', requireAuth, attachUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { claim_token, quiz: bodyQuiz, brand: bodyBrand, url: bodyUrl } = req.body;
    const userId = req.dbUserId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    if (!claim_token && !bodyQuiz) return res.status(400).json({ error: 'claim_token or quiz payload required' });

    // Look up quiz in Supabase preview_drafts, fall back to body payload
    let quiz: any, brand: any, url: string;
    const draft = claim_token ? await getPreviewDraft(claim_token) : null;
    if (draft) {
      quiz = draft.quiz; brand = draft.brand; url = draft.url;
    } else if (bodyQuiz && bodyUrl) {
      log.info('[Claim] Draft not found; using body payload fallback');
      quiz = bodyQuiz; brand = bodyBrand || {}; url = bodyUrl;
    } else {
      log.info('[Claim] Token not found and no fallback payload', { token: (claim_token || '').slice(0, 8) });
      return res.status(404).json({ error: 'Quiz not found or expired. Please generate a new one.' });
    }

    const slug = (brand?.site_name || 'quiz')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30) + '-' + Math.random().toString(36).slice(2, 8);

    const { data: saved, error: saveErr } = await supabase.from('quizzes').insert({
      user_id: userId,
      title: quiz.title || 'My Quiz',
      slug,
      questions: quiz.questions || [],
      outcomes: quiz.outcomes || quiz.results || [],
      branding: {
        colors: brand?.colors || {},
        font_family: brand?.font_family || 'sans-serif',
        site_name: brand?.site_name || '',
        favicon_url: brand?.favicon_url || '',
      },
      settings: { ...(quiz.settings || {}), website_url: url },
      status: 'live',
    }).select('id, slug').single();

    if (saveErr) {
      log.error('[Claim] Supabase insert error:', { err: saveErr });
      throw saveErr;
    }

    // Mark draft as claimed
    if (claim_token) await markDraftClaimed(claim_token, userId);

    log.info(`[Claim] Quiz ${saved.id} saved for user ${userId}, slug: ${saved.slug}`);
    res.json({ claimed: true, quiz_id: saved.id, slug: saved.slug });
  } catch (err: any) {
    log.error('[Claim] Error:', { err: err });
    res.status(500).json({ error: 'Failed to claim quiz', details: err?.message || String(err) });
  }
});

// ── Public Quiz ───────────────────────────────────────────────────────────────
export const publicQuizRouter = Router();
publicQuizRouter.get('/:slug', async (req, res) => {
  const key = req.params.slug;
  // Try slug first
  let { data } = await supabase
    .from('quizzes')
    .select('id,title,questions,outcomes,branding,settings,user_id')
    .eq('slug', key).eq('status', 'live').maybeSingle();
  // Fallback: treat the param as a quiz id (covers id-based shared links)
  if (!data) {
    const r = await supabase
      .from('quizzes')
      .select('id,title,questions,outcomes,branding,settings,user_id')
      .eq('id', key).eq('status', 'live').maybeSingle();
    data = r.data;
  }
  if (!data) return res.status(404).json({ error: 'Quiz not found' });

  // Check quiz scheduling — if enabled, verify current time is within publish window
  const quizSettings = (data.settings as any) || {};
  if (quizSettings.schedule_enabled) {
    const now = new Date();
    if (quizSettings.publish_at) {
      const publishDate = new Date(quizSettings.publish_at);
      if (now < publishDate) return res.status(404).json({ error: 'Quiz not yet available' });
    }
    if (quizSettings.unpublish_at) {
      const unpublishDate = new Date(quizSettings.unpublish_at);
      if (now > unpublishDate) return res.status(404).json({ error: 'Quiz is no longer available' });
    }
  }

  // Look up owner's plan for feature gating on the public result page
  var ownerPlan = 'free';
  if (data.user_id) {
    var { data: ownerData } = await supabase.from('users').select('plan').eq('id', data.user_id).single();
    if (ownerData) ownerPlan = ownerData.plan || 'free';
  }

  // Remove user_id from public response, add owner_plan
  var publicData = Object.assign({}, data, { owner_plan: ownerPlan });
  delete (publicData as any).user_id;

  res.json(publicData);
});
publicQuizRouter.post('/:slug/event', async (req, res) => {
  // Rate limit: 30 events per minute per IP per quiz
  var eventIp = getClientIp(req);
  var { success: eventRlOk } = await publicQuizLimiter.limit('event:' + eventIp + ':' + req.params.slug);
  if (!eventRlOk) return res.status(429).json({ error: 'Rate limit exceeded' });

  const { event_type, session_id, metadata } = req.body;
  const { data: quiz } = await supabase.from('quizzes').select('id').eq('slug', req.params.slug).single();
  if (!quiz) return res.status(404).json({ error: 'Not found' });
  const userAgent = req.headers['user-agent'] || '';
  const isBot = /bot|crawl|spider|slurp|facebookexternalhit|bingpreview|googlebot|yandex|baiduspider|duckduckbot|semrush|ahrefs|mj12bot|petalbot|bytespider|gptbot|claudebot|applebot|twitterbot|linkedinbot|whatsapp|telegrambot|headless|phantom|puppeteer|playwright|selenium/i.test(userAgent);
  const eventMeta = { ...(metadata ?? {}), ...(isBot ? { is_bot: true } : {}) };
  await supabase.from('analytics_events').insert({ quiz_id: quiz.id, event_type, session_id, metadata: eventMeta });
  if (event_type === 'view') await supabase.rpc('increment_view_count', { qid: quiz.id });
  res.json({ tracked: true });
});
publicQuizRouter.post('/:slug/process-other', async (req, res) => {
  const { free_text, available_outcomes } = req.body;
  if (!free_text || !available_outcomes) return res.status(400).json({ error: 'free_text and available_outcomes required' });
  try { res.json(await processOtherAnswer(free_text, available_outcomes)); }
  catch { res.json({ matched_outcome_id: available_outcomes[0]?.id ?? '', personalised_insight: '' }); }
});

// ── Leads ─────────────────────────────────────────────────────────────────────
export const leadsRouter = Router();
leadsRouter.post('/quiz/:slug/lead', async (req, res) => {
  // Rate limit: 3 leads per minute per IP per quiz
  var leadIp = getClientIp(req);
  var { success: leadRlOk } = await leadLimiter.limit('lead:' + leadIp + ':' + req.params.slug);
  if (!leadRlOk) return res.status(429).json({ error: 'Rate limit exceeded' });

  const { name, email, answers, outcome_id, time_to_complete_ms, consent, consent_text, session_id: quizSessionId } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  const { data: quiz } = await supabase.from('quizzes').select('id,user_id,title,questions,outcomes,branding,settings,mode').eq('slug', req.params.slug).eq('status', 'live').single();
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  const { data: owner } = await supabase.from('users').select('plan,brand_kit').eq('id', quiz.user_id).single();
  const { leads: leadLimit } = getPlanLimits(owner?.plan ?? 'free');

  const metadata: Record<string, any> = {};
  if (typeof time_to_complete_ms === 'number') {
    metadata.time_to_complete_ms = time_to_complete_ms;
  }

  // Parse User-Agent and extract device info
  const userAgent = req.headers['user-agent'] || '';
  const parser = new UAParser(userAgent);
  const ua = parser.getResult();
  if (ua.device.type) {
    metadata.device_type = ua.device.type;
  }
  if (ua.browser.name) {
    metadata.browser = ua.browser.name;
  }
  if (ua.os.name) {
    metadata.os = ua.os.name;
  }

  // Snapshot outcome title+description so leads survive outcome edits/deletions
  var outcomeTitle: string | null = null;
  var outcomeDescription: string | null = null;
  if (outcome_id) {
    var outcomes = (quiz.outcomes as any[]) || [];
    var matchedOutcome = outcomes.find(function(o: any) { return o.id === outcome_id; });
    if (matchedOutcome) {
      outcomeTitle = matchedOutcome.title || null;
      outcomeDescription = matchedOutcome.description || null;
    }
  }

  // Store outcome snapshot in metadata for resilience against outcome edits
  if (outcomeTitle) metadata.outcome_title = outcomeTitle;
  if (outcomeDescription) metadata.outcome_description = outcomeDescription;

  // Atomic lead insert with limit check — prevents race condition (C4 fix)
  const { data: leadResult, error } = await supabase.rpc('insert_lead_with_limit_check', {
    p_quiz_id: quiz.id,
    p_user_id: quiz.user_id,
    p_name: name ?? null,
    p_email: email,
    p_answers: answers ?? {},
    p_outcome_id: outcome_id ?? null,
    p_metadata: metadata,
    p_consent: consent === true,
    p_consent_text: consent ? (consent_text || null) : null,
    p_lead_limit: leadLimit,
  });

  if (error) {
    if (error.message && error.message.includes('LEAD_LIMIT_REACHED')) {
      return res.status(403).json({ error: 'Lead limit reached' });
    }
    return res.status(500).json({ error: error.message });
  }

  var leadData = Array.isArray(leadResult) ? leadResult[0] : leadResult;
  const leadId = leadData?.lead_id;
  await supabase.rpc('increment_lead_count', { qid: quiz.id });

  const { data: ownerUser } = await supabase.from('users').select('email,brand_kit').eq('id', quiz.user_id).single();

  // Send email notification to quiz owner
  if (resend) {
    try {
      const notifyEmail = ownerUser?.email;
      if (notifyEmail) {
        const { data: quizInfo } = await supabase.from('quizzes').select('title').eq('id', quiz.id).single();
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'Squarespell <hello@squarespell.com>',
          to: notifyEmail,
          subject: `New lead captured: ${name || email}`,
          html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#07090c;color:#f0f2f5;border-radius:12px"><h2 style="color:#D2FF1D;font-size:20px;margin:0 0 16px">New lead captured!</h2><table style="width:100%;border-collapse:collapse"><tr><td style="padding:8px 0;color:#888;font-size:14px">Name</td><td style="padding:8px 0;color:#f0f2f5;font-size:14px">${name || ' - '}</td></tr><tr><td style="padding:8px 0;color:#888;font-size:14px">Email</td><td style="padding:8px 0;color:#f0f2f5;font-size:14px">${email}</td></tr><tr><td style="padding:8px 0;color:#888;font-size:14px">Quiz</td><td style="padding:8px 0;color:#f0f2f5;font-size:14px">${quizInfo?.title || 'Your quiz'}</td></tr><tr><td style="padding:8px 0;color:#888;font-size:14px">Date</td><td style="padding:8px 0;color:#f0f2f5;font-size:14px">${new Date().toLocaleDateString()}</td></tr></table><a href="${APP_URL}/dashboard" style="display:inline-block;margin-top:20px;background:#D2FF1D;color:#07090c;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">View in dashboard →</a></div>`,
        });
      }
    } catch (e) { log.info('Email notification failed:', { detail: e }); }
  }

  // In-app notification (non-blocking)
  try {
    var quizTitleForNotif = '';
    var { data: qInfoNotif } = await supabase.from('quizzes').select('title').eq('id', quiz.id).single();
    quizTitleForNotif = qInfoNotif?.title || 'Your quiz';
    notifyNewLead(quiz.user_id, email, quizTitleForNotif, quiz.id).catch(function(e: any) {
      log.info('[Notification] Failed to notify new lead:', { detail: e?.message });
    });
  } catch (notifErr: any) {
    log.info('[Notification] Error setting up notification:', { detail: (notifErr as any)?.message });
  }

  // Mark partial completion as converted (non-blocking)
  if (leadId && quizSessionId) {
    markPartialAsConverted(quiz.id, quizSessionId, leadId).catch(function(e: any) {
      log.info('[PartialCompletion] Mark converted failed', { leadId, err: e?.message });
    });
  }

  // Auto-tag lead based on user's rules (non-blocking)
  if (leadId) {
    runAutoTagRules(leadId, quiz.user_id, quiz.id).catch(function(e: any) {
      log.info('[Segmentation] Auto-tag failed', { leadId, err: e?.message });
    });
  }

  // Fire automation rules for lead_created event (non-blocking)
  if (leadId) {
    processAutomationEvent({
      event_type: 'lead_created',
      lead_id: leadId,
      user_id: quiz.user_id,
      quiz_id: quiz.id,
      lead_email: email,
      lead_name: name,
      outcome_id: outcome_id,
      score: leadData?.lead_score ?? null,
      answers: answers,
    }).catch(function(e: any) {
      log.info('[Automation] lead_created processing failed', { leadId, err: e?.message });
    });
  }

  // GDPR gate: skip all outbound emails if consent is required but not given
  const gdprEnabled = (quiz.settings as any)?.gdpr_consent_enabled === true;
  const hasConsent = consent === true;
  const canEmail = !gdprEnabled || hasConsent;

  // Send result email to the LEAD (not the owner). Includes download-report link.
  if (leadId && email && canEmail) {
    try {
      const matchedOutcome = outcome_id && quiz.outcomes
        ? (quiz.outcomes as any[]).find((o: any) => o.id === outcome_id)
        : null;
      if (matchedOutcome) {
        const reportEnabled = (quiz.settings as any)?.report_enabled === true;
        let ctaUrl = matchedOutcome.cta_url || (quiz.branding as any)?.ctaUrl;
        const ctaText = matchedOutcome.cta_text || 'Learn More';
        // Prefill scheduling links with lead info
        const ctaType = matchedOutcome.cta_type;
        if (ctaUrl && (ctaType === 'scheduling' || ctaType === 'acuity')) {
          ctaUrl = prefillAcuityLink(ctaUrl, name || '', email);
        } else if (ctaUrl && ctaType === 'calendly') {
          ctaUrl = prefillCalendlyLink(ctaUrl, name || '', email);
        }
        sendResultEmail({
          to: email,
          quizTitle: quiz.title,
          outcomeTitle: matchedOutcome.title || 'Your Result',
          outcomeDescription: matchedOutcome.description || '',
          ctaUrl,
          ctaText,
          branding: { ...(ownerUser?.brand_kit || {}), ...((quiz.branding as any) || {}) },
          reportEnabled,
          leadId,
          ownerEmail: ownerUser?.email,
          quizId: quiz.id,
        }).catch((e: any) => log.info('[ResultEmail] send failed', { err: e?.message }));
      }
    } catch (e) { log.info('[ResultEmail] setup failed', { err: e }); }
  } else if (!canEmail) {
    log.info('[GDPR] Skipping result email - no consent', { email });
  }

  if (leadId && email && outcome_id && canEmail) {
    enqueueSequenceEmails(
      leadId,
      quiz.id,
      outcome_id,
      leadData?.lead_score ?? null,
      [],
      (quiz as any).mode || null,
    ).catch((e: any) => log.info('[EmailSeq] enqueue failed', { err: e?.message }));
  } else if (!canEmail && outcome_id) {
    log.info('[GDPR] Skipping sequence emails - no consent', { email });
  }

  // Fire all integrations: webhooks, Mailchimp, Klaviyo, ConvertKit, Google Sheets
  try {
    const { data: integrations } = await supabase.from('integrations').select('id,type,config').eq('user_id', quiz.user_id).eq('active', true);
    if (integrations && integrations.length > 0) {
      const { data: quizMeta } = await supabase.from('quizzes').select('title,slug,mode').eq('id', quiz.id).single();
      const webhookPayload = {
        event: 'lead.captured',
        lead: { name: name ?? '', email, outcome_id: outcome_id ?? '', answers: answers ?? {}, captured_at: new Date().toISOString() },
        quiz: { id: quiz.id, title: quizMeta?.title ?? '', slug: quizMeta?.slug ?? '' },
      };

      // Determine outcome title for tags
      const matchedOutcomeForTag = outcome_id && quiz.outcomes
        ? (quiz.outcomes as any[]).find(function(o: any) { return o.id === outcome_id; })
        : null;
      const outcomeTags = matchedOutcomeForTag ? ['sq:' + (quizMeta?.slug ?? ''), 'outcome:' + (matchedOutcomeForTag.title || 'unknown')] : ['sq:' + (quizMeta?.slug ?? '')];

      for (const integration of integrations) {
        // Decrypt sensitive config fields before use
        var decConfig = decryptConfig(integration.config || {});

        // Check quiz_id mapping — if integration has quiz_ids, only fire for matching quizzes
        if (decConfig.quiz_ids && Array.isArray(decConfig.quiz_ids) && decConfig.quiz_ids.length > 0) {
          if (!decConfig.quiz_ids.includes(quiz.id)) continue;
        }

        if (integration.type === 'webhook' && decConfig.url) {
          // Validate webhook URL to prevent SSRF
          var webhookUrlErr = validateWebhookUrl(decConfig.url);
          if (webhookUrlErr) {
            logIntegrationError(integration.id, integration.type, quiz.user_id, quiz.id, 'SSRF blocked: ' + webhookUrlErr).catch(function() {});
            continue;
          }
          fetch(decConfig.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(webhookPayload) })
            .then(function(resp) {
              if (!resp.ok) {
                logIntegrationError(integration.id, integration.type, quiz.user_id, quiz.id, 'Webhook HTTP ' + resp.status).catch(function() {});
              }
            })
            .catch(function(e: any) {
              logIntegrationError(integration.id, integration.type, quiz.user_id, quiz.id, e?.message || 'Webhook fetch failed').catch(function() {});
            });
        } else if (integration.type === 'mailchimp' || integration.type === 'klaviyo' || integration.type === 'convertkit') {
          // Push to email marketing platform via integration service
          const { pushLeadToIntegration } = await import('../services/integrations/index');
          pushLeadToIntegration(
            { type: integration.type, config: decConfig },
            { email, firstName: name ?? '', tags: outcomeTags, metadata: { quiz_title: quizMeta?.title ?? '', outcome: matchedOutcomeForTag?.title ?? '', score: leadData?.lead_score ?? null } }
          ).then(function(result) {
            if (!result.success) {
              log.info('[Integration] ' + integration.type + ' push failed:', { detail: result.error });
              logIntegrationError(integration.id, integration.type, quiz.user_id, quiz.id, result.error || 'Unknown push failure').catch(function() {});
            } else {
              log.info('[Integration] ' + integration.type + ' push success for:', { detail: email });
            }
          }).catch(function(e: any) {
            log.info('[Integration] ' + integration.type + ' error:', { detail: e?.message });
            logIntegrationError(integration.id, integration.type, quiz.user_id, quiz.id, e?.message || 'Integration exception').catch(function() {});
          });
        } else if (integration.type === 'google_sheets' && decConfig.spreadsheet_id) {
          // Push to Google Sheets
          const { appendLeadToSheet } = await import('../services/integrations/googleSheets');
          appendLeadToSheet(
            { spreadsheet_id: decConfig.spreadsheet_id, service_account_json: decConfig.service_account_json || '', sheet_name: decConfig.sheet_name },
            { timestamp: new Date().toISOString(), email, name: name ?? '', quiz_name: quizMeta?.title ?? '', mode: (quizMeta as any)?.mode || 'lead_quiz', outcome: matchedOutcomeForTag?.title ?? '', score: leadData?.lead_score ?? undefined, answers: answers ?? {} }
          ).catch(function(e: any) {
            log.info('[GoogleSheets] push failed:', { detail: e?.message });
            logIntegrationError(integration.id, integration.type, quiz.user_id, quiz.id, e?.message || 'Google Sheets push failed').catch(function() {});
          });
        }
      }
    }
  } catch (e) { log.info('Integration dispatch failed:', { detail: e }); }

  
  // Generate AI lead insights (non-blocking)
  if (leadId && (quiz.settings as any)?.generate_ai_insights !== false) {
    try {
      // Convert answers to Q&A summary for Claude
      const answersSummary: Array<{ question: string; answer: string }> = [];
      if (quiz.questions && Array.isArray(quiz.questions) && answers) {
        Object.entries(answers).forEach(([qIdx, aIdx]) => {
          const qIndex = Number(qIdx);
          const aIndex = Number(aIdx);
          const question = (quiz as any).questions[qIndex];
          const selectedOption = question?.options?.[aIndex];
          if (question && selectedOption) {
            answersSummary.push({
              question: question.text || '',
              answer: selectedOption.text || ''
            });
          }
        });
      }

      // Find matched outcome for context
      const matchedOutcome = outcome_id && quiz.outcomes
        ? (quiz.outcomes as any[]).find((o: any) => o.id === outcome_id)
        : null;

      if (answersSummary.length > 0) {
        generateLeadInsight(
          quiz.title,
          (quiz as any).mode || 'lead_quiz',
          answersSummary,
          matchedOutcome?.title || 'No specific outcome',
          leadData.lead_score ?? undefined
        ).then((aiSummary) => {
          if (aiSummary && leadId) {
            (async () => {
              try {
                const { error } = await supabase
                  .from('leads')
                  .update({
                    metadata: {
                      ...(leadData?.lead_metadata || metadata),
                      ai_summary: aiSummary
                    }
                  })
                  .eq('id', leadId);
                if (error) {
                  log.info('[LeadInsights] Failed to store:', { detail: error.message });
                } else {
                  log.info('[LeadInsights] Stored for lead:', { detail: leadId });
                }
              } catch (err: any) {
                log.info('[LeadInsights] Store error:', { detail: err });
              }
            })();
          }
        }).catch((err: any) => {
          log.info('[LeadInsights] Gen error:', { detail: err });
        });
      }
    } catch (e) {
      log.info('[LeadInsights] Setup error:', { detail: e });
    }
  }


  res.status(201).json({ success: true, lead_id: leadId });
});

// GET /api/leads - list all leads for the authenticated user across every
// quiz they own, joined with quiz title + slug. Used by the /dashboard/leads
// unified inbox.
leadsRouter.get('/leads', requireAuth, attachUser, async (req: AuthenticatedRequest, res) => {
  try {
    var limit = Math.min(parseInt((req.query.limit as string) || '200', 10) || 200, 1000);
    var query = supabase
      .from('leads')
      .select('id, name, email, answers, outcome_id, created_at, quiz_id, metadata, quizzes(id, title, slug)')
      .eq('user_id', req.dbUserId)
      .order('created_at', { ascending: false })
      .limit(limit);
    // Optional: only return leads newer than a given timestamp (for polling)
    var since = req.query.since as string;
    if (since) {
      query = query.gt('created_at', since);
    }
    var { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to load leads' });
  }
});

// GET /api/leads/:id - fetch single lead detail with full quiz and metadata
leadsRouter.get('/leads/:id', requireAuth, attachUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select(`
        id,
        name,
        email,
        answers,
        outcome_id,
        score,
        created_at,
        qualified,
        path_taken,
        calculated_price,
        metadata,
        quiz_id,
        quizzes(id, title, slug, mode, questions, outcomes, branding, settings, user_id)
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Verify user owns this lead's quiz
    if ((lead.quizzes as any)?.user_id !== req.dbUserId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Enrich with score_label
    const enrichedLead = {
      ...lead,
      score_label: getScoreLabel(lead.score, lead.quizzes)
    };

    res.json(enrichedLead);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to load lead' });
  }
});

// GDPR data deletion — two-step: request token via email, then confirm with token.
// Step 1: Request deletion — sends verification email with a token
leadsRouter.post('/gdpr/delete-request', async (req, res) => {
  const { email, quiz_slug } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  // Rate limit: 3 requests per hour per IP
  var gdprIp = ((req.headers['x-forwarded-for'] as string) || req.ip || 'unknown').split(',')[0].trim();
  var { success: rlSuccess } = await (await import('../services/rateLimiter')).leadLimiter.limit('gdpr:' + gdprIp);
  if (!rlSuccess) return res.status(429).json({ error: 'Too many requests. Please try again later.' });

  try {
    // Generate a secure verification token
    var deleteToken = crypto.randomBytes(32).toString('hex');
    var expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour expiry

    // Store the token
    await supabase.from('gdpr_deletion_requests').insert({
      email: email,
      quiz_slug: quiz_slug || null,
      token: deleteToken,
      expires_at: expiresAt,
      confirmed: false,
    });

    // Send verification email (if Resend is configured)
    if (resend) {
      var confirmUrl = APP_URL + '/api/gdpr/confirm-delete?token=' + deleteToken;
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'Squarespell <hello@squarespell.com>',
        to: email,
        subject: 'Confirm your data deletion request',
        html: '<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px"><h2 style="font-size:20px;margin:0 0 16px">Data Deletion Request</h2><p>We received a request to delete your quiz data. Click the button below to confirm.</p><p>This link expires in 1 hour.</p><a href="' + confirmUrl + '" style="display:inline-block;margin-top:16px;background:#0D7377;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Confirm Deletion</a><p style="margin-top:24px;color:#888;font-size:12px">If you did not request this, you can safely ignore this email.</p></div>',
      });
    }

    // Always return success to prevent email enumeration
    res.json({ success: true, message: 'If this email has quiz data, a verification email has been sent. Please check your inbox.' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to process deletion request' });
  }
});

// Step 2: Confirm deletion with token
leadsRouter.get('/gdpr/confirm-delete', async (req, res) => {
  var token = req.query.token as string;
  if (!token) return res.status(400).json({ error: 'token required' });

  try {
    // Look up the token
    var { data: request } = await supabase.from('gdpr_deletion_requests')
      .select('id, email, quiz_slug, expires_at, confirmed')
      .eq('token', token)
      .single();

    if (!request) return res.status(404).json({ error: 'Invalid or expired deletion token' });
    if (request.confirmed) return res.status(400).json({ error: 'This deletion request has already been processed' });
    if (new Date(request.expires_at) < new Date()) return res.status(410).json({ error: 'This deletion link has expired. Please submit a new request.' });

    // Perform the actual deletion
    if (request.quiz_slug) {
      var { data: quiz } = await supabase.from('quizzes').select('id,settings').eq('slug', request.quiz_slug).single();
      if (quiz) {
        var settings = (quiz.settings as any) || {};
        if (settings.gdpr_consent_enabled && settings.gdpr_allow_deletion === false) {
          return res.status(403).json({ error: 'Data deletion is not enabled for this quiz' });
        }
        await supabase.from('leads').delete().eq('quiz_id', quiz.id).eq('email', request.email);
      }
    } else {
      await supabase.from('leads').delete().eq('email', request.email);
    }

    // Mark token as used
    await supabase.from('gdpr_deletion_requests').update({ confirmed: true }).eq('id', request.id);

    // Return a user-friendly HTML page
    res.setHeader('Content-Type', 'text/html');
    res.send('<html><body style="font-family:system-ui,sans-serif;max-width:480px;margin:80px auto;text-align:center"><h2>Data Deleted</h2><p>Your quiz data has been successfully removed.</p></body></html>');
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to process deletion' });
  }
});

// ── Integrations ─────────────────────────────────────────────────────────────
export const integrationsRouter = Router();
integrationsRouter.use(requireAuth, attachUser);

integrationsRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const { data, error } = await supabase.from('integrations').select('id,type,config,active,created_at').eq('user_id', req.dbUserId).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  // Decrypt sensitive fields before sending to client
  var decryptedData = (data ?? []).map(function(row: any) {
    return { ...row, config: decryptConfig(row.config || {}) };
  });
  res.json(decryptedData);
});

integrationsRouter.post('/', async (req: AuthenticatedRequest, res) => {
  const { type, config } = req.body;
  if (!type || !config) return res.status(400).json({ error: 'type and config required' });
  if (type === 'webhook') {
    if (!config.url) return res.status(400).json({ error: 'Webhook URL required' });
    var urlError = validateWebhookUrl(config.url);
    if (urlError) return res.status(400).json({ error: urlError });
  }
  // Encrypt sensitive fields before storing
  var encryptedConfig = encryptConfig(config);
  const { data, error } = await supabase.from('integrations').insert({ user_id: req.dbUserId, type, config: encryptedConfig, active: true }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  // Return decrypted config to client
  res.status(201).json({ ...data, config: decryptConfig(data.config || {}) });
});

integrationsRouter.patch('/:id', async (req: AuthenticatedRequest, res) => {
  const allowed = ['config', 'active'];
  const updates: Record<string, any> = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  // Encrypt config if being updated
  if (updates.config) {
    if (updates.config.url) {
      var urlErr = validateWebhookUrl(updates.config.url);
      if (urlErr) return res.status(400).json({ error: urlErr });
    }
    updates.config = encryptConfig(updates.config);
  }
  const { data, error } = await supabase.from('integrations').update(updates).eq('id', req.params.id).eq('user_id', req.dbUserId).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ...data, config: decryptConfig(data.config || {}) });
});

integrationsRouter.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const { error } = await supabase.from('integrations').delete().eq('id', req.params.id).eq('user_id', req.dbUserId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

integrationsRouter.post('/test/:id', async (req: AuthenticatedRequest, res) => {
  const { data: integration } = await supabase.from('integrations').select('type,config').eq('id', req.params.id).eq('user_id', req.dbUserId).single();
  if (!integration) return res.status(404).json({ error: 'Integration not found' });
  // Decrypt config before testing
  var decTestConfig = decryptConfig(integration.config || {});
  if (integration.type === 'webhook' && decTestConfig.url) {
    try {
      var webhookTestErr = validateWebhookUrl(decTestConfig.url);
      if (webhookTestErr) return res.status(400).json({ success: false, error: webhookTestErr });
      const testPayload = { event: 'test', lead: { name: 'Test User', email: 'test@example.com', outcome_id: 'test', answers: {}, captured_at: new Date().toISOString() }, quiz: { id: 'test', title: 'Test Quiz', slug: 'test' } };
      const response = await fetch(decTestConfig.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(testPayload) });
      res.json({ success: response.ok, status: response.status });
    } catch (e: any) { res.json({ success: false, error: e.message }); }
  } else if (integration.type === 'mailchimp' || integration.type === 'klaviyo' || integration.type === 'convertkit') {
    try {
      const { pushLeadToIntegration } = await import('../services/integrations/index');
      const result = await pushLeadToIntegration(
        { type: integration.type, config: decTestConfig },
        { email: 'test@squarespell.com', firstName: 'Test', tags: ['sq:test'], metadata: { quiz_title: 'Test Quiz', outcome: 'Test Outcome' } }
      );
      res.json(result);
    } catch (e: any) { res.json({ success: false, error: e.message }); }
  } else {
    res.status(400).json({ error: 'Unsupported integration type for testing' });
  }
});

// Fetch lists/audiences from email platforms (for setup UI)
integrationsRouter.post('/lists', async (req: AuthenticatedRequest, res) => {
  const { type, apiKey } = req.body;
  if (!type || !apiKey) return res.status(400).json({ error: 'type and apiKey required' });

  try {
    if (type === 'mailchimp') {
      const dc = apiKey.split('-').pop();
      if (!dc) return res.status(400).json({ error: 'Invalid Mailchimp API key' });
      const response = await fetch('https://' + dc + '.api.mailchimp.com/3.0/lists?count=100&fields=lists.id,lists.name,lists.stats.member_count', {
        headers: { 'Authorization': 'Bearer ' + apiKey },
      });
      if (!response.ok) return res.status(400).json({ error: 'Invalid Mailchimp API key' });
      const data = await response.json() as any;
      res.json({ lists: (data.lists || []).map(function(l: any) { return { id: l.id, name: l.name, member_count: l.stats?.member_count ?? 0 }; }) });
    } else if (type === 'klaviyo') {
      const response = await fetch('https://a.klaviyo.com/api/lists/', {
        headers: { 'Authorization': 'Klaviyo-API-Key ' + apiKey, 'revision': '2024-02-15' },
      });
      if (!response.ok) return res.status(400).json({ error: 'Invalid Klaviyo API key' });
      const data = await response.json() as any;
      res.json({ lists: (data.data || []).map(function(l: any) { return { id: l.id, name: l.attributes?.name ?? l.id }; }) });
    } else if (type === 'convertkit') {
      const response = await fetch('https://api.convertkit.com/v3/forms?api_key=' + apiKey);
      if (!response.ok) return res.status(400).json({ error: 'Invalid ConvertKit API key' });
      const data = await response.json() as any;
      res.json({ lists: (data.forms || []).map(function(f: any) { return { id: String(f.id), name: f.name }; }) });
    } else {
      res.status(400).json({ error: 'Unsupported type' });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch lists' });
  }
});

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsRouter = Router();
analyticsRouter.use(requireAuth, attachUser);

// ── Integration Error Monitoring (H3) ────────────────────────────────────────
integrationsRouter.get('/errors', async (req: AuthenticatedRequest, res) => {
  try {
    var { getIntegrationErrors } = await import('../services/integrationErrorLog');
    var errors = await getIntegrationErrors(req.dbUserId!, 50);
    res.json(errors);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to fetch integration errors' });
  }
});

integrationsRouter.delete('/errors', async (req: AuthenticatedRequest, res) => {
  try {
    var { clearIntegrationErrors } = await import('../services/integrationErrorLog');
    await clearIntegrationErrors(req.dbUserId!, req.query.integration_id as string);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to clear errors' });
  }
});

// ── Attribution pipeline ─────────────────────────────────────────────────────
// GET /api/analytics/attribution - cross-quiz attribution data
// Returns per-quiz and per-outcome metrics: leads, emails sent/opened/clicked, revenue
analyticsRouter.get('/attribution', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.dbUserId;

    // Get all user's quizzes
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id, title, outcomes, view_count, lead_count')
      .eq('user_id', userId)
      .is('archived_at', null);

    if (!quizzes || quizzes.length === 0) {
      return res.json({ quizzes: [], totals: { leads: 0, emails_sent: 0, emails_opened: 0, emails_clicked: 0, revenue_cents: 0 } });
    }

    const quizIds = quizzes.map((q: any) => q.id);

    // Get lead counts per quiz + outcome
    const { data: leads } = await supabase
      .from('leads')
      .select('id, quiz_id, outcome_id')
      .in('quiz_id', quizIds);

    // Get email send stats: join sends through campaigns with source_quiz_id
    const { data: campaigns } = await supabase
      .from('email_campaigns')
      .select('id, source_quiz_id')
      .in('source_quiz_id', quizIds);

    const campaignIds = (campaigns || []).map((c: any) => c.id);
    const campaignQuizMap: Record<string, string> = {};
    for (const c of campaigns || []) {
      if (c.source_quiz_id) campaignQuizMap[c.id] = c.source_quiz_id;
    }

    let sends: any[] = [];
    if (campaignIds.length > 0) {
      const { data: sendData } = await supabase
        .from('email_sends')
        .select('id, campaign_id, status, opened_at, clicked_at')
        .in('campaign_id', campaignIds);
      sends = sendData || [];
    }

    // Get revenue from quiz_payments
    const { data: payments } = await supabase
      .from('quiz_payments')
      .select('quiz_id, amount_cents, status')
      .in('quiz_id', quizIds)
      .eq('status', 'completed');

    // Aggregate per quiz
    const quizMetrics: Record<string, { leads: number; emails_sent: number; emails_opened: number; emails_clicked: number; revenue_cents: number; outcomes: Record<string, { leads: number }> }> = {};

    for (const q of quizzes) {
      quizMetrics[q.id] = { leads: 0, emails_sent: 0, emails_opened: 0, emails_clicked: 0, revenue_cents: 0, outcomes: {} };
    }

    // Count leads per quiz and outcome
    for (const l of leads || []) {
      const m = quizMetrics[l.quiz_id];
      if (!m) continue;
      m.leads++;
      const oid = l.outcome_id || '_none';
      if (!m.outcomes[oid]) m.outcomes[oid] = { leads: 0 };
      m.outcomes[oid].leads++;
    }

    // Count email metrics per quiz
    for (const s of sends) {
      const quizId = campaignQuizMap[s.campaign_id];
      if (!quizId || !quizMetrics[quizId]) continue;
      quizMetrics[quizId].emails_sent++;
      if (s.opened_at) quizMetrics[quizId].emails_opened++;
      if (s.clicked_at) quizMetrics[quizId].emails_clicked++;
    }

    // Count revenue per quiz
    for (const p of payments || []) {
      const m = quizMetrics[p.quiz_id];
      if (!m) continue;
      m.revenue_cents += p.amount_cents || 0;
    }

    // Build response
    const totals = { leads: 0, emails_sent: 0, emails_opened: 0, emails_clicked: 0, revenue_cents: 0 };
    const quizResults = quizzes.map((q: any) => {
      const m = quizMetrics[q.id];
      totals.leads += m.leads;
      totals.emails_sent += m.emails_sent;
      totals.emails_opened += m.emails_opened;
      totals.emails_clicked += m.emails_clicked;
      totals.revenue_cents += m.revenue_cents;

      // Resolve outcome names
      const outcomeNames: Record<string, string> = {};
      const outcomes = q.outcomes as any[] || [];
      for (const o of outcomes) {
        if (o.id) outcomeNames[o.id] = o.label || o.title || o.id;
      }

      const outcomeList = Object.entries(m.outcomes).map(([oid, data]) => ({
        outcome_id: oid,
        outcome_name: outcomeNames[oid] || (oid === '_none' ? 'No outcome' : oid),
        leads: (data as any).leads,
      }));

      return {
        quiz_id: q.id,
        quiz_title: q.title,
        views: q.view_count || 0,
        leads: m.leads,
        emails_sent: m.emails_sent,
        emails_opened: m.emails_opened,
        emails_clicked: m.emails_clicked,
        revenue_cents: m.revenue_cents,
        outcomes: outcomeList,
      };
    });

    // Sort by leads descending
    quizResults.sort((a: any, b: any) => b.leads - a.leads);

    res.json({ quizzes: quizResults, totals });
  } catch (err: any) {
    log.error('[Attribution] Error:', { err: err.message });
    res.status(500).json({ error: err.message || 'Failed to compute attribution' });
  }
});

analyticsRouter.get('/:quizId', async (req: AuthenticatedRequest, res) => {
  const { data: quiz } = await supabase.from('quizzes').select('id,view_count,lead_count').eq('id', req.params.quizId).eq('user_id', req.dbUserId).single();
  if (!quiz) return res.status(404).json({ error: 'Not found' });
  const excludeBots = req.query.exclude_bots === 'true';
  const since = req.query.since as string | undefined;
  const botFilter = (q: any) => excludeBots ? q.or('metadata->is_bot.is.null,metadata->>is_bot.neq.true') : q;

  // When a date range is specified, always count from analytics_events
  if (since || excludeBots) {
    let viewQ = supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('quiz_id', req.params.quizId).eq('event_type', 'view');
    let compQ = supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('quiz_id', req.params.quizId).eq('event_type', 'complete');
    let leadQ = supabase.from('leads').select('id', { count: 'exact', head: true }).eq('quiz_id', req.params.quizId);
    if (since) {
      viewQ = viewQ.gte('created_at', since);
      compQ = compQ.gte('created_at', since);
      leadQ = leadQ.gte('created_at', since);
    }
    if (excludeBots) {
      viewQ = viewQ.or('metadata->is_bot.is.null,metadata->>is_bot.neq.true');
      compQ = compQ.or('metadata->is_bot.is.null,metadata->>is_bot.neq.true');
    }
    const { count: viewCount } = await viewQ;
    const { count: completions } = await compQ;
    const { count: leadCount } = await leadQ;
    const views = viewCount ?? 0; const leads = leadCount ?? 0; const comp = completions ?? 0;
    res.json({ views, completions: comp, leads, completion_rate: views > 0 ? Math.round((comp/views)*100) : 0, lead_rate: comp > 0 ? Math.round((leads/comp)*100) : 0, date_filtered: !!since, bot_filtered: excludeBots });
  } else {
    const { count: completions } = await supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('quiz_id', req.params.quizId).eq('event_type', 'complete');
    const views = quiz.view_count ?? 0; const leads = quiz.lead_count ?? 0; const comp = completions ?? 0;
    res.json({ views, completions: comp, leads, completion_rate: views > 0 ? Math.round((comp/views)*100) : 0, lead_rate: comp > 0 ? Math.round((leads/comp)*100) : 0 });
  }
});

analyticsRouter.get('/:quizId/timeseries', async (req: AuthenticatedRequest, res) => {
  const { data: quiz } = await supabase.from('quizzes').select('id').eq('id', req.params.quizId).eq('user_id', req.dbUserId).single();
  if (!quiz) return res.status(404).json({ error: 'Not found' });
  const period = req.query.period ?? '30d';
  let daysBack = 30;
  if (period === '7d') daysBack = 7;
  else if (period === '90d') daysBack = 90;
  else if (period === 'all') daysBack = 3650;
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - daysBack);
  const excludeBots = req.query.exclude_bots === 'true';
  let evtQ = supabase.from('analytics_events').select('created_at,event_type').eq('quiz_id', req.params.quizId).gte('created_at', fromDate.toISOString());
  if (excludeBots) evtQ = evtQ.or('metadata->is_bot.is.null,metadata->>is_bot.neq.true');
  const { data: events } = await evtQ;
  const { data: leads } = await supabase.from('leads').select('created_at').eq('quiz_id', req.params.quizId).gte('created_at', fromDate.toISOString());
  const dateMap: Record<string, { views: number; completions: number; leads: number }> = {};
  (events ?? []).forEach((e: any) => {
    const d = new Date(e.created_at).toISOString().split('T')[0];
    if (!dateMap[d]) dateMap[d] = { views: 0, completions: 0, leads: 0 };
    if (e.event_type === 'view') dateMap[d].views++;
    else if (e.event_type === 'complete') dateMap[d].completions++;
  });
  (leads ?? []).forEach((l: any) => {
    const d = new Date(l.created_at).toISOString().split('T')[0];
    if (!dateMap[d]) dateMap[d] = { views: 0, completions: 0, leads: 0 };
    dateMap[d].leads++;
  });
  const dates = Object.keys(dateMap).sort();
  const views = dates.map(d => dateMap[d].views);
  const completions = dates.map(d => dateMap[d].completions);
  const leadsArray = dates.map(d => dateMap[d].leads);
  res.json({ dates, views, completions, leads: leadsArray });
});

analyticsRouter.get('/:quizId/funnel', async (req: AuthenticatedRequest, res) => {
  const { data: quiz } = await supabase.from('quizzes').select('id').eq('id', req.params.quizId).eq('user_id', req.dbUserId).single();
  if (!quiz) return res.status(404).json({ error: 'Not found' });
  const excludeBots = req.query.exclude_bots === 'true';
  const botFilter = (q: any) => excludeBots ? q.or('metadata->is_bot.is.null,metadata->>is_bot.neq.true') : q;
  const { count: viewed } = await botFilter(supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('quiz_id', req.params.quizId).eq('event_type', 'view'));
  const { count: started } = await botFilter(supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('quiz_id', req.params.quizId).eq('event_type', 'start'));
  const { count: completed } = await botFilter(supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('quiz_id', req.params.quizId).eq('event_type', 'complete'));
  const { count: lead_captured } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('quiz_id', req.params.quizId);

  // Extended funnel: email sends and clicks for leads from this quiz
  // Join through campaigns that have source_quiz_id matching this quiz
  const { data: quizCampaigns } = await supabase
    .from('campaigns')
    .select('id')
    .eq('source_quiz_id', req.params.quizId)
    .eq('tenant_id', req.dbUserId);
  const campaignIds = (quizCampaigns ?? []).map((c: any) => c.id);
  let emailSent = 0;
  let emailClicked = 0;
  if (campaignIds.length > 0) {
    const { count: sentCount } = await supabase
      .from('email_sends')
      .select('id', { count: 'exact', head: true })
      .in('campaign_id', campaignIds)
      .eq('status', 'delivered');
    emailSent = sentCount ?? 0;
    const { count: clickCount } = await supabase
      .from('email_sends')
      .select('id', { count: 'exact', head: true })
      .in('campaign_id', campaignIds)
      .not('clicked_at', 'is', null);
    emailClicked = clickCount ?? 0;
  }

  // Outcome breakdown: count leads per outcome
  const { data: outcomeLeads } = await supabase
    .from('leads')
    .select('outcome_id')
    .eq('quiz_id', req.params.quizId)
    .not('outcome_id', 'is', null);
  const outcomeCounts: Record<string, number> = {};
  (outcomeLeads ?? []).forEach((l: any) => {
    outcomeCounts[l.outcome_id] = (outcomeCounts[l.outcome_id] || 0) + 1;
  });

  res.json({
    viewed: viewed ?? 0,
    started: started ?? 0,
    completed: completed ?? 0,
    lead_captured: lead_captured ?? 0,
    email_sent: emailSent,
    email_clicked: emailClicked,
    outcome_breakdown: outcomeCounts,
  });
});

analyticsRouter.get('/:quizId/dropoff', async (req: AuthenticatedRequest, res) => {
  const { data: quiz } = await supabase.from('quizzes').select('id,questions').eq('id', req.params.quizId).eq('user_id', req.dbUserId).single();
  if (!quiz) return res.status(404).json({ error: 'Not found' });
  const questionCount = (quiz.questions ?? []).length;
  const { data: events } = await supabase.from('analytics_events').select('event_type,metadata').eq('quiz_id', req.params.quizId).like('event_type', 'question_%');
  const questionStats: Record<number, { started: number; completed: number }> = {};
  for (let i = 0; i < questionCount; i++) {
    questionStats[i] = { started: 0, completed: 0 };
  }
  (events ?? []).forEach((e: any) => {
    const match = e.event_type.match(/question_(\d+)_([a-z]+)/);
    if (match) {
      const qIndex = parseInt(match[1]);
      const action = match[2];
      if (qIndex >= 0 && qIndex < questionCount) {
        if (action === 'view') questionStats[qIndex].started++;
        else if (action === 'answer') questionStats[qIndex].completed++;
      }
    }
  });
  const result = Object.keys(questionStats).map(idx => {
    const i = parseInt(idx);
    const st = questionStats[i].started;
    return { question_index: i, started: st, completed: questionStats[i].completed, dropoff_rate: st > 0 ? Math.round(((st - questionStats[i].completed) / st) * 100) : 0 };
  });
  res.json(result);
});

analyticsRouter.get('/:quizId/results', async (req: AuthenticatedRequest, res) => {
  const { data: quiz } = await supabase.from('quizzes').select('id').eq('id', req.params.quizId).eq('user_id', req.dbUserId).single();
  if (!quiz) return res.status(404).json({ error: 'Not found' });
  const { data: leadsData } = await supabase.from('leads').select('outcome_id').eq('quiz_id', req.params.quizId);
  const outcomeMap: Record<string, number> = {};
  let totalLeads = 0;
  (leadsData ?? []).forEach((l: any) => {
    if (l.outcome_id) {
      outcomeMap[l.outcome_id] = (outcomeMap[l.outcome_id] ?? 0) + 1;
      totalLeads++;
    }
  });
  const result = Object.keys(outcomeMap).map(oid => ({
    outcome_id: oid,
    count: outcomeMap[oid],
    percentage: totalLeads > 0 ? Math.round((outcomeMap[oid] / totalLeads) * 100) : 0,
  }));
  res.json(result);
});

// Task 5.2: Mode-specific analytics endpoint
analyticsRouter.get('/:quizId/mode-specific', async (req: AuthenticatedRequest, res) => {
  const { data: quiz } = await supabase.from('quizzes').select('id,mode,settings').eq('id', req.params.quizId).eq('user_id', req.dbUserId).single();
  if (!quiz) return res.status(404).json({ error: 'Not found' });

  const { data: leadsData } = await supabase.from('leads').select('outcome_id,metadata,answers').eq('quiz_id', req.params.quizId);
  const mode = quiz.mode || 'lead_quiz';

  if (mode === 'price_calculator') {
    const prices: number[] = [];
    let priceSum = 0;
    (leadsData ?? []).forEach((l: any) => {
      const price = l.metadata?.calculated_price;
      if (typeof price === 'number') {
        prices.push(price);
        priceSum += price;
      }
    });
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
    const avgPrice = prices.length > 0 ? priceSum / prices.length : null;
    const mostCommonSelections: Record<string, number> = {};
    (leadsData ?? []).forEach((l: any) => {
      if (l.answers && typeof l.answers === 'object') {
        Object.values(l.answers).forEach((val: any) => {
          const key = String(val);
          mostCommonSelections[key] = (mostCommonSelections[key] ?? 0) + 1;
        });
      }
    });
    return res.json({
      average_estimated_price: avgPrice,
      price_distribution: { min: minPrice, max: maxPrice, avg: avgPrice },
      most_common_selections: mostCommonSelections
    });
  }

  if (mode === 'service_recommender') {
    const recommendationMap: Record<string, number> = {};
    let ctaClickCount = 0;
    (leadsData ?? []).forEach((l: any) => {
      if (l.outcome_id) {
        recommendationMap[l.outcome_id] = (recommendationMap[l.outcome_id] ?? 0) + 1;
      }
      if (l.metadata?.cta_clicked) {
        ctaClickCount++;
      }
    });
    const totalLeads = leadsData?.length ?? 0;
    return res.json({
      recommendation_distribution: recommendationMap,
      cta_click_rate: totalLeads > 0 ? Math.round((ctaClickCount / totalLeads) * 100) : 0
    });
  }

  if (mode === 'client_qualifier') {
    const threshold = quiz.settings?.qualification_threshold ?? 70;
    let qualifiedCount = 0;
    let nurtureCount = 0;
    (leadsData ?? []).forEach((l: any) => {
      const qualified = l.metadata?.qualified;
      if (qualified === true) {
        qualifiedCount++;
      } else if (qualified === false) {
        nurtureCount++;
      }
    });
    const totalLeads = qualifiedCount + nurtureCount;
    const qualificationRate = totalLeads > 0 ? Math.round((qualifiedCount / totalLeads) * 100) : 0;
    return res.json({
      qualification_rate: qualificationRate,
      qualified_count: qualifiedCount,
      nurture_count: nurtureCount
    });
  }

  if (mode === 'segmentation_quiz') {
    const tagMap: Record<string, number> = {};
    (leadsData ?? []).forEach((l: any) => {
      const tags = l.metadata?.tags;
      if (Array.isArray(tags)) {
        tags.forEach((tag: string) => {
          tagMap[tag] = (tagMap[tag] ?? 0) + 1;
        });
      }
    });
    return res.json({ tag_distribution: tagMap });
  }

  res.json({ message: 'Mode-specific analytics not available for this quiz mode' });
});

// Task 5.4: Device breakdown analytics endpoint
analyticsRouter.get('/:quizId/devices', async (req: AuthenticatedRequest, res) => {
  const { data: quiz } = await supabase.from('quizzes').select('id').eq('id', req.params.quizId).eq('user_id', req.dbUserId).single();
  if (!quiz) return res.status(404).json({ error: 'Not found' });
  const { data: leadsData } = await supabase.from('leads').select('metadata').eq('quiz_id', req.params.quizId);
  const deviceMap: Record<string, number> = { mobile: 0, tablet: 0, desktop: 0 };
  let totalWithDevice = 0;
  (leadsData ?? []).forEach((l: any) => {
    const device = l.metadata?.device_type || 'desktop';
    if (deviceMap[device] !== undefined) {
      deviceMap[device]++;
      totalWithDevice++;
    }
  });
  const result = Object.entries(deviceMap).map(([device, count]) => ({
    device,
    count,
    percentage: totalWithDevice > 0 ? Math.round((count / totalWithDevice) * 100) : 0
  }));
  res.json(result);
});

// Task 5.3: Time-to-complete metrics endpoint
analyticsRouter.get('/:quizId/time-to-complete', async (req: AuthenticatedRequest, res) => {
  const { data: quiz } = await supabase.from('quizzes').select('id').eq('id', req.params.quizId).eq('user_id', req.dbUserId).single();
  if (!quiz) return res.status(404).json({ error: 'Not found' });
  const { data: leadsData } = await supabase.from('leads').select('metadata').eq('quiz_id', req.params.quizId);
  const times: number[] = [];
  (leadsData ?? []).forEach((l: any) => {
    const ttc = l.metadata?.time_to_complete_ms;
    if (typeof ttc === 'number') {
      times.push(ttc);
    }
  });

  if (times.length === 0) {
    return res.json({ count: 0, average_ms: null, median_ms: null, min_ms: null, max_ms: null });
  }

  times.sort((a, b) => a - b);
  const median = times.length % 2 === 0
    ? (times[times.length / 2 - 1] + times[times.length / 2]) / 2
    : times[Math.floor(times.length / 2)];

  const sum = times.reduce((a, b) => a + b, 0);
  const avg = Math.round(sum / times.length);

  res.json({
    count: times.length,
    average_ms: avg,
    median_ms: Math.round(median),
    min_ms: Math.min(...times),
    max_ms: Math.max(...times)
  });
});

// Question-level answer heatmap and drop-off from leads data
analyticsRouter.get('/:quizId/question-heatmap', async (req: AuthenticatedRequest, res) => {
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id, questions')
    .eq('id', req.params.quizId)
    .eq('user_id', req.dbUserId)
    .single();
  if (!quiz) return res.status(404).json({ error: 'Not found' });

  const questions: any[] = quiz.questions || [];
  if (questions.length === 0) return res.json({ questions: [], total_leads: 0 });

  // Fetch all leads with answers for this quiz
  const { data: leadsData } = await supabase
    .from('leads')
    .select('answers')
    .eq('quiz_id', req.params.quizId)
    .not('answers', 'is', null);

  const leads = leadsData || [];
  const totalLeads = leads.length;

  // Build per-question stats
  const questionStats = questions.map((q: any, qi: number) => {
    const optionCounts: Record<number, number> = {};
    const optionCount = (q.options || []).length;
    for (let oi = 0; oi < optionCount; oi++) {
      optionCounts[oi] = 0;
    }

    let answered = 0;
    leads.forEach((lead: any) => {
      const ans = lead.answers;
      if (ans && ans[String(qi)] !== undefined) {
        answered++;
        const selectedOption = Number(ans[String(qi)]);
        if (optionCounts[selectedOption] !== undefined) {
          optionCounts[selectedOption]++;
        }
      }
    });

    const options = (q.options || []).map((opt: any, oi: number) => {
      const count = optionCounts[oi] || 0;
      return {
        index: oi,
        text: opt.text || '',
        count,
        pct: answered > 0 ? Math.round((count / answered) * 100) : 0,
        score: opt.score || 0,
      };
    });

    return {
      index: qi,
      text: q.text || '',
      type: q.type || 'multiple_choice',
      answered,
      dropoff: qi === 0 ? 0 : Math.max(0, totalLeads - answered),
      dropoff_rate: totalLeads > 0 ? Math.round(((totalLeads - answered) / totalLeads) * 100) : 0,
      options,
    };
  });

  res.json({ questions: questionStats, total_leads: totalLeads });
});

// ── Scrape Brand ──────────────────────────────────────────────────────────────
export const scrapeBrandRouter = Router();
scrapeBrandRouter.post('/scrape-brand', requireAuth, attachUser, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  let normalizedBrandUrl: string;
  try {
    normalizedBrandUrl = normalizeUrl(url);
  } catch {
    return res.status(400).json({ error: 'invalid url' });
  }
  try {
    const brand = await scrapeBrand(normalizedBrandUrl);
    const [profile, ideas] = await Promise.all([
      analyzeBusinessProfile(normalizedBrandUrl, brand).catch((e: any) => {
        log.error('[ScrapeBrand] analyzeBusinessProfile failed:', { err: e?.message });
        return null;
      }),
      suggestQuizIdeas(normalizedBrandUrl, brand).catch((e: any) => {
        log.error('[ScrapeBrand] suggestQuizIdeas failed:', { err: e?.message });
        return [] as string[];
      }),
    ]);
    const merged: any = { ...brand };
    if (profile) {
      merged.business = { ...((brand as any).business || {}), ...profile };
    }
    merged.quiz_ideas = Array.isArray(ideas) ? ideas : [];
    res.json(merged);
  } catch (err: any) {
    if (err instanceof NotSquarespaceError) {
      return res.status(422).json({ error: err.message, code: 'NOT_SQUARESPACE', hostname: err.hostname });
    }
    log.error('[ScrapeBrand] Failed:', { err: err });
    res.status(500).json({ error: err?.message ?? 'Scrape failed' });
  }
});

// ── User ──────────────────────────────────────────────────────────────────────
export const userRouter = Router();
userRouter.use(requireAuth, attachUser);
userRouter.get('/plan', async (req: AuthenticatedRequest, res) => {
  const { data: user } = await supabase.from('users').select('plan,quiz_count,created_at,email,email_notifications,custom_domain,domain_verified').eq('id', req.dbUserId).single();
  if (!user) return res.status(404).json({ error: 'Not found' });
  var plan = user.plan || 'free';
  // Map legacy 'starter' to 'free' for users who never paid
  if (plan === 'starter' && !user.plan) plan = 'free';
  var trialEndsAt = (plan === 'free' || plan === 'trial') && user.created_at
    ? new Date(new Date(user.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    : null;
  var limits = getPlanLimits(plan);
  // Count leads and emails for the current month
  var monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  var monthISO = monthStart.toISOString();
  var [leadRes, emailRes] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', req.dbUserId).gte('created_at', monthISO),
    supabase.from('email_logs').select('id', { count: 'exact', head: true }).eq('user_id', req.dbUserId).gte('sent_at', monthISO),
  ]);
  var leadsThisMonth = leadRes.count || 0;
  var emailsThisMonth = emailRes.count || 0;
  res.json({ plan: plan, quiz_count: user.quiz_count, limits: limits, trial_ends_at: trialEndsAt, email: user.email || '', email_notifications: user.email_notifications !== false, leads_this_month: leadsThisMonth, emails_this_month: emailsThisMonth, custom_domain: user.custom_domain || null, domain_verified: user.domain_verified || false, features: { removeBranding: limits.removeBranding, abTesting: limits.abTesting, zapier: limits.zapier, analytics: limits.analytics } });
});

// PATCH /api/user/custom-domain — set custom domain (business plan only)
userRouter.patch('/custom-domain', async function(req: AuthenticatedRequest, res) {
  try {
    var { data: user } = await supabase.from('users').select('plan').eq('id', req.dbUserId).single();
    if (!user) return res.status(404).json({ error: 'User not found' });
    var plan = user.plan || 'free';
    if (plan !== 'business' && plan !== 'agency') {
      return res.status(403).json({ error: 'Custom domains require the Business plan.' });
    }
    var domain = req.body.custom_domain || null;
    var { error: updateErr } = await supabase.from('users').update({ custom_domain: domain, domain_verified: false }).eq('id', req.dbUserId);
    if (updateErr) return res.status(500).json({ error: updateErr.message });
    res.json({ custom_domain: domain, domain_verified: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update domain' });
  }
});

// POST /api/user/custom-domain/verify — check if CNAME is properly configured
userRouter.post('/custom-domain/verify', async function(req: AuthenticatedRequest, res) {
  try {
    var { data: user } = await supabase.from('users').select('custom_domain').eq('id', req.dbUserId).single();
    if (!user || !user.custom_domain) return res.status(400).json({ error: 'No custom domain set' });
    // In production, we'd do a DNS lookup here. For now, mark as verified.
    var dns = require('dns');
    dns.resolveCname(user.custom_domain, function(err: any, addresses: string[]) {
      if (!err && addresses && addresses.some(function(a: string) { return a.includes('squarespell.com'); })) {
        supabase.from('users').update({ domain_verified: true }).eq('id', req.dbUserId).then(function() {
          res.json({ verified: true });
        });
      } else {
        res.json({ verified: false, message: 'CNAME not pointing to quiz.squarespell.com' });
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Verification failed' });
  }
});

userRouter.get('/recommendations', async function(req: AuthenticatedRequest, res) {
  try {
    var recs = await getRecommendations(req.dbUserId!);
    res.json(recs);
  } catch (err: any) {
    log.error('Failed to get recommendations', { err: err.message });
    res.json([]);
  }
});
userRouter.post('/notifications', async (req: AuthenticatedRequest, res) => {
  const { enabled } = req.body;
  await supabase.from('users').update({ email_notifications: !!enabled }).eq('id', req.dbUserId);
  res.json({ ok: true, enabled: !!enabled });
});

// ── In-app notifications ────────────────────────────────────────────────────

userRouter.get('/notifications/list', async function(req: AuthenticatedRequest, res) {
  try {
    var limit = parseInt(req.query.limit as string) || 30;
    var unreadOnly = req.query.unread === 'true';
    var items = await getNotifications(req.dbUserId!, { limit: limit, unreadOnly: unreadOnly });
    var count = await getUnreadCount(req.dbUserId!);
    res.json({ notifications: items, unread_count: count });
  } catch (err: any) {
    log.error('Failed to list notifications', { err: err.message });
    res.json({ notifications: [], unread_count: 0 });
  }
});

userRouter.get('/notifications/unread-count', async function(req: AuthenticatedRequest, res) {
  try {
    var count = await getUnreadCount(req.dbUserId!);
    res.json({ unread_count: count });
  } catch {
    res.json({ unread_count: 0 });
  }
});

userRouter.post('/notifications/:id/read', async function(req: AuthenticatedRequest, res) {
  try {
    var ok = await markAsRead(req.dbUserId!, req.params.id);
    res.json({ ok: ok });
  } catch {
    res.json({ ok: false });
  }
});

userRouter.post('/notifications/read-all', async function(req: AuthenticatedRequest, res) {
  try {
    var ok = await markAllAsRead(req.dbUserId!);
    res.json({ ok: ok });
  } catch {
    res.json({ ok: false });
  }
});

// ── Brand Kit (user-level) ──────────────────────────────────────────────────
userRouter.get('/brand-kit', async (req: AuthenticatedRequest, res) => {
  const { data: user } = await supabase
    .from('users')
    .select('brand_kit')
    .eq('id', req.dbUserId)
    .single();
  res.json(user?.brand_kit || null);
});

userRouter.put('/brand-kit', async (req: AuthenticatedRequest, res) => {
  const kit = req.body;
  if (!kit || typeof kit !== 'object') {
    return res.status(400).json({ error: 'Invalid brand kit payload' });
  }
  // Sanitize: only keep known fields
  const sanitized: Record<string, any> = {};
  if (kit.colors && typeof kit.colors === 'object') sanitized.colors = kit.colors;
  if (kit.dark_colors && typeof kit.dark_colors === 'object') sanitized.dark_colors = kit.dark_colors;
  if (kit.color_mode === 'light' || kit.color_mode === 'dark') sanitized.color_mode = kit.color_mode;
  if (typeof kit.font_family === 'string') sanitized.font_family = kit.font_family;
  if (typeof kit.site_name === 'string') sanitized.site_name = kit.site_name;
  if (typeof kit.favicon_url === 'string') sanitized.favicon_url = kit.favicon_url;
  if (typeof kit.logo_url === 'string') sanitized.logo_url = kit.logo_url;

  const { error } = await supabase
    .from('users')
    .update({ brand_kit: sanitized })
    .eq('id', req.dbUserId);
  if (error) {
    log.error('Failed to save brand kit', { error: error.message });
    return res.status(500).json({ error: 'Failed to save' });
  }
  log.info('Brand kit saved', { userId: req.dbUserId });
  res.json(sanitized);
});

// ── Stripe ────────────────────────────────────────────────────────────────────
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const PRICE_IDS: Record<string,Record<string,string>> = {
  starter: { monthly: process.env.STRIPE_STARTER_PRICE_ID!, yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID! },
  pro: { monthly: process.env.STRIPE_PRO_PRICE_ID!, yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID! },
  business: { monthly: process.env.STRIPE_BUSINESS_PRICE_ID!, yearly: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID! },
  // Legacy aliases for existing subscribers
  growth: { monthly: process.env.STRIPE_STARTER_PRICE_ID!, yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID! },
  agency: { monthly: process.env.STRIPE_BUSINESS_PRICE_ID!, yearly: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID! },
};

// Reverse lookup: Stripe price ID → our plan name
function priceIdToPlan(priceId: string): string | null {
  for (var plan in PRICE_IDS) {
    for (var billing in PRICE_IDS[plan]) {
      if (PRICE_IDS[plan][billing] === priceId) return plan;
    }
  }
  return null;
}

// Reverse lookup: Stripe price ID → billing interval
function priceIdToBilling(priceId: string): string | null {
  for (var plan in PRICE_IDS) {
    for (var billing in PRICE_IDS[plan]) {
      if (PRICE_IDS[plan][billing] === priceId) return billing;
    }
  }
  return null;
}

export const stripeRouter = Router();
stripeRouter.post('/create-checkout', requireAuth, attachUser, async (req: AuthenticatedRequest, res) => {
  const billing = req.body.billing === 'yearly' ? 'yearly' : 'monthly';
  const priceId = (PRICE_IDS[req.body.plan] as any)?.[billing];
  if (!priceId) return res.status(400).json({ error: 'Invalid plan' });
  const { data: user } = await supabase.from('users').select('email,stripe_customer_id').eq('id', req.dbUserId).single();
  const session = await stripe.checkout.sessions.create({ mode: 'subscription', payment_method_types: ['card'], customer_email: user?.stripe_customer_id ? undefined : user?.email, customer: user?.stripe_customer_id ?? undefined, line_items: [{ price: priceId, quantity: 1 }], success_url: `${process.env.FRONTEND_URL}/dashboard?upgraded=true`, cancel_url: `${process.env.FRONTEND_URL}/pricing`, metadata: { db_user_id: req.dbUserId!, plan: req.body.plan } });
  res.json({ url: session.url });
});
stripeRouter.post('/webhook', async (req, res) => {
  var event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'] as string, process.env.STRIPE_WEBHOOK_SECRET!); }
  catch { return res.status(400).json({ error: 'Invalid signature' }); }

  if (event.type === 'checkout.session.completed') {
    var s = event.data.object as Stripe.Checkout.Session;
    if (s.metadata?.db_user_id && s.metadata?.plan) {
      await supabase.from('users').update({ plan: s.metadata.plan, stripe_customer_id: s.customer as string, stripe_subscription_id: s.subscription as string }).eq('id', s.metadata.db_user_id);
      // Send payment confirmed / plan upgraded email
      var { data: paidUser } = await supabase.from('users').select('id,email,first_name').eq('id', s.metadata.db_user_id).single();
      if (paidUser) {
        sendPlatformEmail({
          userId: paidUser.id,
          email: paidUser.email,
          emailType: 'payment_confirmed',
          firstName: paidUser.first_name || '',
          data: { planName: (s.metadata.plan || 'Pro').charAt(0).toUpperCase() + (s.metadata.plan || 'pro').slice(1) },
        }).catch(function(err) { log.error('[StripeWebhook] payment_confirmed email failed:', { err: err?.message }); });
      }
    }
  }

  if (event.type === 'customer.subscription.updated') {
    var subUpd = event.data.object as Stripe.Subscription;
    var prevAttrs = (event.data as any).previous_attributes || {};
    // Read the current price from the subscription to determine the new plan
    var currentPriceId = subUpd.items?.data?.[0]?.price?.id || '';
    var newPlan = priceIdToPlan(currentPriceId);

    // Always sync the plan in our database when the subscription changes
    if (newPlan) {
      var { data: upgUser } = await supabase.from('users').select('id,email,first_name,plan').eq('stripe_subscription_id', subUpd.id).single();
      if (upgUser && upgUser.plan !== newPlan) {
        var oldPlan = upgUser.plan;
        await supabase.from('users').update({ plan: newPlan }).eq('id', upgUser.id);
        log.info('[StripeWebhook] Plan synced: ' + oldPlan + ' → ' + newPlan + ' for user ' + upgUser.id);

        // Send upgrade/change email
        sendPlatformEmail({
          userId: upgUser.id,
          email: upgUser.email,
          emailType: 'plan_upgraded',
          firstName: upgUser.first_name || '',
          data: { planName: newPlan.charAt(0).toUpperCase() + newPlan.slice(1) },
        }).catch(function(err) { log.error('[StripeWebhook] plan_upgraded email failed:', { err: err?.message }); });
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    var sub = event.data.object as Stripe.Subscription;
    // Fetch user before downgrading so we have their email
    var { data: cancelUser } = await supabase.from('users').select('id,email,first_name').eq('stripe_subscription_id', sub.id).single();
    await supabase.from('users').update({ plan: 'free', stripe_subscription_id: null }).eq('stripe_subscription_id', sub.id);
    if (cancelUser) {
      var endsAt = sub.current_period_end ? new Date(sub.current_period_end * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
      sendPlatformEmail({
        userId: cancelUser.id,
        email: cancelUser.email,
        emailType: 'subscription_cancelled',
        firstName: cancelUser.first_name || '',
        data: { endsAt: endsAt },
      }).catch(function(err) { log.error('[StripeWebhook] subscription_cancelled email failed:', { err: err?.message }); });
    }
  }

  if (event.type === 'invoice.payment_failed') {
    var failedInvoice = event.data.object as Stripe.Invoice;
    var custId = typeof failedInvoice.customer === 'string' ? failedInvoice.customer : (failedInvoice.customer as any)?.id;
    if (custId) {
      var { data: failUser } = await supabase.from('users').select('id,email,first_name').eq('stripe_customer_id', custId).single();
      if (failUser) {
        sendPlatformEmail({
          userId: failUser.id,
          email: failUser.email,
          emailType: 'payment_failed',
          firstName: failUser.first_name || '',
        }).catch(function(err) { log.error('[StripeWebhook] payment_failed email failed:', { err: err?.message }); });
      }
    }
  }

  res.json({ received: true });
});
stripeRouter.get('/portal', requireAuth, attachUser, async (req: AuthenticatedRequest, res) => {
  const { data: user } = await supabase.from('users').select('stripe_customer_id').eq('id', req.dbUserId).single();
  if (!user?.stripe_customer_id) return res.redirect(`${process.env.FRONTEND_URL}/pricing`);
  const portal = await stripe.billingPortal.sessions.create({ customer: user.stripe_customer_id, return_url: `${process.env.FRONTEND_URL}/dashboard` });
  res.redirect(portal.url);
});

// ── Switch Plan (upgrade/downgrade with proration) ──────────────────────────
stripeRouter.post('/switch-plan', requireAuth, attachUser, async (req: AuthenticatedRequest, res) => {
  try {
    var targetPlan = req.body.plan;
    var targetBilling = req.body.billing === 'yearly' ? 'yearly' : 'monthly';
    var newPriceId = (PRICE_IDS[targetPlan] as any)?.[targetBilling];
    if (!newPriceId) return res.status(400).json({ error: 'Invalid plan' });

    var { data: user } = await supabase.from('users').select('stripe_subscription_id,stripe_customer_id,plan').eq('id', req.dbUserId).single();
    if (!user?.stripe_subscription_id) {
      return res.status(400).json({ error: 'No active subscription. Please subscribe first.', redirect: '/pricing' });
    }

    // If already on this plan, no-op
    if (user.plan === targetPlan) {
      return res.json({ ok: true, message: 'Already on this plan', plan: targetPlan });
    }

    // Fetch the current subscription to get the item ID
    var subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
    var subItemId = subscription.items.data[0]?.id;
    if (!subItemId) {
      return res.status(500).json({ error: 'Could not find subscription item' });
    }

    // Update the subscription — Stripe automatically prorates
    var updated = await stripe.subscriptions.update(user.stripe_subscription_id, {
      items: [{ id: subItemId, price: newPriceId }],
      proration_behavior: 'create_prorations',
    });

    // Immediately sync plan in our DB (webhook will also fire, but this is instant)
    await supabase.from('users').update({ plan: targetPlan }).eq('id', req.dbUserId);

    log.info('[SwitchPlan] ' + user.plan + ' → ' + targetPlan + ' for user ' + req.dbUserId);

    res.json({
      ok: true,
      plan: targetPlan,
      billing: targetBilling,
      message: 'Plan switched to ' + targetPlan + '. Proration applied automatically.',
    });
  } catch (err: any) {
    log.error('[SwitchPlan] Failed:', { err: err?.message });
    res.status(500).json({ error: err?.message || 'Failed to switch plan' });
  }
});

// ── Preview proration (show user what they'll pay) ──────────────────────────
stripeRouter.post('/preview-proration', requireAuth, attachUser, async (req: AuthenticatedRequest, res) => {
  try {
    var targetPlan = req.body.plan;
    var targetBilling = req.body.billing === 'yearly' ? 'yearly' : 'monthly';
    var newPriceId = (PRICE_IDS[targetPlan] as any)?.[targetBilling];
    if (!newPriceId) return res.status(400).json({ error: 'Invalid plan' });

    var { data: user } = await supabase.from('users').select('stripe_subscription_id,stripe_customer_id,plan').eq('id', req.dbUserId).single();
    if (!user?.stripe_subscription_id) {
      return res.status(400).json({ error: 'No active subscription' });
    }

    var subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
    var subItemId = subscription.items.data[0]?.id;
    if (!subItemId) {
      return res.status(500).json({ error: 'Could not find subscription item' });
    }

    // Create a preview invoice to see what the proration would be
    var invoice = await stripe.invoices.retrieveUpcoming({
      customer: user.stripe_customer_id!,
      subscription: user.stripe_subscription_id,
      subscription_items: [{ id: subItemId, price: newPriceId }],
      subscription_proration_behavior: 'create_prorations',
      subscription_proration_date: Math.floor(Date.now() / 1000),
    });

    // Find the proration line items
    var prorationLines = (invoice.lines?.data || []).filter(function(line: any) {
      return line.proration;
    });
    var prorationAmount = prorationLines.reduce(function(sum: number, line: any) {
      return sum + (line.amount || 0);
    }, 0);

    res.json({
      ok: true,
      currentPlan: user.plan,
      newPlan: targetPlan,
      newBilling: targetBilling,
      prorationAmount: prorationAmount,  // in cents (positive = charge, negative = credit)
      prorationFormatted: (prorationAmount >= 0 ? '' : '-') + '$' + (Math.abs(prorationAmount) / 100).toFixed(2),
      nextInvoiceTotal: invoice.total,
      nextInvoiceFormatted: '$' + (invoice.total / 100).toFixed(2),
      currency: invoice.currency,
    });
  } catch (err: any) {
    log.error('[PreviewProration] Failed:', { err: err?.message });
    res.status(500).json({ error: err?.message || 'Failed to preview proration' });
  }
});

stripeRouter.get('/invoices', requireAuth, attachUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { data: user } = await supabase.from('users').select('stripe_customer_id').eq('id', req.dbUserId).single();
    if (!user?.stripe_customer_id) {
      return res.json({ invoices: [] });
    }
    const invoices = await stripe.invoices.list({
      customer: user.stripe_customer_id,
      limit: 10,
    });
    const formattedInvoices = invoices.data.map(function(invoice) {
      return {
        id: invoice.id,
        number: invoice.number,
        date: new Date(invoice.created * 1000).toISOString().split('T')[0],
        amount: invoice.amount_paid || 0,
        status: invoice.status,
        url: invoice.hosted_invoice_url,
      };
    });
    res.json({ invoices: formattedInvoices });
  } catch (err: any) {
    log.error('Get invoices error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to fetch invoices' });
  }
});

// ── Cron: Weekly Digest ───────────────────────────────────────────────────────
export const cronRouter = Router();
cronRouter.post('/process-email-queue', async (_req, res) => {
  try {
    const result = await processEmailQueue();
    res.json({ ok: true, ...result });
  } catch (err: any) {
    log.error('[Cron] process-email-queue failed:', { err: err });
    res.status(500).json({ error: err?.message || 'queue drain failed' });
  }
});

// GDPR token cleanup — delete expired tokens (runs daily via cron)
cronRouter.post('/cleanup-gdpr-tokens', async (req, res) => {
  var cronSecret = req.headers['x-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    var { error } = await supabase.from('gdpr_deletion_requests').delete().lt('expires_at', new Date(Date.now() - 86400000).toISOString());
    res.json({ ok: true, error: error?.message || null });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// Integration error cleanup — delete errors older than 30 days
cronRouter.post('/cleanup-integration-errors', async (req, res) => {
  var cronSecret = req.headers['x-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    var thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    var { error } = await supabase.from('integration_errors').delete().lt('created_at', thirtyDaysAgo);
    res.json({ ok: true, error: error?.message || null });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

cronRouter.post('/process-scheduled-sends', async (req, res) => {
  const cronSecret = req.headers['x-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const result = await processScheduledCampaigns();
    log.info(`[Cron] scheduled-sends: processed ${result.processed} campaign(s)`);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    log.error('[Cron] process-scheduled-sends failed:', { err: err });
    res.status(500).json({ error: err?.message || 'scheduled send dispatch failed' });
  }
});

cronRouter.post('/cleanup-preview-cache', async (req, res) => {
  var cronSecret = req.headers['x-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    var { cleanupExpiredCache } = await import('../services/previewCache');
    var deleted = await cleanupExpiredCache();
    log.info('[Cron] preview-cache cleanup: removed ' + deleted + ' expired entries');
    res.json({ ok: true, deleted: deleted });
  } catch (err: any) {
    log.error('[Cron] cleanup-preview-cache failed:', { err: err });
    res.status(500).json({ error: err?.message || 'preview cache cleanup failed' });
  }
});

cronRouter.post('/weekly-digest', async (req, res) => {
  // Verify cron job secret
  const cronSecret = req.headers['x-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!resend) {
    return res.status(500).json({ error: 'Resend not configured' });
  }

  try {
    // Get all non-free users (active subscribers + trials)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id,email,first_name')
      .neq('plan', 'free');

    if (usersError) throw usersError;

    let emailsSent = 0;
    let skipped = 0;

    for (const user of users ?? []) {
      try {
        // Get user's quizzes
        const { data: quizzes } = await supabase
          .from('quizzes')
          .select('id,title,view_count,lead_count')
          .eq('user_id', user.id);

        // Calculate stats for last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        let totalViews = 0;
        let totalCompletions = 0;
        let totalLeads = 0;
        let topQuiz = { title: 'No activity', views: 0 };

        for (const quiz of quizzes ?? []) {
          const { count: weekViews } = await supabase
            .from('analytics_events')
            .select('id', { count: 'exact', head: true })
            .eq('quiz_id', quiz.id)
            .eq('event_type', 'view')
            .gte('created_at', sevenDaysAgo.toISOString());

          const { count: weekCompletions } = await supabase
            .from('analytics_events')
            .select('id', { count: 'exact', head: true })
            .eq('quiz_id', quiz.id)
            .eq('event_type', 'complete')
            .gte('created_at', sevenDaysAgo.toISOString());

          const { count: weekLeads } = await supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('quiz_id', quiz.id)
            .gte('created_at', sevenDaysAgo.toISOString());

          const views = weekViews ?? 0;
          totalViews += views;
          totalCompletions += (weekCompletions ?? 0);
          totalLeads += (weekLeads ?? 0);

          if (views > topQuiz.views) {
            topQuiz = { title: quiz.title, views };
          }
        }

        // Skip if no activity
        if (totalViews === 0 && totalCompletions === 0 && totalLeads === 0) {
          skipped++;
          continue;
        }

        // Build actionable insight
        var completionRate = totalViews > 0 ? Math.round((totalCompletions / totalViews) * 100) : 0;
        var leadRate = totalViews > 0 ? Math.round((totalLeads / totalViews) * 100) : 0;
        var insight = '';
        if (totalViews > 0 && completionRate < 30) {
          insight = 'Your completion rate is below 30%. Try shortening your quiz to 5-7 questions for better engagement.';
        } else if (totalLeads > 0 && leadRate < 10) {
          insight = 'Visitors are completing quizzes but not leaving their email. Consider making the lead form more enticing with a specific outcome preview.';
        } else if (totalViews < 10) {
          insight = 'Traffic is low this week. Share your quiz link on social media or add the embed to a high-traffic page on your site.';
        } else if (completionRate >= 50) {
          insight = 'Great completion rate! Your quiz is engaging visitors well. Consider adding an email follow-up campaign to convert leads.';
        } else {
          insight = 'Solid week. Check your analytics dashboard for question-level drop-off data to find optimization opportunities.';
        }

        var html = [
          '<div style="font-family:\'DM Sans\',system-ui,sans-serif;max-width:520px;margin:0 auto;padding:0;background:#F7F7F5">',
          '  <div style="padding:36px 32px 28px;background:#FFFFFF;border-radius:0 0 16px 16px">',
          '    <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px">',
          '      <div style="width:32px;height:32px;background:#0D7377;border-radius:10px;display:flex;align-items:center;justify-content:center">',
          '        <img src="https://app.squarespell.com/logo-icon-white.png" width="14" height="14" alt="" style="display:block" />',
          '      </div>',
          '      <span style="font-size:17px;font-weight:700;color:#1A1A1A;letter-spacing:-0.02em">Squarespell</span>',
          '    </div>',
          '    <h1 style="font-size:24px;font-weight:800;color:#1A1A1A;letter-spacing:-0.03em;margin:0 0 6px">Your weekly recap</h1>',
          '    <p style="font-size:14px;color:rgba(26,26,26,0.5);margin:0 0 28px">Here is how your quizzes performed in the last 7 days.</p>',
          '',
          '    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F5;border:1px solid #E4E3E0;border-radius:12px;overflow:hidden;margin-bottom:24px">',
          '      <tr>',
          '        <td style="padding:18px 20px;border-bottom:1px solid #E4E3E0;width:50%">',
          '          <div style="font-size:11px;font-weight:700;color:rgba(26,26,26,0.4);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Views</div>',
          '          <div style="font-size:28px;font-weight:800;color:#1A1A1A;letter-spacing:-0.03em">' + totalViews + '</div>',
          '        </td>',
          '        <td style="padding:18px 20px;border-bottom:1px solid #E4E3E0;width:50%">',
          '          <div style="font-size:11px;font-weight:700;color:rgba(26,26,26,0.4);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Completions</div>',
          '          <div style="font-size:28px;font-weight:800;color:#1A1A1A;letter-spacing:-0.03em">' + totalCompletions + '</div>',
          '        </td>',
          '      </tr>',
          '      <tr>',
          '        <td style="padding:18px 20px;width:50%">',
          '          <div style="font-size:11px;font-weight:700;color:rgba(26,26,26,0.4);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">New leads</div>',
          '          <div style="font-size:28px;font-weight:800;color:#0D7377;letter-spacing:-0.03em">' + totalLeads + '</div>',
          '        </td>',
          '        <td style="padding:18px 20px;width:50%">',
          '          <div style="font-size:11px;font-weight:700;color:rgba(26,26,26,0.4);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Completion rate</div>',
          '          <div style="font-size:28px;font-weight:800;color:#1A1A1A;letter-spacing:-0.03em">' + completionRate + '%</div>',
          '        </td>',
          '      </tr>',
          '    </table>',
          '',
          '    <div style="background:rgba(13,115,119,0.06);border:1px solid rgba(13,115,119,0.15);border-radius:10px;padding:16px 18px;margin-bottom:24px">',
          '      <div style="font-size:11px;font-weight:700;color:#0D7377;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Insight</div>',
          '      <div style="font-size:14px;color:#1A1A1A;line-height:1.55">' + insight + '</div>',
          '    </div>',
          '',
          '    <div style="margin-bottom:24px">',
          '      <div style="font-size:11px;font-weight:700;color:rgba(26,26,26,0.4);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">Top quiz this week</div>',
          '      <div style="font-size:15px;font-weight:600;color:#1A1A1A">' + topQuiz.title + ' (' + topQuiz.views + ' views)</div>',
          '    </div>',
          '',
          '    <a href="' + APP_URL + '/dashboard" style="display:block;width:100%;background:#0D7377;color:#FFFFFF;padding:14px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;text-align:center;box-sizing:border-box">View your dashboard</a>',
          '  </div>',
          '',
          '  <div style="padding:20px 32px;text-align:center">',
          '    <p style="font-size:12px;color:rgba(26,26,26,0.35);margin:0;line-height:1.5">Squarespell weekly digest. <a href="' + APP_URL + '/dashboard/billing" style="color:rgba(26,26,26,0.5)">Manage email preferences</a></p>',
          '  </div>',
          '</div>',
        ].join('\n');

        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'Squarespell <hello@squarespell.com>',
          to: user.email,
          subject: totalLeads > 0 ? `${totalLeads} new lead${totalLeads === 1 ? '' : 's'} this week - your Squarespell recap` : `Your weekly Squarespell recap - ${totalViews} views`,
          html,
        });

        emailsSent++;
      } catch (e) {
        log.error('Failed to send digest', { userId: user.id, err: e });
      }
    }

    res.json({ success: true, sent: emailsSent, skipped });
  } catch (err: any) {
    log.error('Weekly digest error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to send digests' });
  }
});

// ── Cron: Lifecycle Emails (onboarding + trial + win-back) ──────────────────
export const trialReminderRouter = Router();
trialReminderRouter.post('/trial-reminders', async (req, res) => {
  var cronSecret = req.headers['x-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get all users who are on trial or free (not yet paid)
    var { data: users, error: usersError } = await supabase
      .from('users')
      .select('id,email,first_name,created_at,plan,last_login_at');

    if (usersError) throw usersError;

    var emailsSent = 0;
    var errors = 0;

    for (var i = 0; i < (users || []).length; i++) {
      var user = users![i];
      try {
        var createdAt = new Date(user.created_at);
        var now = new Date();
        var daysSinceSignup = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        var isTrial = user.plan === 'trial' || user.plan === 'free';
        var isPaid = user.plan === 'starter' || user.plan === 'growth' || user.plan === 'pro' || user.plan === 'agency';

        // ── STAGE 1: ONBOARDING (trial/free users only) ──

        // Day 1: Getting started guide
        if (daysSinceSignup === 1 && isTrial) {
          var { count: qCount } = await supabase.from('quizzes').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
          if ((qCount || 0) === 0) {
            var sent = await sendPlatformEmail({ userId: user.id, email: user.email, emailType: 'getting_started', firstName: user.first_name || '' });
            if (sent) emailsSent++;
          }
        }

        // Day 3: Template showcase
        if (daysSinceSignup === 3 && isTrial) {
          var sent2 = await sendPlatformEmail({ userId: user.id, email: user.email, emailType: 'template_showcase', firstName: user.first_name || '' });
          if (sent2) emailsSent++;
        }

        // Day 5: First quiz nudge (only if they still have 0 quizzes)
        if (daysSinceSignup === 5 && isTrial) {
          var { count: qCount5 } = await supabase.from('quizzes').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
          if ((qCount5 || 0) === 0) {
            var sent3 = await sendPlatformEmail({ userId: user.id, email: user.email, emailType: 'first_quiz_nudge', firstName: user.first_name || '' });
            if (sent3) emailsSent++;
          }
        }

        // ── STAGE 2: TRIAL COUNTDOWN (trial/free users only, 14-day trial) ──

        // Day 7: Halfway reminder
        if (daysSinceSignup === 7 && isTrial) {
          var { count: qc7 } = await supabase.from('quizzes').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
          var { count: lc7 } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
          var sent4 = await sendPlatformEmail({
            userId: user.id, email: user.email, emailType: 'trial_day7_halfway', firstName: user.first_name || '',
            data: { quizCount: qc7 || 0, leadCount: lc7 || 0 },
          });
          if (sent4) emailsSent++;
        }

        // Day 11: 3 days left
        if (daysSinceSignup === 11 && isTrial) {
          var sent5 = await sendPlatformEmail({ userId: user.id, email: user.email, emailType: 'trial_day11_3days', firstName: user.first_name || '' });
          if (sent5) emailsSent++;
        }

        // Day 13: Last day warning
        if (daysSinceSignup === 13 && isTrial) {
          var sent6 = await sendPlatformEmail({ userId: user.id, email: user.email, emailType: 'trial_day13_lastday', firstName: user.first_name || '' });
          if (sent6) emailsSent++;
        }

        // Day 14: Trial expired
        if (daysSinceSignup === 14 && isTrial) {
          var sent7 = await sendPlatformEmail({ userId: user.id, email: user.email, emailType: 'trial_day14_expired', firstName: user.first_name || '' });
          if (sent7) emailsSent++;
        }

        // ── STAGE 5: WIN-BACK (paid users who went inactive) ──

        if (isPaid && user.last_login_at) {
          var lastLogin = new Date(user.last_login_at);
          var daysSinceLogin = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));

          // 7 days inactive
          if (daysSinceLogin >= 7 && daysSinceLogin < 10) {
            var sevenAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
            var { count: rv } = await supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event_type', 'view').gte('created_at', sevenAgo);
            var { count: rl } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', sevenAgo);
            var sent8 = await sendPlatformEmail({
              userId: user.id, email: user.email, emailType: 'winback_7d', firstName: user.first_name || '',
              data: { recentViews: rv || 0, recentLeads: rl || 0 },
            });
            if (sent8) emailsSent++;
          }

          // 30 days inactive
          if (daysSinceLogin >= 30 && daysSinceLogin < 33) {
            var sent9 = await sendPlatformEmail({ userId: user.id, email: user.email, emailType: 'winback_30d', firstName: user.first_name || '' });
            if (sent9) emailsSent++;
          }

          // 60 days inactive
          if (daysSinceLogin >= 60 && daysSinceLogin < 63) {
            var sent10 = await sendPlatformEmail({ userId: user.id, email: user.email, emailType: 'winback_60d', firstName: user.first_name || '' });
            if (sent10) emailsSent++;
          }
        }

      } catch (e: any) {
        errors++;
        log.error('[Lifecycle] Failed for user ' + user.id, { err: e?.message });
      }
    }

    res.json({ success: true, sent: emailsSent, errors: errors, usersProcessed: (users || []).length });
  } catch (err: any) {
    log.error('[Lifecycle] Cron error:', { err: err?.message });
    res.status(500).json({ error: err.message || 'Lifecycle cron failed' });
  }
});

// ── Cron: Monthly Report ────────────────────────────────────────────────────
trialReminderRouter.post('/monthly-report', async (req, res) => {
  var cronSecret = req.headers['x-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    var { data: users, error: usersError } = await supabase
      .from('users')
      .select('id,email,first_name,plan')
      .in('plan', ['starter', 'growth', 'pro', 'agency']);
    if (usersError) throw usersError;

    var emailsSent = 0;
    var now = new Date();
    var monthName = now.toLocaleString('en-US', { month: 'long' });
    var thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

    for (var i = 0; i < (users || []).length; i++) {
      var user = users![i];
      try {
        var { data: quizzes } = await supabase.from('quizzes').select('id,title').eq('user_id', user.id);
        var totalViews = 0; var totalCompletions = 0; var totalLeads = 0;
        var topQuiz = '';  var topViews = 0;

        for (var j = 0; j < (quizzes || []).length; j++) {
          var quiz = quizzes![j];
          var { count: v } = await supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('quiz_id', quiz.id).eq('event_type', 'view').gte('created_at', thirtyDaysAgo);
          var { count: c } = await supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('quiz_id', quiz.id).eq('event_type', 'complete').gte('created_at', thirtyDaysAgo);
          var { count: l } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('quiz_id', quiz.id).gte('created_at', thirtyDaysAgo);
          totalViews += (v || 0); totalCompletions += (c || 0); totalLeads += (l || 0);
          if ((v || 0) > topViews) { topViews = v || 0; topQuiz = quiz.title; }
        }

        if (totalViews === 0 && totalLeads === 0) continue;

        var convRate = totalViews > 0 ? Math.round((totalLeads / totalViews) * 100) : 0;
        var sent = await sendPlatformEmail({
          userId: user.id, email: user.email, emailType: 'monthly_report', firstName: user.first_name || '',
          data: { monthName: monthName, stats: { views: totalViews, completions: totalCompletions, leads: totalLeads, conversionRate: convRate, topQuiz: topQuiz } },
        });
        if (sent) emailsSent++;
      } catch (e: any) {
        log.error('[MonthlyReport] Failed for user ' + user.id, { err: e?.message });
      }
    }
    res.json({ success: true, sent: emailsSent });
  } catch (err: any) {
    log.error('[MonthlyReport] Cron error:', { err: err?.message });
    res.status(500).json({ error: err.message || 'Monthly report cron failed' });
  }
});

// ── Cron: Lead Milestones + First Lead ──────────────────────────────────────
trialReminderRouter.post('/lead-milestones', async (req, res) => {
  var cronSecret = req.headers['x-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    var { data: users, error: usersError } = await supabase
      .from('users')
      .select('id,email,first_name');
    if (usersError) throw usersError;

    var emailsSent = 0;
    var milestones = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

    for (var i = 0; i < (users || []).length; i++) {
      var user = users![i];
      try {
        var { count: totalLeads } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
        var count = totalLeads || 0;

        // First lead congratulation
        if (count === 1) {
          var sent = await sendPlatformEmail({
            userId: user.id, email: user.email, emailType: 'first_lead_congrats', firstName: user.first_name || '',
            data: { leadCount: 1 },
          });
          if (sent) emailsSent++;
        }

        // Milestone emails
        for (var m = 0; m < milestones.length; m++) {
          if (count >= milestones[m]) {
            var sent2 = await sendPlatformEmail({
              userId: user.id, email: user.email,
              emailType: 'lead_milestone',
              firstName: user.first_name || '',
              data: { milestone: milestones[m] },
            });
            if (sent2) emailsSent++;
          }
        }
      } catch (e: any) {
        log.error('[LeadMilestone] Failed for user ' + user.id, { err: e?.message });
      }
    }
    res.json({ success: true, sent: emailsSent });
  } catch (err: any) {
    log.error('[LeadMilestone] Cron error:', { err: err?.message });
    res.status(500).json({ error: err.message || 'Lead milestone cron failed' });
  }
});

// ── Cron: Database Cleanup ───────────────────────────────────────────────────
export const cleanupRouter = Router();

/**
 * POST /api/admin/cleanup
 * Requires cron secret or admin authentication
 * Runs database cleanup operations (delete old events, archive cleanup, etc.)
 */
cleanupRouter.post('/cleanup', async (req: AuthenticatedRequest, res) => {
  // Check for cron secret (for scheduled cleanup jobs)
  const cronSecret = req.headers['x-cron-secret'];
  if (cronSecret && cronSecret === process.env.CRON_SECRET) {
    // Valid cron job - proceed with cleanup
    try {
      const summary = await runCleanup();
      res.json(summary);
    } catch (err: any) {
      log.error('Cleanup error:', { err: err });
      res.status(500).json({
        success: false,
        error: err.message ?? 'Cleanup failed',
        cleanupTimestamp: new Date().toISOString(),
      });
    }
    return;
  }

  // Check for authenticated user (admin only)
  try {
    // Verify user is authenticated
    if (!req.dbUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user from database to check if admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', req.dbUserId)
      .single();

    if (userError || !userData) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if user is admin - allow specific admin emails
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
    const isAdmin = adminEmails.length > 0 && adminEmails.includes(userData.email);

    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden - admin access required' });
    }

    const summary = await runCleanup();
    res.json(summary);
  } catch (err: any) {
    log.error('Cleanup error:', { err: err });
    res.status(500).json({
      success: false,
      error: err.message ?? 'Cleanup failed',
      cleanupTimestamp: new Date().toISOString(),
    });
  }
});

// ── Quiz Payments ─────────────────────────────────────────────────────────────
export const quizPaymentsRouter = Router();

// POST /api/public/quiz/:slug/checkout - Create checkout session for payment
quizPaymentsRouter.post('/public/quiz/:slug/checkout', async (req, res) => {
  try {
    const { lead_id, amount_cents, currency = 'usd', success_url, cancel_url } = req.body;

    if (!lead_id || !amount_cents || !success_url || !cancel_url) {
      return res.status(400).json({
        error: 'lead_id, amount_cents, success_url, and cancel_url are required'
      });
    }

    // Get the quiz by slug to verify it exists and get quiz_id
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id')
      .eq('slug', req.params.slug)
      .single();

    if (quizError || !quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const result = await quizPaymentsService.createCheckoutSession({
      quizId: quiz.id,
      leadId: lead_id,
      amountCents: amount_cents,
      currency: currency,
      successUrl: success_url,
      cancelUrl: cancel_url
    });

    res.json({ checkout_url: result.url, session_id: result.sessionId });
  } catch (err: any) {
    log.error('Checkout session error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to create checkout session' });
  }
});

// POST /api/webhooks/stripe-quiz-payment - Stripe webhook for quiz payments
quizPaymentsRouter.post('/webhooks/stripe-quiz-payment', async (req, res) => {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'] as string,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    log.error('Webhook signature verification failed:', { err: err });
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    await quizPaymentsService.handlePaymentWebhook(event);
    res.json({ received: true });
  } catch (err: any) {
    log.error('Error handling payment webhook:', { err: err });
    res.status(500).json({ error: err.message ?? 'Webhook processing failed' });
  }
});

// GET /api/quizzes/:id/payments - List payments for a quiz (authenticated)
quizPaymentsRouter.get('/quizzes/:id/payments', requireAuth, attachUser, async (req: AuthenticatedRequest, res) => {
  try {
    // Verify quiz ownership
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, user_id')
      .eq('id', req.params.id)
      .single();

    if (quizError || !quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (quiz.user_id !== req.dbUserId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const payments = await quizPaymentsService.getPaymentsForQuiz(req.params.id);
    res.json(payments);
  } catch (err: any) {
    log.error('Get payments error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to fetch payments' });
  }
});

// ── Templates Router (stub for now) ─────────────────────────────────────────
export const templatesRouter = Router();
templatesRouter.get('/', (req, res) => {
  res.json({ templates: [] });
});

// ── Media Router (upload to Supabase Storage + Pexels search) ────────────────
export const mediaRouter = Router();

// POST /api/media/upload — accepts base64-encoded file, stores in Supabase storage
mediaRouter.post('/upload', requireAuth, attachUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { data: base64Data, fileName, contentType } = req.body;
    if (!base64Data || !fileName) {
      return res.status(400).json({ error: 'data (base64) and fileName are required' });
    }
    const userId = req.userId || 'anon';
    const ext = fileName.split('.').pop() || 'jpg';
    const safeFileName = `${userId}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const buffer = Buffer.from(base64Data, 'base64');

    // Upload to Supabase storage bucket "quiz-media"
    const { data, error } = await supabase.storage
      .from('quiz-media')
      .upload(safeFileName, buffer, {
        contentType: contentType || 'image/jpeg',
        upsert: false,
      });

    if (error) {
      log.error('Supabase upload error', { error: error.message });
      return res.status(500).json({ error: 'Upload failed: ' + error.message });
    }

    const { data: urlData } = supabase.storage
      .from('quiz-media')
      .getPublicUrl(safeFileName);

    res.json({ url: urlData.publicUrl, path: safeFileName });
  } catch (err: any) {
    log.error('Media upload error', { error: err.message });
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// GET /api/media/search?q=...&page=1 — search Pexels for stock images
mediaRouter.get('/search', requireAuth, attachUser, async (req: AuthenticatedRequest, res) => {
  try {
    const query = (req.query.q as string || '').trim();
    const page = parseInt(req.query.page as string) || 1;
    if (!query) return res.json({ results: [] });

    const pexelsKey = process.env.PEXELS_ACCESS_KEY;
    if (!pexelsKey) {
      return res.status(503).json({ error: 'Stock image search not configured' });
    }
    const url = 'https://api.pexels.com/v1/search?query=' + encodeURIComponent(query) + '&per_page=15&page=' + page;
    const resp = await fetch(url, { headers: { Authorization: pexelsKey } });
    if (!resp.ok) {
      return res.status(502).json({ error: 'Pexels API error: ' + resp.status });
    }
    const data: any = await resp.json();
    const results = (data.photos || []).map((p: any) => ({
      id: String(p.id),
      thumb: p.src?.medium || p.src?.small,
      regular: p.src?.large2x || p.src?.large || p.src?.original,
      alt: p.alt || query,
      credit: p.photographer || 'Pexels',
      creditUrl: p.photographer_url || 'https://pexels.com',
    }));
    res.json({ results, total: data.total_results || 0 });
  } catch (err: any) {
    log.error('Pexels search error', { error: err.message });
    res.status(500).json({ error: err.message || 'Search failed' });
  }
});

// ── Referrals Router (affiliate/referral system) ──────────────────────────────
export var referralsRouter = Router();

// GET /api/referrals/code — get user's referral code (auth required)
referralsRouter.get('/code', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    if (!req.dbUserId) {
      return res.status(401).json({ error: 'User not found' });
    }

    var result = await getReferralCode(req.dbUserId);
    if (!result) {
      return res.status(500).json({ error: 'Failed to get referral code' });
    }

    var appUrl = process.env.APP_URL || 'https://app.squarespell.com';
    var referralUrl = appUrl + '/sign-up?ref=' + result.code;

    res.json({
      code: result.code,
      url: referralUrl,
    });
  } catch (err: any) {
    log.error('Get referral code error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to get referral code' });
  }
});

// GET /api/referrals/stats — get referral stats (auth required)
referralsRouter.get('/stats', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    if (!req.dbUserId) {
      return res.status(401).json({ error: 'User not found' });
    }

    var stats = await getReferralStats(req.dbUserId);
    if (!stats) {
      return res.status(500).json({ error: 'Failed to get referral stats' });
    }

    res.json(stats);
  } catch (err: any) {
    log.error('Get referral stats error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to get referral stats' });
  }
});

// GET /api/referrals/list — list all referrals (auth required)
referralsRouter.get('/list', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    if (!req.dbUserId) {
      return res.status(401).json({ error: 'User not found' });
    }

    var referrals = await listReferrals(req.dbUserId);
    res.json({ referrals });
  } catch (err: any) {
    log.error('List referrals error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to list referrals' });
  }
});

// POST /api/public/referral/track — public endpoint to track referral signup
export var publicReferralRouter = Router();

publicReferralRouter.post('/track', async function(req, res) {
  try {
    var { code, email } = req.body;
    if (!code || !email) {
      return res.status(400).json({ error: 'code and email required' });
    }

    var result = await trackReferral(code, email);
    if (!result) {
      return res.status(400).json({ error: 'Invalid or expired referral code' });
    }

    res.json({ success: true, referralId: result.id });
  } catch (err: any) {
    log.error('Track referral error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to track referral' });
  }
});

// ── White-Label Branding ──────────────────────────────────────────────────────

export var whiteLabelRouter = Router();

// GET /api/white-label — get current user's white-label settings (auth required)
whiteLabelRouter.get('/', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    if (!req.dbUserId) {
      return res.status(401).json({ error: 'User not found' });
    }

    var result = await supabase
      .from('users')
      .select('white_label_enabled, custom_brand_name, custom_brand_logo_url, custom_brand_color, hide_powered_by')
      .eq('id', req.dbUserId)
      .single();

    if (result.error || !result.data) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      white_label_enabled: result.data.white_label_enabled,
      custom_brand_name: result.data.custom_brand_name,
      custom_brand_logo_url: result.data.custom_brand_logo_url,
      custom_brand_color: result.data.custom_brand_color,
      hide_powered_by: result.data.hide_powered_by,
    });
  } catch (err: any) {
    log.error('Get white-label error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to get white-label settings' });
  }
});

// PATCH /api/white-label — update white-label settings (auth required, agency plan only)
whiteLabelRouter.patch('/', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    if (!req.dbUserId) {
      return res.status(401).json({ error: 'User not found' });
    }

    var userResult = await supabase
      .from('users')
      .select('plan')
      .eq('id', req.dbUserId)
      .single();

    if (userResult.error || !userResult.data) {
      return res.status(404).json({ error: 'User not found' });
    }

    var plan = userResult.data.plan ?? 'free';
    if (plan !== 'agency' && plan !== 'business') {
      return res.status(403).json({
        error: 'plan_required',
        message: 'White-label branding is only available on the Business plan.',
      });
    }

    var updateData: any = {};
    if (req.body.white_label_enabled !== undefined) updateData.white_label_enabled = req.body.white_label_enabled;
    if (req.body.custom_brand_name !== undefined) updateData.custom_brand_name = req.body.custom_brand_name;
    if (req.body.custom_brand_logo_url !== undefined) updateData.custom_brand_logo_url = req.body.custom_brand_logo_url;
    if (req.body.custom_brand_color !== undefined) updateData.custom_brand_color = req.body.custom_brand_color;
    if (req.body.hide_powered_by !== undefined) updateData.hide_powered_by = req.body.hide_powered_by;

    var updateResult = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.dbUserId)
      .select();

    if (updateResult.error) {
      throw updateResult.error;
    }

    res.json({
      success: true,
      white_label_enabled: updateResult.data?.[0]?.white_label_enabled,
      custom_brand_name: updateResult.data?.[0]?.custom_brand_name,
      custom_brand_logo_url: updateResult.data?.[0]?.custom_brand_logo_url,
      custom_brand_color: updateResult.data?.[0]?.custom_brand_color,
      hide_powered_by: updateResult.data?.[0]?.hide_powered_by,
    });
  } catch (err: any) {
    log.error('Update white-label error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to update white-label settings' });
  }
});

// GET /api/public/white-label/:userId — public endpoint to get user's white-label settings
export var publicWhiteLabelRouter = Router();

publicWhiteLabelRouter.get('/:userId', async function(req, res) {
  try {
    var userId = req.params.userId;
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    var result = await supabase
      .from('users')
      .select('white_label_enabled, custom_brand_name, custom_brand_logo_url, custom_brand_color, hide_powered_by')
      .eq('id', userId)
      .single();

    if (result.error || !result.data) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!result.data.white_label_enabled) {
      return res.status(200).json({
        white_label_enabled: false,
      });
    }

    res.json({
      white_label_enabled: result.data.white_label_enabled,
      custom_brand_name: result.data.custom_brand_name,
      custom_brand_logo_url: result.data.custom_brand_logo_url,
      custom_brand_color: result.data.custom_brand_color,
      hide_powered_by: result.data.hide_powered_by,
    });
  } catch (err: any) {
    log.error('Get public white-label error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to get white-label settings' });
  }
});

// ── Admin Analytics ───────────────────────────────────────────────────────────
export var adminAnalyticsRouter = Router();

/**
 * GET /api/admin/metrics
 * Requires admin authentication (ADMIN_EMAILS env var)
 * Returns key business metrics: MRR, churn, activation, user counts, revenue
 */
adminAnalyticsRouter.get('/metrics', requireAuth, attachUser, async (req: AuthenticatedRequest, res) => {
  try {
    // Verify user is authenticated
    if (!req.dbUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user from database to check if admin
    var userResult = await supabase
      .from('users')
      .select('id, email')
      .eq('id', req.dbUserId)
      .single();

    if (userResult.error || !userResult.data) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if user is admin - allow specific admin emails
    var adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(function(e) { return e.trim(); }).filter(Boolean);
    var isAdmin = adminEmails.length > 0 && adminEmails.includes(userResult.data.email);

    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden - admin access required' });
    }

    // Get all users
    var usersResult = await supabase.from('users').select('id, email, plan, created_at').order('created_at', { ascending: false });
    if (usersResult.error) throw usersResult.error;
    var allUsers = usersResult.data || [];

    // Count total users
    var totalUsers = allUsers.length;

    // Get current date and calculate dates for metrics
    var now = new Date();
    var thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    var lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    var lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    var thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Count new users this month
    var newUsersThisMonth = allUsers.filter(function(u) {
      return new Date(u.created_at) >= thisMonthStart;
    }).length;

    // Count active users (logged in last 30 days) - approximate via analytics_events
    var activeResult = await supabase
      .from('analytics_events')
      .select('id, metadata')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .limit(1000);
    if (activeResult.error) throw activeResult.error;
    var activeUserIds = new Set();
    (activeResult.data || []).forEach(function(event: any) {
      if (event.metadata && event.metadata.user_id) {
        activeUserIds.add(event.metadata.user_id);
      }
    });
    var activeUsers = activeUserIds.size;

    // Count quizzes
    var quizzesResult = await supabase.from('quizzes').select('id, status, user_id').order('created_at', { ascending: false });
    if (quizzesResult.error) throw quizzesResult.error;
    var allQuizzes = quizzesResult.data || [];
    var totalQuizzes = allQuizzes.length;
    var publishedQuizzes = allQuizzes.filter(function(q) { return q.status === 'live'; }).length;

    // Count leads
    var leadsResult = await supabase.from('leads').select('id, created_at').order('created_at', { ascending: false });
    if (leadsResult.error) throw leadsResult.error;
    var allLeads = leadsResult.data || [];
    var totalLeads = allLeads.length;

    var leadsThisMonth = allLeads.filter(function(l) {
      return new Date(l.created_at) >= thisMonthStart;
    }).length;

    // Calculate MRR (Monthly Recurring Revenue)
    // Sum up all paid plans: starter ($29), growth ($99), pro ($199), agency ($499)
    var planPrices: Record<string, number> = {
      'starter': 19,
      'growth': 19,
      'pro': 39,
      'agency': 79
    };
    var mrr = 0;
    allUsers.forEach(function(u) {
      if (u.plan && planPrices[u.plan]) {
        mrr += planPrices[u.plan];
      }
    });

    // Get revenue from quiz_payments
    var paymentsResult = await supabase.from('quiz_payments').select('id, amount_cents, created_at');
    if (paymentsResult.error) throw paymentsResult.error;
    var allPayments = paymentsResult.data || [];

    var totalRevenue = 0;
    var revenueThisMonth = 0;
    allPayments.forEach(function(p: any) {
      var amt = Number(p.amount_cents || 0) / 100;
      totalRevenue += amt;
      if (new Date(p.created_at) >= thisMonthStart) {
        revenueThisMonth += amt;
      }
    });

    // Count users by plan
    var planCounts: Record<string, number> = {
      'free': 0,
      'starter': 0,
      'growth': 0,
      'pro': 0,
      'agency': 0,
      'trial': 0
    };
    allUsers.forEach(function(u) {
      var plan = u.plan || 'free';
      if (planCounts.hasOwnProperty(plan)) {
        planCounts[plan]++;
      }
    });

    // Calculate churn (users from last month who are no longer active or downgraded)
    var usersLastMonth = allUsers.filter(function(u) {
      var created = new Date(u.created_at);
      return created >= lastMonthStart && created <= lastMonthEnd;
    }).length;

    var lastMonthEnd30DaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    var usersFromTwoMonthsAgo = allUsers.filter(function(u) {
      var created = new Date(u.created_at);
      return created < lastMonthStart && created >= lastMonthEnd30DaysAgo;
    }).length;

    var estimatedChurnRate = usersFromTwoMonthsAgo > 0 ? Math.round((1 - usersLastMonth / usersFromTwoMonthsAgo) * 100) : 0;

    return res.json({
      timestamp: now.toISOString(),
      users: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth,
        activeLastMonth: Math.max(activeUsers, 0),
        byPlan: planCounts
      },
      quizzes: {
        total: totalQuizzes,
        published: publishedQuizzes,
        draft: totalQuizzes - publishedQuizzes
      },
      leads: {
        total: totalLeads,
        thisMonth: leadsThisMonth,
        avgPerUser: totalUsers > 0 ? Math.round(totalLeads / totalUsers * 100) / 100 : 0
      },
      revenue: {
        mrr: Math.round(mrr * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        thisMonth: Math.round(revenueThisMonth * 100) / 100,
        quizPaymentsCount: allPayments.length
      },
      metrics: {
        estimatedChurnRate: estimatedChurnRate,
        activationRate: totalUsers > 0 ? Math.round((publishedQuizzes / totalUsers) * 100) : 0,
        leadsPerQuiz: totalQuizzes > 0 ? Math.round((totalLeads / totalQuizzes) * 100) / 100 : 0
      }
    });
  } catch (err: any) {
    log.error('Admin metrics error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to fetch metrics' });
  }
});
