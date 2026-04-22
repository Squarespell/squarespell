/**
 * translation.ts — Multi-language translation layer.
 *
 * Architecture: Single quiz → N language overlays stored in quiz_translations.
 * The base quiz content is always in default_language (usually 'en').
 * Translations are JSONB overlays: { title, questions[{text,options[{text}]}], outcomes[{...}] }
 *
 * At render time, the quiz renderer merges base + translation overlay.
 * Analytics track language dimension on every event.
 */

import { log } from '../lib/logger';
import { supabase } from '../db/supabaseClient';

// ── Types ────────────────────────────────────────────────────────────────────

interface TranslationOverlay {
  title?: string;
  description?: string;
  questions?: Array<{
    text?: string;
    options?: Array<{
      text?: string;
      explanation?: string;
    }>;
  }>;
  outcomes?: Array<{
    title?: string;
    description?: string;
    cta_text?: string;
  }>;
  lead_gate?: {
    heading?: string;
    subheading?: string;
    button_text?: string;
    fields?: Array<{
      label?: string;
      placeholder?: string;
    }>;
  };
}

interface TranslationRecord {
  id: string;
  quiz_id: string;
  language_code: string;
  translations: TranslationOverlay;
  status: 'draft' | 'complete' | 'needs_review';
  completeness_pct: number;
  created_at: string;
  updated_at: string;
}

// ── Completeness Calculator ──────────────────────────────────────────────────

/**
 * Calculate what percentage of quiz content has been translated.
 */
function calculateCompleteness(quiz: any, overlay: TranslationOverlay): number {
  var totalFields = 0;
  var translatedFields = 0;

  // Title
  totalFields++;
  if (overlay.title) translatedFields++;

  // Questions
  var questions = quiz.questions || [];
  for (var q = 0; q < questions.length; q++) {
    totalFields++; // question text
    if (overlay.questions?.[q]?.text) translatedFields++;

    var options = questions[q].options || [];
    for (var o = 0; o < options.length; o++) {
      totalFields++; // option text
      if (overlay.questions?.[q]?.options?.[o]?.text) translatedFields++;
    }
  }

  // Outcomes
  var outcomes = quiz.outcomes || [];
  for (var oc = 0; oc < outcomes.length; oc++) {
    totalFields += 2; // title + description
    if (overlay.outcomes?.[oc]?.title) translatedFields++;
    if (overlay.outcomes?.[oc]?.description) translatedFields++;
  }

  return totalFields > 0 ? Math.round((translatedFields / totalFields) * 100) : 0;
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Get all translations for a quiz.
 */
export async function getQuizTranslations(quizId: string): Promise<TranslationRecord[]> {
  var { data } = await supabase
    .from('quiz_translations')
    .select('*')
    .eq('quiz_id', quizId)
    .order('language_code');
  return (data || []) as TranslationRecord[];
}

/**
 * Get a specific translation.
 */
export async function getTranslation(quizId: string, languageCode: string): Promise<TranslationRecord | null> {
  var { data } = await supabase
    .from('quiz_translations')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('language_code', languageCode)
    .single();
  return data as TranslationRecord | null;
}

/**
 * Create or update a translation for a quiz language.
 */
export async function upsertTranslation(
  quizId: string,
  languageCode: string,
  translations: TranslationOverlay,
  editedBy?: string
): Promise<{ data: TranslationRecord | null; error: any }> {
  // Fetch quiz to calculate completeness
  var { data: quiz } = await supabase
    .from('quizzes')
    .select('questions, outcomes')
    .eq('id', quizId)
    .single();

  var completeness = quiz ? calculateCompleteness(quiz, translations) : 0;
  var status = completeness >= 100 ? 'complete' : completeness > 0 ? 'draft' : 'draft';

  var { data, error } = await supabase
    .from('quiz_translations')
    .upsert({
      quiz_id: quizId,
      language_code: languageCode,
      translations: translations,
      status: status,
      completeness_pct: completeness,
      last_edited_by: editedBy || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'quiz_id,language_code' })
    .select()
    .single();

  // Update quiz's enabled_languages array
  if (!error) {
    var { data: quizData } = await supabase
      .from('quizzes')
      .select('enabled_languages')
      .eq('id', quizId)
      .single();

    var langs = (quizData?.enabled_languages || ['en']) as string[];
    if (!langs.includes(languageCode)) {
      langs.push(languageCode);
      await supabase
        .from('quizzes')
        .update({ enabled_languages: langs })
        .eq('id', quizId);
    }
  }

  return { data: data as TranslationRecord | null, error };
}

/**
 * Delete a translation for a language.
 */
export async function deleteTranslation(quizId: string, languageCode: string): Promise<{ error: any }> {
  var { error } = await supabase
    .from('quiz_translations')
    .delete()
    .eq('quiz_id', quizId)
    .eq('language_code', languageCode);

  // Remove from enabled_languages
  if (!error) {
    var { data: quizData } = await supabase
      .from('quizzes')
      .select('enabled_languages')
      .eq('id', quizId)
      .single();

    var langs = ((quizData?.enabled_languages || []) as string[]).filter(function(l) {
      return l !== languageCode;
    });
    await supabase
      .from('quizzes')
      .update({ enabled_languages: langs })
      .eq('id', quizId);
  }

  return { error };
}

// ── Merge (for quiz rendering) ───────────────────────────────────────────────

/**
 * Merge base quiz content with a translation overlay.
 * Returns a new quiz object with translated content.
 * Falls back to base content for any missing translations.
 */
export function mergeTranslation(quiz: any, overlay: TranslationOverlay): any {
  var merged = JSON.parse(JSON.stringify(quiz)); // deep clone

  if (overlay.title) merged.title = overlay.title;
  if (overlay.description) merged.description = overlay.description;

  // Merge questions
  if (overlay.questions && merged.questions) {
    for (var q = 0; q < merged.questions.length; q++) {
      var qOverlay = overlay.questions[q];
      if (!qOverlay) continue;
      if (qOverlay.text) merged.questions[q].text = qOverlay.text;
      if (qOverlay.options && merged.questions[q].options) {
        for (var o = 0; o < merged.questions[q].options.length; o++) {
          var oOverlay = qOverlay.options[o];
          if (!oOverlay) continue;
          if (oOverlay.text) merged.questions[q].options[o].text = oOverlay.text;
          if (oOverlay.explanation) merged.questions[q].options[o].explanation = oOverlay.explanation;
        }
      }
    }
  }

  // Merge outcomes
  if (overlay.outcomes && merged.outcomes) {
    for (var oc = 0; oc < merged.outcomes.length; oc++) {
      var ocOverlay = overlay.outcomes[oc];
      if (!ocOverlay) continue;
      if (ocOverlay.title) merged.outcomes[oc].title = ocOverlay.title;
      if (ocOverlay.description) merged.outcomes[oc].description = ocOverlay.description;
      if (ocOverlay.cta_text) merged.outcomes[oc].cta_text = ocOverlay.cta_text;
    }
  }

  // Merge lead gate
  if (overlay.lead_gate && merged.settings?.lead_gate) {
    var lg = merged.settings.lead_gate;
    if (overlay.lead_gate.heading) lg.heading = overlay.lead_gate.heading;
    if (overlay.lead_gate.subheading) lg.subheading = overlay.lead_gate.subheading;
    if (overlay.lead_gate.button_text) lg.button_text = overlay.lead_gate.button_text;
  }

  return merged;
}

// ── Language Detection Helper ────────────────────────────────────────────────

/**
 * Detect preferred language from Accept-Language header.
 * Returns best match from quiz's enabled languages, or default.
 */
export function detectLanguage(
  acceptLanguageHeader: string | undefined,
  enabledLanguages: string[],
  defaultLanguage: string
): string {
  if (!acceptLanguageHeader || enabledLanguages.length <= 1) return defaultLanguage;

  // Parse Accept-Language: en-US,en;q=0.9,fr;q=0.8
  var parts = acceptLanguageHeader.split(',').map(function(part) {
    var pieces = part.trim().split(';q=');
    return {
      lang: pieces[0].split('-')[0].toLowerCase(), // 'en-US' → 'en'
      q: pieces[1] ? parseFloat(pieces[1]) : 1.0,
    };
  }).sort(function(a, b) { return b.q - a.q; });

  for (var i = 0; i < parts.length; i++) {
    if (enabledLanguages.includes(parts[i].lang)) {
      return parts[i].lang;
    }
  }

  return defaultLanguage;
}

// ── Supported Languages ──────────────────────────────────────────────────────

export var SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'nl', name: 'Dutch', native: 'Nederlands' },
  { code: 'sv', name: 'Swedish', native: 'Svenska' },
  { code: 'da', name: 'Danish', native: 'Dansk' },
  { code: 'no', name: 'Norwegian', native: 'Norsk' },
  { code: 'fi', name: 'Finnish', native: 'Suomi' },
  { code: 'pl', name: 'Polish', native: 'Polski' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'zh', name: 'Chinese', native: '中文' },
  { code: 'ar', name: 'Arabic', native: 'العربية', rtl: true },
  { code: 'he', name: 'Hebrew', native: 'עברית', rtl: true },
  { code: 'tr', name: 'Turkish', native: 'Türkçe' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
];

export type { TranslationOverlay, TranslationRecord };
