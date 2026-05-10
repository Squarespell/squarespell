// Merge-tag context. At send time, the backend resolves tags like
// {{outcome_name}} and {{answer:biggest_goal}} from the recipient's quiz
// submission. In the preview UI we substitute sample values so designers see
// a realistic rendering while they build.

export interface MergeContext {
  first_name: string;
  last_name?: string;
  email: string;

  quiz_name: string;
  quiz_url: string;

  outcome_name: string;
  outcome_description?: string;
  outcome_score?: number;

  // Answer map keyed by question_slug -> string answer value.
  // Access via {{answer:<slug>}}.
  answers: Record<string, string>;

  // Brand-level fields (also available directly from BrandKit).
  brand_name: string;

  // CTA URL the template primary button points to.
  cta_url: string;

  // Footer fields resolved server-side; preview can stub them.
  footer_unsubscribe: string;
  footer_address: string;
  footer_preference: string;

  // Extra fields for specific templates.
  [key: string]: unknown;
}

// Sample context used for previewing a template in the gallery before the
// user picks a source quiz. Realistic enough that designers can see spacing
// and line-wrap behavior with real-looking copy.
export const SAMPLE_CONTEXT: MergeContext = {
  first_name: 'Jordan',
  last_name: 'Reyes',
  email: 'jordan@example.com',
  quiz_name: 'Find your ideal Squarespace template',
  quiz_url: 'https://app.squarespell.com/q/sample',
  outcome_name: 'Minimalist Portfolio',
  outcome_description: 'A clean, gallery-first layout that puts the work first.',
  outcome_score: 82,
  answers: {
    biggest_goal: 'Book more paid photography clients',
    team_size: 'Just me',
    budget: 'Under $500 for design',
    timeline: 'Live within 2 weeks',
    industry: 'Photography',
    style_preference: 'Minimal, lots of whitespace',
    question_number: '3',
    question_slug: 'Book more paid photography clients',
  },
  brand_name: 'Squarespell Quiz',
  cta_url: 'https://app.squarespell.com/q/sample?utm_source=email&utm_medium=post_quiz',
  footer_unsubscribe: '<a href="#" style="color:inherit;text-decoration:underline;">Unsubscribe</a>',
  footer_address: 'Squarespell Quiz, 651 N Broad St, Suite 201, Middletown, DE 19709',
  footer_preference: '<a href="#" style="color:inherit;text-decoration:underline;">Email preferences</a>',
};

// Resolve a merge-tag expression like "answer:biggest_goal" against a context.
// Returns '' for missing keys rather than throwing, so partial data in preview
// mode doesn't break rendering.
export function resolveTag(tag: string, ctx: MergeContext): string {
  const trimmed = tag.trim();
  if (trimmed.indexOf('answer:') === 0) {
    const slug = trimmed.substring('answer:'.length);
    const v = ctx.answers && ctx.answers[slug];
    return v == null ? '' : String(v);
  }
  const v = (ctx as Record<string, unknown>)[trimmed];
  return v == null ? '' : String(v);
}

// Apply merge tags across any string. Handles {{foo}} and {{answer:bar}}.
export function applyMergeTags(input: string, ctx: MergeContext): string {
  if (!input) return '';
  return input.replace(/\{\{([^}]+)\}\}/g, function (_m, tag) {
    return resolveTag(String(tag), ctx);
  });
}
