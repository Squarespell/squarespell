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
import { runCleanup } from '../services/databaseCleanup';
import { processScheduledCampaigns } from '../services/scheduledSendDispatcher';
import * as quizPaymentsService from '../services/quizPayments';
import { supabase } from '../db/supabaseClient';
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

// ── Public Preview Generate (no auth, rate-limited by IP) ────────────────────
const previewRateMap = new Map<string, { count: number; resetAt: number }>();
export const previewRouter = Router();
previewRouter.post('/preview-generate', async (req, res) => {
  // Simple rate limit: 5 previews per IP per hour
  const ip = (req.headers['x-forwarded-for'] as string || req.ip || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const entry = previewRateMap.get(ip);
  if (entry && entry.resetAt > now && entry.count >= 5) {
    return res.status(429).json({ error: 'Too many previews. Please try again later or sign up for unlimited access.' });
  }
  if (!entry || entry.resetAt <= now) {
    previewRateMap.set(ip, { count: 1, resetAt: now + 3600000 });
  } else {
    entry.count++;
  }

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
  const ip = (req.headers['x-forwarded-for'] as string || req.ip || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const entry = previewRateMap.get(ip);
  if (entry && entry.resetAt > now && entry.count >= 5) {
    return res.status(429).json({ error: 'Too many previews. Please try again later or sign up for unlimited access.' });
  }
  if (!entry || entry.resetAt <= now) {
    previewRateMap.set(ip, { count: 1, resetAt: now + 3600000 });
  } else {
    entry.count++;
  }

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
    .select('id,title,questions,outcomes,branding,settings')
    .eq('slug', key).eq('status', 'live').maybeSingle();
  // Fallback: treat the param as a quiz id (covers id-based shared links)
  if (!data) {
    const r = await supabase
      .from('quizzes')
      .select('id,title,questions,outcomes,branding,settings')
      .eq('id', key).eq('status', 'live').maybeSingle();
    data = r.data;
  }
  if (!data) return res.status(404).json({ error: 'Quiz not found' });
  res.json(data);
});
publicQuizRouter.post('/:slug/event', async (req, res) => {
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
  const { name, email, answers, outcome_id, time_to_complete_ms, consent, consent_text } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  const { data: quiz } = await supabase.from('quizzes').select('id,user_id,title,questions,outcomes,branding,settings,mode').eq('slug', req.params.slug).eq('status', 'live').single();
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  const { data: owner } = await supabase.from('users').select('plan').eq('id', quiz.user_id).single();
  const { leads: leadLimit } = getPlanLimits(owner?.plan ?? 'free');
  const { count } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('quiz_id', quiz.id);
  if ((count ?? 0) >= leadLimit) return res.status(403).json({ error: 'Lead limit reached' });
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

  const { data: leadData, error } = await supabase.from('leads').insert({ quiz_id: quiz.id, user_id: quiz.user_id, name: name ?? null, email, answers: answers ?? {}, outcome_id: outcome_id ?? null, metadata, consent: consent === true, consent_text: consent ? (consent_text || null) : null }).select('id, metadata, score').single();
  if (error) return res.status(500).json({ error: error.message });
  const leadId = leadData?.id;
  await supabase.rpc('increment_lead_count', { qid: quiz.id });

  const { data: ownerUser } = await supabase.from('users').select('email').eq('id', quiz.user_id).single();

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
        const ctaUrl = matchedOutcome.cta_url || (quiz.branding as any)?.ctaUrl;
        const ctaText = matchedOutcome.cta_text || 'Learn More';
        sendResultEmail({
          to: email,
          quizTitle: quiz.title,
          outcomeTitle: matchedOutcome.title || 'Your Result',
          outcomeDescription: matchedOutcome.description || '',
          ctaUrl,
          ctaText,
          branding: (quiz.branding as any) || {},
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
      leadData?.score ?? null,
      [],
      (quiz as any).mode || null,
    ).catch((e: any) => log.info('[EmailSeq] enqueue failed', { err: e?.message }));
  } else if (!canEmail && outcome_id) {
    log.info('[GDPR] Skipping sequence emails - no consent', { email });
  }

  // Fire Zapier/webhook integrations
  try {
    const { data: integrations } = await supabase.from('integrations').select('id,type,config').eq('user_id', quiz.user_id).eq('active', true);
    if (integrations && integrations.length > 0) {
      const { data: quizMeta } = await supabase.from('quizzes').select('title,slug').eq('id', quiz.id).single();
      const webhookPayload = {
        event: 'lead.captured',
        lead: { name: name ?? '', email, outcome_id: outcome_id ?? '', answers: answers ?? {}, captured_at: new Date().toISOString() },
        quiz: { id: quiz.id, title: quizMeta?.title ?? '', slug: quizMeta?.slug ?? '' },
      };
      for (const integration of integrations) {
        if (integration.type === 'webhook' && integration.config?.url) {
          fetch(integration.config.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(webhookPayload) }).catch(() => {});
        }
      }
    }
  } catch (e) { log.info('Webhook dispatch failed:', { detail: e }); }

  
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
          leadData.score ?? undefined
        ).then((aiSummary) => {
          if (aiSummary && leadId) {
            (async () => {
              try {
                const { error } = await supabase
                  .from('leads')
                  .update({
                    metadata: {
                      ...leadData.metadata,
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
    const limit = Math.min(parseInt((req.query.limit as string) || '200', 10) || 200, 1000);
    const { data, error } = await supabase
      .from('leads')
      .select('id, name, email, answers, outcome_id, created_at, quiz_id, quizzes(id, title, slug)')
      .eq('user_id', req.dbUserId)
      .order('created_at', { ascending: false })
      .limit(limit);
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
        quizzes(id, title, slug, mode, questions, outcomes, branding, settings)
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

// ── Integrations ─────────────────────────────────────────────────────────────
export const integrationsRouter = Router();
integrationsRouter.use(requireAuth, attachUser);

integrationsRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const { data, error } = await supabase.from('integrations').select('id,type,config,active,created_at').eq('user_id', req.dbUserId).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

integrationsRouter.post('/', async (req: AuthenticatedRequest, res) => {
  const { type, config } = req.body;
  if (!type || !config) return res.status(400).json({ error: 'type and config required' });
  if (type === 'webhook' && !config.url) return res.status(400).json({ error: 'Webhook URL required' });
  const { data, error } = await supabase.from('integrations').insert({ user_id: req.dbUserId, type, config, active: true }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

integrationsRouter.patch('/:id', async (req: AuthenticatedRequest, res) => {
  const allowed = ['config', 'active'];
  const updates: Record<string, any> = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  const { data, error } = await supabase.from('integrations').update(updates).eq('id', req.params.id).eq('user_id', req.dbUserId).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

integrationsRouter.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const { error } = await supabase.from('integrations').delete().eq('id', req.params.id).eq('user_id', req.dbUserId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

integrationsRouter.post('/test/:id', async (req: AuthenticatedRequest, res) => {
  const { data: integration } = await supabase.from('integrations').select('type,config').eq('id', req.params.id).eq('user_id', req.dbUserId).single();
  if (!integration) return res.status(404).json({ error: 'Integration not found' });
  if (integration.type === 'webhook' && integration.config?.url) {
    try {
      const testPayload = { event: 'test', lead: { name: 'Test User', email: 'test@example.com', outcome_id: 'test', answers: {}, captured_at: new Date().toISOString() }, quiz: { id: 'test', title: 'Test Quiz', slug: 'test' } };
      const response = await fetch(integration.config.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(testPayload) });
      res.json({ success: response.ok, status: response.status });
    } catch (e: any) { res.json({ success: false, error: e.message }); }
  } else {
    res.status(400).json({ error: 'Unsupported integration type for testing' });
  }
});

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsRouter = Router();
analyticsRouter.use(requireAuth, attachUser);
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
  const { data: user } = await supabase.from('users').select('plan,quiz_count,created_at,email,email_notifications').eq('id', req.dbUserId).single();
  if (!user) return res.status(404).json({ error: 'Not found' });
  const plan = user.plan || 'trial';
  const trialEndsAt = (plan === 'free' || plan === 'trial') && user.created_at
    ? new Date(new Date(user.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    : null;
  res.json({ plan, quiz_count: user.quiz_count, limits: getPlanLimits(plan), trial_ends_at: trialEndsAt, email: user.email || '', email_notifications: user.email_notifications !== false });
});
userRouter.post('/notifications', async (req: AuthenticatedRequest, res) => {
  const { enabled } = req.body;
  await supabase.from('users').update({ email_notifications: !!enabled }).eq('id', req.dbUserId);
  res.json({ ok: true, enabled: !!enabled });
});

// ── Stripe ────────────────────────────────────────────────────────────────────
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const PRICE_IDS: Record<string,Record<string,string>> = { starter: { monthly: process.env.STRIPE_STARTER_PRICE_ID!, yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID! }, pro: { monthly: process.env.STRIPE_PRO_PRICE_ID!, yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID! }, agency: { monthly: process.env.STRIPE_AGENCY_PRICE_ID!, yearly: process.env.STRIPE_AGENCY_YEARLY_PRICE_ID! } };

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
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'] as string, process.env.STRIPE_WEBHOOK_SECRET!); }
  catch { return res.status(400).json({ error: 'Invalid signature' }); }
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.metadata?.db_user_id && s.metadata?.plan) await supabase.from('users').update({ plan: s.metadata.plan, stripe_customer_id: s.customer as string, stripe_subscription_id: s.subscription as string }).eq('id', s.metadata.db_user_id);
  }
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    await supabase.from('users').update({ plan: 'free', stripe_subscription_id: null }).eq('stripe_subscription_id', sub.id);
  }
  res.json({ received: true });
});
stripeRouter.get('/portal', requireAuth, attachUser, async (req: AuthenticatedRequest, res) => {
  const { data: user } = await supabase.from('users').select('stripe_customer_id').eq('id', req.dbUserId).single();
  if (!user?.stripe_customer_id) return res.redirect(`${process.env.FRONTEND_URL}/pricing`);
  const portal = await stripe.billingPortal.sessions.create({ customer: user.stripe_customer_id, return_url: `${process.env.FRONTEND_URL}/dashboard` });
  res.redirect(portal.url);
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

        // Build HTML email
        const html = `
          <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#07090c;color:#f0f2f5">
            <h1 style="font-size:28px;margin:0 0 8px;color:#D2FF1D">Weekly Summary</h1>
            <p style="margin:0 0 24px;color:#888;font-size:14px">Here's how your quizzes performed this week</p>

            <div style="background:#0f1219;border-radius:12px;padding:20px;margin-bottom:20px">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
                <div>
                  <p style="margin:0 0 4px;color:#888;font-size:12px;text-transform:uppercase">Total Views</p>
                  <p style="margin:0;font-size:28px;color:#D2FF1D;font-weight:700">${totalViews}</p>
                </div>
                <div>
                  <p style="margin:0 0 4px;color:#888;font-size:12px;text-transform:uppercase">Completions</p>
                  <p style="margin:0;font-size:28px;color:#D2FF1D;font-weight:700">${totalCompletions}</p>
                </div>
                <div>
                  <p style="margin:0 0 4px;color:#888;font-size:12px;text-transform:uppercase">New Leads</p>
                  <p style="margin:0;font-size:28px;color:#D2FF1D;font-weight:700">${totalLeads}</p>
                </div>
                <div>
                  <p style="margin:0 0 4px;color:#888;font-size:12px;text-transform:uppercase">Top Quiz</p>
                  <p style="margin:0;font-size:14px;color:#f0f2f5">${topQuiz.title}</p>
                </div>
              </div>
            </div>

            <a href="${APP_URL}/dashboard" style="display:block;width:100%;background:#D2FF1D;color:#07090c;padding:14px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;text-align:center;box-sizing:border-box">View Dashboard</a>

            <p style="margin:20px 0 0;padding-top:20px;border-top:1px solid #1a1f2e;color:#666;font-size:12px">This is your weekly quiz performance summary from Squarespell</p>
          </div>
        `;

        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'Squarespell <hello@squarespell.com>',
          to: user.email,
          subject: `Your weekly quiz summary - ${totalViews} views this week`,
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

// ── Cron: Trial Reminders ─────────────────────────────────────────────────────
export const trialReminderRouter = Router();
trialReminderRouter.post('/trial-reminders', async (req, res) => {
  // Verify cron job secret
  const cronSecret = req.headers['x-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!resend) {
    return res.status(500).json({ error: 'Resend not configured' });
  }

  try {
    // Get all trial and free users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id,email,first_name,created_at,plan');

    if (usersError) throw usersError;

    let emailsSent = 0;

    for (const user of users ?? []) {
      try {
        const createdAt = new Date(user.created_at);
        const now = new Date();
        const daysSinceSignup = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

        // Day 1: Welcome email
        if (daysSinceSignup === 1 && (user.plan === 'trial' || user.plan === 'free')) {
          const { count: quizCount } = await supabase
            .from('quizzes')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id);

          // Only send if no quizzes created yet
          if ((quizCount ?? 0) === 0) {
            const html = `
              <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#07090c;color:#f0f2f5">
                <h1 style="font-size:28px;margin:0 0 8px;color:#D2FF1D">Welcome to Squarespell!</h1>
                <p style="margin:0 0 24px;color:#888;font-size:14px">Your 7-day free trial starts now</p>

                <div style="background:#0f1219;border-radius:12px;padding:20px;margin-bottom:20px">
                  <h2 style="margin:0 0 12px;color:#f0f2f5;font-size:16px;font-weight:600">Get started in 3 steps</h2>
                  <ol style="margin:0;padding-left:20px;color:#f0f2f5;font-size:14px;line-height:1.8">
                    <li>Create your first quiz from your website URL</li>
                    <li>Share it with your audience</li>
                    <li>Collect leads and insights in real-time</li>
                  </ol>
                </div>

                <a href="${APP_URL}/dashboard?tab=create" style="display:block;width:100%;background:#D2FF1D;color:#07090c;padding:14px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;text-align:center;box-sizing:border-box;margin-bottom:12px">Create Your First Quiz</a>

                <p style="margin:0;padding-top:20px;border-top:1px solid #1a1f2e;color:#666;font-size:12px">Questions? We're here to help</p>
              </div>
            `;

            await resend.emails.send({
              from: process.env.EMAIL_FROM || 'Squarespell <hello@squarespell.com>',
              to: user.email,
              subject: 'Welcome to Squarespell - Create your first quiz',
              html,
            });

            emailsSent++;
          }
        }

        // Day 5: Trial ending soon (2 days left)
        if (daysSinceSignup === 5 && (user.plan === 'trial' || user.plan === 'free')) {
          const html = `
            <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#07090c;color:#f0f2f5">
              <h1 style="font-size:28px;margin:0 0 8px;color:#D2FF1D">Your trial ends in 2 days</h1>
              <p style="margin:0 0 24px;color:#888;font-size:14px">Upgrade to keep your quizzes and continue collecting leads</p>

              <div style="background:#0f1219;border-radius:12px;padding:20px;margin-bottom:20px">
                <h2 style="margin:0 0 12px;color:#f0f2f5;font-size:16px;font-weight:600">What you'll keep with Squarespell Pro</h2>
                <ul style="margin:0;padding-left:20px;color:#f0f2f5;font-size:14px;line-height:1.8;list-style:none">
                  <li style="margin-bottom:8px">✓ Unlimited quizzes</li>
                  <li style="margin-bottom:8px">✓ Advanced analytics</li>
                  <li style="margin-bottom:8px">✓ Unlimited lead collection</li>
                  <li style="margin-bottom:8px">✓ Priority support</li>
                </ul>
              </div>

              <a href="${MARKETING_URL}/pricing" style="display:block;width:100%;background:#D2FF1D;color:#07090c;padding:14px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;text-align:center;box-sizing:border-box;margin-bottom:12px">Upgrade Now</a>

              <p style="margin:0;padding-top:20px;border-top:1px solid #1a1f2e;color:#666;font-size:12px">Don't lose access to your quizzes</p>
            </div>
          `;

          await resend.emails.send({
            from: process.env.EMAIL_FROM || 'Squarespell <hello@squarespell.com>',
            to: user.email,
            subject: 'Your Squarespell trial ends in 2 days',
            html,
          });

          emailsSent++;
        }

        // Day 7: Trial expired
        if (daysSinceSignup === 7 && (user.plan === 'trial' || user.plan === 'free')) {
          const html = `
            <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#07090c;color:#f0f2f5">
              <h1 style="font-size:28px;margin:0 0 8px;color:#D2FF1D">Your trial has expired</h1>
              <p style="margin:0 0 24px;color:#888;font-size:14px">Upgrade now to keep your quizzes and continue collecting leads</p>

              <div style="background:#0f1219;border-radius:12px;padding:20px;margin-bottom:20px">
                <p style="margin:0;color:#f0f2f5;font-size:14px">Your quizzes are still here, but they're currently offline. Upgrade to your plan to reactivate them immediately.</p>
              </div>

              <a href="${MARKETING_URL}/pricing" style="display:block;width:100%;background:#D2FF1D;color:#07090c;padding:14px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;text-align:center;box-sizing:border-box;margin-bottom:12px">Upgrade to Pro</a>

              <p style="margin:0;padding-top:20px;border-top:1px solid #1a1f2e;color:#666;font-size:12px">Save your quiz data by upgrading today</p>
            </div>
          `;

          await resend.emails.send({
            from: process.env.EMAIL_FROM || 'Squarespell <hello@squarespell.com>',
            to: user.email,
            subject: 'Restore your Squarespell quizzes - Upgrade now',
            html,
          });

          emailsSent++;
        }
      } catch (e) {
        log.error('Failed to send trial reminder', { userId: user.id, err: e });
      }
    }

    res.json({ success: true, sent: emailsSent });
  } catch (err: any) {
    log.error('Trial reminder error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to send trial reminders' });
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
