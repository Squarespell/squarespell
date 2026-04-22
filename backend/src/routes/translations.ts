/**
 * translations.ts — API routes for multi-language quiz translations.
 */

import { Router } from 'express';
import { requireAuth, attachUser, AuthenticatedRequest } from '../middleware/auth';
import { supabase } from '../db/supabaseClient';
import {
  getQuizTranslations, getTranslation, upsertTranslation,
  deleteTranslation, mergeTranslation, detectLanguage,
  SUPPORTED_LANGUAGES,
} from '../services/translation';

export var translationsRouter = Router();
export var publicTranslationsRouter = Router();

// ── Private: Dashboard translation management ────────────────────────────────

// GET /api/quizzes/:quizId/translations — list all translations
translationsRouter.get('/:quizId/translations', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { data: quiz } = await supabase
      .from('quizzes')
      .select('id')
      .eq('id', req.params.quizId)
      .eq('user_id', req.userId)
      .single();
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    var translations = await getQuizTranslations(req.params.quizId);
    res.json(translations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/quizzes/:quizId/translations/:lang — get specific translation
translationsRouter.get('/:quizId/translations/:lang', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var translation = await getTranslation(req.params.quizId, req.params.lang);
    if (!translation) return res.status(404).json({ error: 'Translation not found' });
    res.json(translation);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/quizzes/:quizId/translations/:lang — create/update translation
translationsRouter.put('/:quizId/translations/:lang', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { data: quiz } = await supabase
      .from('quizzes')
      .select('id')
      .eq('id', req.params.quizId)
      .eq('user_id', req.userId)
      .single();
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    var { translations } = req.body;
    if (!translations) return res.status(400).json({ error: 'translations object required' });

    var result = await upsertTranslation(
      req.params.quizId,
      req.params.lang,
      translations,
      req.userId
    );
    if (result.error) return res.status(400).json({ error: result.error.message });
    res.json(result.data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/quizzes/:quizId/translations/:lang — delete translation
translationsRouter.delete('/:quizId/translations/:lang', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { data: quiz } = await supabase
      .from('quizzes')
      .select('id')
      .eq('id', req.params.quizId)
      .eq('user_id', req.userId)
      .single();
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    var result = await deleteTranslation(req.params.quizId, req.params.lang);
    if (result.error) return res.status(500).json({ error: result.error.message });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/supported-languages — list all supported languages
translationsRouter.get('/supported-languages', async function(_req, res) {
  res.json(SUPPORTED_LANGUAGES);
});

// ── Public: Serve translated quiz ────────────────────────────────────────────

// GET /api/public/quiz/:slug/translated — get quiz with language auto-detect or explicit lang param
publicTranslationsRouter.get('/quiz/:slug/translated', async function(req, res) {
  try {
    var { data: quiz } = await supabase
      .from('quizzes')
      .select('*')
      .eq('slug', req.params.slug)
      .eq('status', 'live')
      .single();

    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    var enabledLangs = (quiz.enabled_languages || ['en']) as string[];
    var defaultLang = quiz.default_language || 'en';

    // Determine target language
    var requestedLang = req.query.lang as string;
    var targetLang: string;

    if (requestedLang && enabledLangs.includes(requestedLang)) {
      targetLang = requestedLang;
    } else {
      targetLang = detectLanguage(
        req.headers['accept-language'] as string,
        enabledLangs,
        defaultLang
      );
    }

    // If target is default language, return quiz as-is
    if (targetLang === defaultLang) {
      return res.json({
        ...quiz,
        resolved_language: defaultLang,
        available_languages: enabledLangs,
      });
    }

    // Fetch and merge translation
    var translation = await getTranslation(quiz.id, targetLang);
    if (!translation) {
      return res.json({
        ...quiz,
        resolved_language: defaultLang,
        available_languages: enabledLangs,
      });
    }

    var mergedQuiz = mergeTranslation(quiz, translation.translations);

    res.json({
      ...mergedQuiz,
      resolved_language: targetLang,
      available_languages: enabledLangs,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
