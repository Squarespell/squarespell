/**
 * questionTypes.ts — Extended question type definitions and validation.
 *
 * New types: slider, rating, open_text, date, file_upload
 * These are stored in quiz.questions JSONB, type field determines rendering.
 */

// ── Type Definitions ─────────────────────────────────────────────────────────

export var QUESTION_TYPES = {
  // Existing
  single_select: {
    name: 'Single Select',
    description: 'Choose one answer from options',
    has_options: true,
    has_score: true,
    styles: ['buttons', 'cards', 'dropdown', 'imageChoice'],
  },
  multi_select: {
    name: 'Multi Select',
    description: 'Choose multiple answers',
    has_options: true,
    has_score: true,
    styles: ['buttons', 'cards'],
  },
  // New
  slider: {
    name: 'Slider',
    description: 'Drag to select a numeric value',
    has_options: false,
    has_score: true,
    config_schema: {
      min: { type: 'number', default: 0 },
      max: { type: 'number', default: 100 },
      step: { type: 'number', default: 1 },
      default_value: { type: 'number', default: 50 },
      labels: { type: 'object', default: { min: 'Low', max: 'High' } },
      show_value: { type: 'boolean', default: true },
    },
  },
  rating: {
    name: 'Rating',
    description: 'Star or numeric rating',
    has_options: false,
    has_score: true,
    config_schema: {
      max_stars: { type: 'number', default: 5 },
      icon: { type: 'string', default: 'star' }, // 'star' | 'heart' | 'thumb'
      labels: { type: 'object', default: {} },    // { 1: 'Poor', 5: 'Excellent' }
      allow_half: { type: 'boolean', default: false },
    },
  },
  open_text: {
    name: 'Open Text',
    description: 'Free text response',
    has_options: false,
    has_score: false,
    config_schema: {
      placeholder: { type: 'string', default: 'Type your answer...' },
      validation: { type: 'string', default: null }, // null | 'email' | 'url' | 'phone' | 'number'
      max_length: { type: 'number', default: 500 },
      multiline: { type: 'boolean', default: false },
      rows: { type: 'number', default: 3 },
    },
  },
  date: {
    name: 'Date',
    description: 'Date selection',
    has_options: false,
    has_score: false,
    config_schema: {
      min_date: { type: 'string', default: null },
      max_date: { type: 'string', default: null },
      include_time: { type: 'boolean', default: false },
      format: { type: 'string', default: 'YYYY-MM-DD' },
    },
  },
  file_upload: {
    name: 'File Upload',
    description: 'Upload a file',
    has_options: false,
    has_score: false,
    config_schema: {
      accept: { type: 'string', default: '.pdf,.jpg,.png,.doc,.docx' },
      max_size_mb: { type: 'number', default: 5 },
      multiple: { type: 'boolean', default: false },
      max_files: { type: 'number', default: 3 },
    },
  },
};

// ── Validation ───────────────────────────────────────────────────────────────

export function validateQuestionAnswer(question: any, answer: any): { valid: boolean; error?: string } {
  var qType = question.type || 'single_select';

  switch (qType) {
    case 'slider': {
      var val = Number(answer);
      var min = question.min ?? 0;
      var max = question.max ?? 100;
      if (isNaN(val) || val < min || val > max) {
        return { valid: false, error: 'Value must be between ' + min + ' and ' + max };
      }
      return { valid: true };
    }
    case 'rating': {
      var rating = Number(answer);
      var maxStars = question.max_stars ?? 5;
      if (isNaN(rating) || rating < 1 || rating > maxStars) {
        return { valid: false, error: 'Rating must be between 1 and ' + maxStars };
      }
      return { valid: true };
    }
    case 'open_text': {
      var text = String(answer || '');
      var maxLen = question.max_length ?? 500;
      if (text.length > maxLen) {
        return { valid: false, error: 'Text exceeds maximum length of ' + maxLen };
      }
      if (question.validation === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
        return { valid: false, error: 'Invalid email format' };
      }
      if (question.validation === 'url' && !/^https?:\/\/.+/.test(text)) {
        return { valid: false, error: 'Invalid URL format' };
      }
      if (question.validation === 'phone' && !/^[\d\s\-+()]{7,20}$/.test(text)) {
        return { valid: false, error: 'Invalid phone format' };
      }
      if (question.required && !text.trim()) {
        return { valid: false, error: 'This field is required' };
      }
      return { valid: true };
    }
    case 'date': {
      var dateStr = String(answer || '');
      var parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) {
        return { valid: false, error: 'Invalid date' };
      }
      if (question.min_date && parsed < new Date(question.min_date)) {
        return { valid: false, error: 'Date is before minimum allowed' };
      }
      if (question.max_date && parsed > new Date(question.max_date)) {
        return { valid: false, error: 'Date is after maximum allowed' };
      }
      return { valid: true };
    }
    default:
      return { valid: true };
  }
}

/**
 * Calculate score for a non-option question type.
 */
export function calculateQuestionScore(question: any, answer: any): number {
  var qType = question.type || 'single_select';

  switch (qType) {
    case 'slider':
      // Score = answer value directly (can be weighted via score_weight)
      return Number(answer) * (question.score_weight || 1);
    case 'rating':
      return Number(answer) * (question.score_weight || 1);
    default:
      return 0;
  }
}
