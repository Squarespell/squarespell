/**
 * customCss.ts — Custom CSS per quiz.
 *
 * Stores user CSS overrides, sanitizes input, scopes to quiz iframe.
 * Plan-gated to Pro+ plans.
 */

import { log } from '../lib/logger';
import { supabase } from '../db/supabaseClient';
import { getPlanLimits } from '../middleware/planGuard';

// ── CSS Sanitization ─────────────────────────────────────────────────────────

/**
 * Basic CSS sanitizer to prevent XSS and scope-breaking.
 * Strips: @import, url() with javascript:, expression(), behavior:
 */
export function sanitizeCss(css: string): string {
  if (!css) return '';

  var sanitized = css
    // Remove @import
    .replace(/@import\s+[^;]+;?/gi, '/* @import removed */')
    // Remove javascript: in url()
    .replace(/url\s*\(\s*(['"]?)javascript:/gi, 'url($1blocked:')
    // Remove expression()
    .replace(/expression\s*\(/gi, '/* expression removed */(')
    // Remove behavior:
    .replace(/behavior\s*:/gi, '/* behavior removed */:')
    // Remove -moz-binding
    .replace(/-moz-binding\s*:/gi, '/* binding removed */:');

  // Size limit: 50KB
  if (sanitized.length > 50000) {
    sanitized = sanitized.slice(0, 50000) + '\n/* CSS truncated at 50KB limit */';
  }

  return sanitized;
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function getCustomCss(quizId: string): Promise<string> {
  var { data } = await supabase
    .from('quizzes')
    .select('custom_css')
    .eq('id', quizId)
    .single();
  return data?.custom_css || '';
}

export async function saveCustomCss(
  quizId: string,
  userId: string,
  css: string
): Promise<{ error: any }> {
  // Plan check
  var { data: user } = await supabase
    .from('users')
    .select('plan')
    .eq('id', userId)
    .single();

  var plan = user?.plan || 'free';
  if (plan === 'free' || plan === 'trial' || plan === 'starter') {
    return { error: { message: 'Custom CSS requires Pro plan or higher' } };
  }

  var sanitized = sanitizeCss(css);

  var { error } = await supabase
    .from('quizzes')
    .update({ custom_css: sanitized })
    .eq('id', quizId)
    .eq('user_id', userId);

  return { error };
}

/**
 * Wrap custom CSS in a scoped container for iframe injection.
 */
export function scopeCss(css: string, quizSlug: string): string {
  if (!css) return '';
  // Prefix all selectors with the quiz container class
  var prefix = '.sq-quiz-' + quizSlug.replace(/[^a-zA-Z0-9-]/g, '-');
  // Simple approach: wrap in container
  return prefix + ' {\n' + css + '\n}';
}
