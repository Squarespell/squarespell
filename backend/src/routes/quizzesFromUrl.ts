/**
 * POST /api/quizzes/from-url
 *
 * Authenticated "paste a URL → generate a quiz" endpoint used by the
 * in-dashboard NewQuizModal. This is the authed mirror of the public
 * /api/preview-analyze + /api/preview-build-quiz flow, but:
 *   - Requires a Clerk bearer token
 *   - Skips the preview-session cache entirely (no claim-token dance)
 *   - Writes directly to the quizzes table with the user's user_id
 *   - Per-user rate limited (default 10/day on free, 50/day on paid)
 *
 * Returns: { quiz: { id, slug, title }, brand }
 *
 * Mount in backend/src/index.ts BEFORE the default quizRoutes mount, e.g.:
 *   import quizzesFromUrlRoutes from './routes/quizzesFromUrl';
 *   app.use('/api/quizzes', quizzesFromUrlRoutes);  // must come BEFORE quizRoutes
 *   app.use('/api/quizzes', quizRoutes);
 * Order matters because Express matches the first route. The /from-url
 * segment is specific enough that either order works, but we keep it
 * mounted first for clarity.
 */

import { Router } from 'express';
import { requireAuth, attachUser, AuthenticatedRequest } from '../middleware/auth';
import { supabase } from '../db/supabaseClient';
import { scrapeBrand, NotSquarespaceError } from '../services/brandScraper';
import {
  generateOnboardingQuestions,
  analyzeBusinessProfile,
  generateTailoredQuiz,
} from '../services/claudeService';
import { QUIZ_TEMPLATES, isValidTemplateId } from '../config/quizTemplates';

const router = Router();
router.use(requireAuth, attachUser);

/* ------------------------------------------------------------------ */
/* URL normalizer                                                      */
/* ------------------------------------------------------------------ */
function normalizeUrl(input: string): string {
  let url = input.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  // Will throw if invalid
  new URL(url);
  return url;
}

function makeSlug(): string {
  return Math.random().toString(36).slice(2, 10);
}

/* ------------------------------------------------------------------ */
/* Per-user rate limit (in-memory; replace with Redis in prod if we    */
/* ever run multiple instances behind a load balancer).                */
/* ------------------------------------------------------------------ */
interface RateEntry {
  count: number;
  resetAt: number;
}

const ONE_DAY_MS = 86_400_000;
const fromUrlRateMap = new Map<string, RateEntry>();

/**
 * Returns the daily allowance for this user based on their plan.
 * Falls back to the free allowance if we can't read the plan.
 */
async function getDailyAllowance(dbUserId: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('users')
      .select('plan')
      .eq('id', dbUserId)
      .single();
    const plan = (data?.plan ?? 'free').toLowerCase();
    switch (plan) {
      case 'agency':
      case 'pro':
        return 50;
      case 'starter':
      case 'growth':
        return 25;
      case 'free':
      default:
        return 10;
    }
  } catch {
    return 10;
  }
}

async function checkAndIncrementRate(
  dbUserId: string,
): Promise<{ ok: true } | { ok: false; resetInMs: number; allowance: number }> {
  const now = Date.now();
  const allowance = await getDailyAllowance(dbUserId);
  const entry = fromUrlRateMap.get(dbUserId);

  if (entry && entry.resetAt > now && entry.count >= allowance) {
    return { ok: false, resetInMs: entry.resetAt - now, allowance };
  }
  if (!entry || entry.resetAt <= now) {
    fromUrlRateMap.set(dbUserId, { count: 1, resetAt: now + ONE_DAY_MS });
  } else {
    entry.count += 1;
  }
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* POST /from-url                                                      */
/* ------------------------------------------------------------------ */
router.post('/from-url', async (req: AuthenticatedRequest, res) => {
  const userId = req.dbUserId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { url, topic, template_id, brand: brandOverride } = (req.body ?? {}) as {
    url?: string;
    topic?: string;
    template_id?: string;
    brand?: {
      businessType?: string;
      audience?: string;
      tone?: string;
      keyOffer?: string;
      primaryColor?: string;
      accentColor?: string;
    };
  };

  // Whitelist of hex colors, lower-cased and normalized. Anything else is dropped.
  function normHex(v: unknown): string | null {
    if (typeof v !== 'string') return null;
    const t = v.trim().toLowerCase();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(t)) return t;
    return null;
  }
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url required' });
  }
  const cleanTopic =
    typeof topic === 'string' ? topic.trim().slice(0, 500) : '';
  const cleanTemplateId = isValidTemplateId(template_id) ? template_id : null;

  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeUrl(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // Rate limit check
  const rate = await checkAndIncrementRate(userId);
  if (!rate.ok) {
    const hours = Math.ceil(rate.resetInMs / (1000 * 60 * 60));
    return res.status(429).json({
      error: `You've hit your daily generation limit of ${rate.allowance}. Resets in ~${hours}h. Upgrade your plan for a higher daily limit.`,
      resetInMs: rate.resetInMs,
      allowance: rate.allowance,
    });
  }

  try {
    console.log(`[FromUrl] user=${userId} scraping ${normalizedUrl}`);
    const brand = await scrapeBrand(normalizedUrl);

    // Run AI analysis + onboarding questions in parallel (mirrors /preview-analyze)
    const [_onboarding, businessProfile] = await Promise.all([
      generateOnboardingQuestions(normalizedUrl, brand),
      analyzeBusinessProfile(normalizedUrl, brand),
    ]);

    // Merge AI-analyzed profile into the brand object so the generator has context.
    // Then let the user's overrides from the Review step win (if they provided any).
    const ovType = brandOverride?.businessType?.trim();
    const ovAud  = brandOverride?.audience?.trim();
    const ovTone = brandOverride?.tone?.trim();
    const ovOff  = brandOverride?.keyOffer?.trim();
    const ovPrim = normHex(brandOverride?.primaryColor);
    const ovAcc  = normHex(brandOverride?.accentColor);

    brand.business = {
      ...brand.business,
      type: ovType || businessProfile.type,
      audience: ovAud || businessProfile.audience,
      tone: ovTone || businessProfile.tone,
      key_offer: ovOff || businessProfile.key_offer,
    };

    // Apply color overrides to the scraped palette so downstream
    // generateTailoredQuiz and the persisted branding reflect the user's choices.
    if (ovPrim || ovAcc) {
      const scrapedColors = (brand as any).colors || {};
      (brand as any).colors = {
        ...scrapedColors,
        primary: ovPrim || scrapedColors.primary,
        accent:  ovAcc  || scrapedColors.accent,
      };
    }

    // Build onboarding pairs with sensible defaults (authed user didn't answer
    // the goal-selector; we default to lead capture).
    const onboardingPairs: { question: string; answer: string }[] = [
      { question: 'What is the primary goal of this quiz?', answer: 'capture leads' },
      { question: 'What type of business is this?', answer: businessProfile.type || 'unknown' },
      { question: 'Who is the target audience?', answer: businessProfile.audience || 'unknown' },
      { question: 'What tone should the quiz use?', answer: businessProfile.tone || 'professional' },
      { question: 'What is the key product or service?', answer: businessProfile.key_offer || 'unknown' },
    ].filter((p) => p.answer && p.answer !== 'unknown');

    // Template (if picked) informs the LLM of the quiz archetype.
    // Inserted before topic so that topic ends up at position 0 (highest
    // priority) after both unshifts run.
    if (cleanTemplateId) {
      const tpl = QUIZ_TEMPLATES[cleanTemplateId];
      onboardingPairs.unshift({
        question: `Quiz format: ${tpl.name}`,
        answer: tpl.system_prompt,
      });
    }

    // User-supplied topic steers the generator toward a specific angle.
    // Prepended last so it carries the most weight in the LLM context.
    if (cleanTopic) {
      onboardingPairs.unshift({
        question: 'What should this quiz specifically be about?',
        answer: cleanTopic,
      });
    }

    console.log(`[FromUrl] building quiz for ${normalizedUrl}`);
    const quiz = await generateTailoredQuiz(normalizedUrl, brand, onboardingPairs);

    // Direct insert into quizzes table with user_id
    const { data: inserted, error: insertErr } = await supabase
      .from('quizzes')
      .insert({
        user_id: userId,
        title: quiz.title || 'Untitled Quiz',
        slug: makeSlug(),
        mode: 'lead_quiz',
        questions: quiz.questions ?? [],
        outcomes: quiz.outcomes ?? [],
        branding: quiz.branding ?? {},
        settings: {
          ...(quiz.settings ?? {}),
          website_url: normalizedUrl,
          source: 'from-url-modal',
          user_topic: cleanTopic || null,
          template_id: cleanTemplateId,
        },
        status: 'draft',
      })
      .select('id, slug, title')
      .single();

    if (insertErr) {
      console.error('[FromUrl] DB insert failed:', insertErr);
      return res.status(500).json({ error: insertErr.message });
    }

    // Increment plan counter (best-effort; don't fail the request)
    supabase.rpc('increment_quiz_count', { uid: userId }).then(
      () => {},
      (e) => console.warn('[FromUrl] increment_quiz_count failed:', e),
    );

    console.log(`[FromUrl] SUCCESS quiz_id=${inserted.id} slug=${inserted.slug}`);
    return res.status(201).json({
      quiz: inserted,
      brand,
    });
  } catch (err: any) {
    if (err instanceof NotSquarespaceError) {
      console.warn(`[FromUrl] Rejected non-Squarespace site: ${err.hostname}`);
      // Refund the rate-limit slot — the user didn't actually use AI generation
      const entry = fromUrlRateMap.get(userId);
      if (entry && entry.count > 0) entry.count -= 1;
      return res.status(422).json({
        error: err.message,
        code: 'NOT_SQUARESPACE',
        hostname: err.hostname,
      });
    }
    console.error('[FromUrl] Failed:', err);
    return res.status(500).json({ error: err.message ?? 'Generation failed' });
  }
});

export default router;
