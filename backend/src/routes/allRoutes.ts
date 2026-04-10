import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth, attachUser, AuthenticatedRequest } from '../middleware/auth';
import { guardQuizCreation, getPlanLimits } from '../middleware/planGuard';
import { generateQuiz, processOtherAnswer, generateOnboardingQuestions, generateTailoredQuiz } from '../services/claudeService';
import { scrapeBrand, NotSquarespaceError } from '../services/brandScraper';
import { supabase } from '../db/supabaseClient';
import Stripe from 'stripe';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function normalizeUrl(input: string): string {
  let url = input.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  new URL(url);
  return url;
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

    // Check if user already has a quiz with the same URL (don't duplicate same site)
    const { data: existing } = await supabase
      .from('quizzes')
      .select('id, slug')
      .eq('user_id', userId)
      .eq('website_url', url)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.json({ saved: true, quiz_id: existing[0].id, slug: existing[0].slug, message: 'Quiz already exists for this URL' });
    }

    // Generate a unique slug
    const slug = (brand?.site_name || 'quiz')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30) + '-' + Math.random().toString(36).slice(2, 8);

    // Save the quiz as a draft
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
      settings: quiz.settings || {},
      website_url: url,
      status: 'live',
    }).select('id, slug').single();

    if (error) throw error;
    res.json({ saved: true, quiz_id: data.id, slug: data.slug });
  } catch (err: any) {
    console.error('save-preview error:', err);
    res.status(500).json({ error: 'Failed to save quiz' });
  }
});

// ── In-memory cache for preview quizzes (before user signs up) ───────────────
const previewQuizCache = new Map<string, { quiz: any; brand: any; url: string; createdAt: number }>();

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
    console.log(`[Preview] Starting scrape for: ${normalizedUrl}`);
    const brand = await scrapeBrand(normalizedUrl);
    console.log(`[Preview] Scrape complete. Business summary: ${brand.business?.summary?.length || 0} chars`);

    // Step 2: Generate quiz with AI
    const quiz = await generateQuiz(normalizedUrl, 'general', 'Generate more leads', brand);
    console.log(`[Preview] Quiz generated: "${quiz.title}"`);

    // Step 3: Generate a claim token and store quiz in memory cache
    // (We can't save to DB without a user_id due to NOT NULL constraint)
    const claimToken = crypto.randomBytes(16).toString('hex');
    previewQuizCache.set(claimToken, {
      quiz, brand, url: normalizedUrl,
      createdAt: Date.now(),
    });
    // Clean old entries (older than 24 hours so OAuth roundtrip never loses them)
    for (const [k, v] of previewQuizCache.entries()) {
      if (Date.now() - v.createdAt > 86400000) previewQuizCache.delete(k);
    }

    console.log(`[Preview] Quiz cached with claim token: ${claimToken.slice(0, 8)}...`);
    res.json({ brand, quiz, claim_token: claimToken });
  } catch (err: any) {
    if (err instanceof NotSquarespaceError) {
      console.warn(`[Preview] Rejected non-Squarespace site: ${err.hostname}`);
      return res.status(422).json({
        error: err.message,
        code: 'NOT_SQUARESPACE',
        hostname: err.hostname,
      });
    }
    console.error('[Preview] Generation failed:', err);
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
    console.log(`[PreviewAnalyze] Scraping: ${normalizedUrl}`);
    const brand = await scrapeBrand(normalizedUrl);
    console.log(`[PreviewAnalyze] Scrape done. Summary: ${brand.business?.summary?.length || 0} chars`);

    const { questions: onboardingQuestions } = await generateOnboardingQuestions(normalizedUrl, brand);
    console.log(`[PreviewAnalyze] Onboarding questions generated: ${onboardingQuestions.length}`);

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
      console.warn(`[PreviewAnalyze] Rejected non-Squarespace site: ${err.hostname}`);
      return res.status(422).json({
        error: err.message,
        code: 'NOT_SQUARESPACE',
        hostname: err.hostname,
      });
    }
    console.error('[PreviewAnalyze] Failed:', err);
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

  // Map answers back to full question text + selected option text
  const onboardingPairs: { question: string; answer: string }[] = session.onboarding_questions.map((q: any) => {
    const selectedIdxRaw = session.answers[q.id];
    const selectedIdx = selectedIdxRaw === undefined ? -1 : parseInt(String(selectedIdxRaw), 10);
    const answerText = (selectedIdx >= 0 && Array.isArray(q.options)) ? (q.options[selectedIdx] ?? '') : '';
    return { question: q.text, answer: answerText };
  }).filter((p: any) => p.answer);

  try {
    console.log(`[PreviewBuildQuiz] Building quiz for ${session.url} with ${onboardingPairs.length} answers`);
    const quiz = await generateTailoredQuiz(session.url, session.brand, onboardingPairs);
    console.log(`[PreviewBuildQuiz] Quiz generated: "${quiz.title}"`);

    const claimToken = crypto.randomBytes(16).toString('hex');
    previewQuizCache.set(claimToken, {
      quiz,
      brand: session.brand,
      url: session.url,
      createdAt: Date.now(),
    });
    for (const [k, v] of previewQuizCache.entries()) {
      if (Date.now() - v.createdAt > 86400000) previewQuizCache.delete(k);
    }

    res.json({ quiz, brand: session.brand, claim_token: claimToken, url: session.url });
  } catch (err: any) {
    console.error('[PreviewBuildQuiz] Failed:', err);
    res.status(500).json({ error: err.message ?? 'Quiz build failed' });
  }
});

// ── Patch a cached draft quiz (edits made before sign up) ────────────────────
previewRouter.patch('/preview-quiz/:token', async (req, res) => {
  const token = req.params.token;
  const cached = previewQuizCache.get(token);
  if (!cached) return res.status(404).json({ error: 'Draft not found or expired' });
  const allowed = ['title', 'questions', 'outcomes', 'branding', 'settings'];
  const updated = { ...cached.quiz };
  for (const key of allowed) {
    if (req.body[key] !== undefined) updated[key] = req.body[key];
  }
  previewQuizCache.set(token, { ...cached, quiz: updated });
  res.json({ ok: true, quiz: updated });
});

// ── Read a cached draft quiz back (for stage 4 visitor preview) ──────────────
previewRouter.get('/preview-quiz/:token', async (req, res) => {
  const token = req.params.token;
  const cached = previewQuizCache.get(token);
  if (!cached) return res.status(404).json({ error: 'Draft not found or expired' });
  res.json({ quiz: cached.quiz, brand: cached.brand, url: cached.url });
});

// ── Claim a preview quiz (save from cache to DB for authenticated user) ──────
previewRouter.post('/claim-quiz', requireAuth, attachUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { claim_token, quiz: bodyQuiz, brand: bodyBrand, url: bodyUrl } = req.body;
    const userId = req.dbUserId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    if (!claim_token && !bodyQuiz) return res.status(400).json({ error: 'claim_token or quiz payload required' });

    // Look up quiz in memory cache, fall back to body payload if cache miss
    // (cache is lost if the backend restarts between generate and claim)
    let quiz: any, brand: any, url: string;
    const cached = claim_token ? previewQuizCache.get(claim_token) : null;
    if (cached) {
      quiz = cached.quiz; brand = cached.brand; url = cached.url;
    } else if (bodyQuiz && bodyUrl) {
      console.log(`[Claim] Cache miss; using body payload fallback`);
      quiz = bodyQuiz; brand = bodyBrand || {}; url = bodyUrl;
    } else {
      console.log(`[Claim] Token not found in cache and no fallback payload: ${(claim_token || '').slice(0, 8)}...`);
      return res.status(404).json({ error: 'Quiz not found or expired. Please generate a new one.' });
    }

    // Check if user already has a quiz for this URL
    const { data: existing } = await supabase
      .from('quizzes')
      .select('id, slug')
      .eq('user_id', userId)
      .eq('website_url', url)
      .limit(1);

    if (existing && existing.length > 0) {
      previewQuizCache.delete(claim_token);
      return res.json({ claimed: true, quiz_id: existing[0].id, slug: existing[0].slug, message: 'Quiz already exists' });
    }

    // Save to DB with user's ID
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
      settings: quiz.settings || {},
      website_url: url,
      status: 'live',
    }).select('id, slug').single();

    if (saveErr) throw saveErr;

    // Remove from cache
    previewQuizCache.delete(claim_token);

    console.log(`[Claim] Quiz ${saved.id} saved for user ${userId}, slug: ${saved.slug}`);
    res.json({ claimed: true, quiz_id: saved.id, slug: saved.slug });
  } catch (err: any) {
    console.error('[Claim] Error:', err);
    res.status(500).json({ error: 'Failed to claim quiz' });
  }
});

// ── Public Quiz ───────────────────────────────────────────────────────────────
export const publicQuizRouter = Router();
publicQuizRouter.get('/:slug', async (req, res) => {
  const { data, error } = await supabase.from('quizzes').select('id,title,questions,outcomes,branding,settings').eq('slug', req.params.slug).eq('status', 'live').single();
  if (error || !data) return res.status(404).json({ error: 'Quiz not found' });
  res.json(data);
});
publicQuizRouter.post('/:slug/event', async (req, res) => {
  const { event_type, session_id, metadata } = req.body;
  const { data: quiz } = await supabase.from('quizzes').select('id').eq('slug', req.params.slug).single();
  if (!quiz) return res.status(404).json({ error: 'Not found' });
  await supabase.from('analytics_events').insert({ quiz_id: quiz.id, event_type, session_id, metadata: metadata ?? {} });
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
  const { name, email, answers, outcome_id } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  const { data: quiz } = await supabase.from('quizzes').select('id,user_id').eq('slug', req.params.slug).eq('status', 'live').single();
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  const { data: owner } = await supabase.from('users').select('plan').eq('id', quiz.user_id).single();
  const { leads: leadLimit } = getPlanLimits(owner?.plan ?? 'free');
  const { count } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('quiz_id', quiz.id);
  if ((count ?? 0) >= leadLimit) return res.status(403).json({ error: 'Lead limit reached' });
  const { error } = await supabase.from('leads').insert({ quiz_id: quiz.id, user_id: quiz.user_id, name: name ?? null, email, answers: answers ?? {}, outcome_id: outcome_id ?? null });
  if (error) return res.status(500).json({ error: error.message });
  await supabase.rpc('increment_lead_count', { qid: quiz.id });

  // Send email notification to quiz owner
  if (resend) {
    try {
      const { data: ownerUser } = await supabase.from('users').select('email').eq('id', quiz.user_id).single();
      const notifyEmail = ownerUser?.email || 'hasnain.munir700@gmail.com';
      if (notifyEmail) {
        const { data: quizInfo } = await supabase.from('quizzes').select('title').eq('id', quiz.id).single();
        await resend.emails.send({
          from: 'Squarespell <onboarding@resend.dev>',
          to: notifyEmail,
          subject: `New lead captured: ${name || email}`,
          html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#07090c;color:#f0f2f5;border-radius:12px"><h2 style="color:#D2FF1D;font-size:20px;margin:0 0 16px">New lead captured!</h2><table style="width:100%;border-collapse:collapse"><tr><td style="padding:8px 0;color:#888;font-size:14px">Name</td><td style="padding:8px 0;color:#f0f2f5;font-size:14px">${name || ' - '}</td></tr><tr><td style="padding:8px 0;color:#888;font-size:14px">Email</td><td style="padding:8px 0;color:#f0f2f5;font-size:14px">${email}</td></tr><tr><td style="padding:8px 0;color:#888;font-size:14px">Quiz</td><td style="padding:8px 0;color:#f0f2f5;font-size:14px">${quizInfo?.title || 'Your quiz'}</td></tr><tr><td style="padding:8px 0;color:#888;font-size:14px">Date</td><td style="padding:8px 0;color:#f0f2f5;font-size:14px">${new Date().toLocaleDateString()}</td></tr></table><a href="https://squarespell.com/dashboard" style="display:inline-block;margin-top:20px;background:#D2FF1D;color:#07090c;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">View in dashboard →</a></div>`,
        });
      }
    } catch (e) { console.log('Email notification failed:', e); }
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
  } catch (e) { console.log('Webhook dispatch failed:', e); }

  res.status(201).json({ success: true });
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
  const { count: completions } = await supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('quiz_id', req.params.quizId).eq('event_type', 'complete');
  const views = quiz.view_count ?? 0; const leads = quiz.lead_count ?? 0; const comp = completions ?? 0;
  res.json({ views, completions: comp, leads, completion_rate: views > 0 ? Math.round((comp/views)*100) : 0, lead_rate: comp > 0 ? Math.round((leads/comp)*100) : 0 });
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
  const { data: events } = await supabase.from('analytics_events').select('created_at,event_type').eq('quiz_id', req.params.quizId).gte('created_at', fromDate.toISOString());
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
  const { count: viewed } = await supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('quiz_id', req.params.quizId).eq('event_type', 'view');
  const { count: started } = await supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('quiz_id', req.params.quizId).eq('event_type', 'start');
  const { count: completed } = await supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('quiz_id', req.params.quizId).eq('event_type', 'complete');
  const { count: lead_captured } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('quiz_id', req.params.quizId);
  res.json({ viewed: viewed ?? 0, started: started ?? 0, completed: completed ?? 0, lead_captured: lead_captured ?? 0 });
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

// ── Scrape Brand ──────────────────────────────────────────────────────────────
export const scrapeBrandRouter = Router();
scrapeBrandRouter.post('/scrape-brand', requireAuth, attachUser, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  let normalizedBrandUrl: string;
  try { normalizedBrandUrl = normalizeUrl(url); } catch { return res.status(400).json({ error: 'invalid url' }); }
  try {
    res.json(await scrapeBrand(normalizedBrandUrl));
  } catch (err: any) {
    if (err instanceof NotSquarespaceError) {
      return res.status(422).json({ error: err.message, code: 'NOT_SQUARESPACE', hostname: err.hostname });
    }
    console.error('[ScrapeBrand] Failed:', err);
    res.status(500).json({ error: err.message ?? 'Scrape failed' });
  }
});

// ── User ──────────────────────────────────────────────────────────────────────
export const userRouter = Router();
userRouter.use(requireAuth, attachUser);
userRouter.get('/plan', async (req: AuthenticatedRequest, res) => {
  const { data: user } = await supabase.from('users').select('plan,quiz_count,created_at,email').eq('id', req.dbUserId).single();
  if (!user) return res.status(404).json({ error: 'Not found' });
  const plan = user.plan || 'trial';
  const trialEndsAt = (plan === 'free' || plan === 'trial') && user.created_at
    ? new Date(new Date(user.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    : null;
  res.json({ plan, quiz_count: user.quiz_count, limits: getPlanLimits(plan), trial_ends_at: trialEndsAt, email: user.email || '' });
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

            <a href="https://squarespell.com/dashboard" style="display:block;width:100%;background:#D2FF1D;color:#07090c;padding:14px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;text-align:center;box-sizing:border-box">View Dashboard</a>

            <p style="margin:20px 0 0;padding-top:20px;border-top:1px solid #1a1f2e;color:#666;font-size:12px">This is your weekly quiz performance summary from Squarespell</p>
          </div>
        `;

        await resend.emails.send({
          from: 'Squarespell <onboarding@resend.dev>',
          to: user.email,
          subject: `Your weekly quiz summary  -  ${totalViews} views this week`,
          html,
        });

        emailsSent++;
      } catch (e) {
        console.error(`Failed to send digest to user ${user.id}:`, e);
      }
    }

    res.json({ success: true, sent: emailsSent, skipped });
  } catch (err: any) {
    console.error('Weekly digest error:', err);
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

                <a href="https://squarespell.com/dashboard?tab=create" style="display:block;width:100%;background:#D2FF1D;color:#07090c;padding:14px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;text-align:center;box-sizing:border-box;margin-bottom:12px">Create Your First Quiz</a>

                <p style="margin:0;padding-top:20px;border-top:1px solid #1a1f2e;color:#666;font-size:12px">Questions? We're here to help</p>
              </div>
            `;

            await resend.emails.send({
              from: 'Squarespell <onboarding@resend.dev>',
              to: user.email,
              subject: 'Welcome to Squarespell  -  Create your first quiz',
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

              <a href="https://squarespell.com/pricing" style="display:block;width:100%;background:#D2FF1D;color:#07090c;padding:14px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;text-align:center;box-sizing:border-box;margin-bottom:12px">Upgrade Now</a>

              <p style="margin:0;padding-top:20px;border-top:1px solid #1a1f2e;color:#666;font-size:12px">Don't lose access to your quizzes</p>
            </div>
          `;

          await resend.emails.send({
            from: 'Squarespell <onboarding@resend.dev>',
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

              <a href="https://squarespell.com/pricing" style="display:block;width:100%;background:#D2FF1D;color:#07090c;padding:14px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;text-align:center;box-sizing:border-box;margin-bottom:12px">Upgrade to Pro</a>

              <p style="margin:0;padding-top:20px;border-top:1px solid #1a1f2e;color:#666;font-size:12px">Save your quiz data by upgrading today</p>
            </div>
          `;

          await resend.emails.send({
            from: 'Squarespell <onboarding@resend.dev>',
            to: user.email,
            subject: 'Restore your Squarespell quizzes  -  Upgrade now',
            html,
          });

          emailsSent++;
        }
      } catch (e) {
        console.error(`Failed to send trial reminder to user ${user.id}:`, e);
      }
    }

    res.json({ success: true, sent: emailsSent });
  } catch (err: any) {
    console.error('Trial reminder error:', err);
    res.status(500).json({ error: err.message ?? 'Failed to send trial reminders' });
  }
});
