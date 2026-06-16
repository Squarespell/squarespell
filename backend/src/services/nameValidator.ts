/**
 * nameValidator.ts — basic quality checks for lead "name" submissions.
 *
 * Goal is NOT to verify someone's real identity (that's impossible from a
 * text field) — it's to reject the obvious junk that pollutes lead lists:
 * single letters, "Test"/"ABC"/"XYZ", keyboard mashes, all-digits, repeated
 * characters, and other non-name-shaped input. Real, slightly unusual names
 * (hyphenated, apostrophes, accented characters, single legal names) should
 * still pass.
 */

const JUNK_NAMES = new Set([
  'test', 'testing', 'asdf', 'asdfasdf', 'qwerty', 'abc', 'abcd', 'abcdef',
  'xyz', 'xyzxyz', 'na', 'n/a', 'none', 'anonymous', 'anon', 'unknown',
  'user', 'admin', 'name', 'firstname', 'lastname', 'first last',
  'john doe', 'jane doe', 'foo', 'foo bar', 'foobar', 'lorem', 'lorem ipsum',
  'sample', 'example', 'dummy', 'fake', 'idk', 'whatever', '...', 'null',
  'undefined', 'no name', 'noname', 'first name last name',
]);

// Matches a run of the same character repeated 3+ times anywhere in the string
const REPEATED_CHAR_RE = /(.)\1{2,}/i;
// Matches strings made up entirely of digits/punctuation (no letters at all)
const NO_LETTERS_RE = /^[^a-zA-ZÀ-ɏ]+$/;
// Common keyboard-mash patterns (rows of a QWERTY keyboard)
const KEYBOARD_MASH_RE = /^(qwert|asdf|zxcv|qazwsx|qweasd|qwerty|poiuy|lkjhg|mnbvc)/i;
// Allowed character set for a real name: letters (incl. accented), spaces, hyphens, apostrophes, periods
const NAME_CHAR_RE = /^[a-zA-ZÀ-ɏ\s.'-]+$/;

export function validateName(rawName: unknown): { valid: boolean; reason?: string } {
  if (rawName === null || rawName === undefined || rawName === '') {
    // Name is optional at the schema level — absence is fine, junk is not.
    return { valid: true };
  }

  if (typeof rawName !== 'string') {
    return { valid: false, reason: 'Invalid name format' };
  }

  const trimmed = rawName.trim();

  if (trimmed.length === 0) {
    return { valid: true };
  }

  if (trimmed.length < 2) {
    return { valid: false, reason: 'Name is too short' };
  }

  if (trimmed.length > 100) {
    return { valid: false, reason: 'Name is too long' };
  }

  const lower = trimmed.toLowerCase();

  if (JUNK_NAMES.has(lower)) {
    return { valid: false, reason: 'Please enter a real name' };
  }

  if (!NAME_CHAR_RE.test(trimmed)) {
    return { valid: false, reason: 'Name contains invalid characters' };
  }

  if (NO_LETTERS_RE.test(trimmed)) {
    return { valid: false, reason: 'Name must contain letters' };
  }

  if (REPEATED_CHAR_RE.test(trimmed.replace(/\s/g, ''))) {
    return { valid: false, reason: 'Please enter a real name' };
  }

  if (KEYBOARD_MASH_RE.test(trimmed.replace(/\s/g, ''))) {
    return { valid: false, reason: 'Please enter a real name' };
  }

  // Require at least one vowel-containing letter sequence so things like
  // "Bbbbbb" or "Xkjhgf" (technically passing the above checks) still fail.
  const letterOnly = trimmed.replace(/[^a-zA-ZÀ-ɏ]/g, '');
  if (letterOnly.length >= 3 && !/[aeiouAEIOUÀ-ɏ]/.test(letterOnly)) {
    return { valid: false, reason: 'Please enter a real name' };
  }

  return { valid: true };
}
