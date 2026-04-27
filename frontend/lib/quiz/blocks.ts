/**
 * Quiz block schema. Every quiz is a QuizBlock[] that represents the
 * editable structure of questions, content, and layout elements.
 *
 * This mirrors the email block system but is purpose-built for quiz editing.
 * The block editor renders these into an interactive canvas with drag-drop,
 * inline editing, and a property inspector.
 */

export type QuizBlockType =
  | 'question'
  | 'heading'
  | 'text'
  | 'image'
  | 'divider'
  | 'outcome'
  | 'leadGate'
  | 'logic';

export type QuestionStyle = 'buttons' | 'cards' | 'dropdown' | 'imageChoice';

/** Visual layout for answer options — how answers are arranged on screen */
export type AnswerLayout = 'list' | 'grid' | 'imageThumbnails' | 'fullBackground';

export interface BaseQuizBlock {
  id: string;
  type: QuizBlockType;
}

export interface QuestionOption {
  id: string;
  text: string;
  score?: number;
  imageUrl?: string;
  explanation?: string;
}

export interface BranchRule {
  if_answer: string;
  goto: string;
}

export interface QuestionBlock extends BaseQuizBlock {
  type: 'question';
  text: string;
  subtitle?: string;
  questionStyle: QuestionStyle;
  /** Visual layout for answer rendering: list (vertical), grid (2x2),
   *  imageThumbnails (list with image previews), fullBackground (image fills option) */
  answerLayout?: AnswerLayout;
  options: QuestionOption[];
  required?: boolean;
  branchRules?: BranchRule[];
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  timeLimit?: number;
  questionType?: 'single' | 'multiple';
}

export interface HeadingBlock extends BaseQuizBlock {
  type: 'heading';
  text: string;
  level: 1 | 2 | 3;
  align?: 'left' | 'center' | 'right';
}

export interface TextBlock extends BaseQuizBlock {
  type: 'text';
  content: string;
  align?: 'left' | 'center' | 'right';
}

export interface ImageBlock extends BaseQuizBlock {
  type: 'image';
  url: string;
  alt: string;
  width?: number;
  caption?: string;
}

export interface DividerBlock extends BaseQuizBlock {
  type: 'divider';
  style?: 'solid' | 'dashed' | 'dotted';
}

export interface OutcomeBlock extends BaseQuizBlock {
  type: 'outcome';
  title: string;
  description: string;
  ctaText?: string;
  ctaUrl?: string;
  minScore?: number;
  maxScore?: number;
  imageUrl?: string;
  shareEnabled?: boolean;
  shareText?: string;
}

export interface LeadGateBlock extends BaseQuizBlock {
  type: 'leadGate';
  headline: string;
  subtext?: string;
  fields: LeadGateField[];
  buttonLabel: string;
  placement: 'before_results' | 'after_question';
  afterQuestionIndex?: number;
}

export interface LeadGateField {
  id: string;
  type: 'email' | 'name' | 'phone' | 'company' | 'custom';
  label: string;
  required: boolean;
  placeholder?: string;
}

export interface LogicBlock extends BaseQuizBlock {
  type: 'logic';
  condition: 'score_range' | 'answer_match' | 'always';
  scoreMin?: number;
  scoreMax?: number;
  matchQuestionId?: string;
  matchAnswerId?: string;
  gotoBlockId: string;
}

export type QuizBlock =
  | QuestionBlock
  | HeadingBlock
  | TextBlock
  | ImageBlock
  | DividerBlock
  | OutcomeBlock
  | LeadGateBlock
  | LogicBlock;

// --- Palette metadata -------------------------------------------------------

export interface PaletteItem {
  type: QuizBlockType;
  label: string;
  icon: string;
  description: string;
}

export var QUIZ_PALETTE: PaletteItem[] = [
  { type: 'question', label: 'Question', icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11', description: 'Multiple choice question' },
  { type: 'heading', label: 'Heading', icon: 'M6 4v16M18 4v16M6 12h12', description: 'Section title' },
  { type: 'text', label: 'Text', icon: 'M4 6h16M4 10h16M4 14h10', description: 'Paragraph or description' },
  { type: 'image', label: 'Image', icon: 'M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z', description: 'Visual element' },
  { type: 'divider', label: 'Divider', icon: 'M3 12h18', description: 'Visual separator' },
  { type: 'outcome', label: 'Outcome', icon: 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3.01', description: 'Result page content' },
  { type: 'leadGate', label: 'Lead Gate', icon: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM22 8l-4 4-2-2', description: 'Email capture form' },
  { type: 'logic', label: 'Logic', icon: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5', description: 'Conditional branching' },
];

// --- Block factory ----------------------------------------------------------

var _nextId = Date.now();

export function uid(): string {
  _nextId += 1;
  return 'qblk_' + _nextId.toString(36);
}

export function createDefaultQuizBlock(type: QuizBlockType): QuizBlock {
  var id = uid();
  switch (type) {
    case 'question':
      return {
        id: id,
        type: 'question',
        text: 'Your question here',
        questionStyle: 'buttons',
        options: [
          { id: uid(), text: 'Option A', score: 0 },
          { id: uid(), text: 'Option B', score: 0 },
          { id: uid(), text: 'Option C', score: 0 },
        ],
        required: true,
      } as QuestionBlock;
    case 'heading':
      return { id: id, type: 'heading', text: 'Section heading', level: 2, align: 'center' } as HeadingBlock;
    case 'text':
      return { id: id, type: 'text', content: 'Add descriptive text here to provide context for your quiz takers.', align: 'left' } as TextBlock;
    case 'image':
      return { id: id, type: 'image', url: '', alt: 'Image description', width: 560 } as ImageBlock;
    case 'divider':
      return { id: id, type: 'divider', style: 'solid' } as DividerBlock;
    case 'outcome':
      return {
        id: id,
        type: 'outcome',
        title: 'Your Result',
        description: 'Based on your answers, here is your personalized recommendation.',
        ctaText: 'Learn more',
        ctaUrl: '',
      } as OutcomeBlock;
    case 'leadGate':
      return {
        id: id,
        type: 'leadGate',
        headline: 'Get your results',
        subtext: 'Enter your email to see your personalized recommendations.',
        fields: [
          { id: uid(), type: 'email', label: 'Email', required: true, placeholder: 'you@example.com' },
          { id: uid(), type: 'name', label: 'Name', required: false, placeholder: 'Your name' },
        ],
        buttonLabel: 'See my results',
        placement: 'before_results',
      } as LeadGateBlock;
    case 'logic':
      return {
        id: id,
        type: 'logic',
        condition: 'always',
        gotoBlockId: '',
      } as LogicBlock;
    default:
      return { id: id, type: 'text', content: 'New block', align: 'left' } as TextBlock;
  }
}

// --- Conversion helpers (legacy format <-> block format) --------------------

/**
 * Convert legacy quiz questions array + outcomes to QuizBlock[] for the
 * block editor. This lets us open old quizzes in the new editor.
 */
export function legacyToBlocks(quiz: {
  questions?: any[];
  outcomes?: any[];
  leadGate?: any;
}): QuizBlock[] {
  var blocks: QuizBlock[] = [];

  // Convert questions
  var questions = quiz.questions || [];
  for (var i = 0; i < questions.length; i++) {
    var q = questions[i];
    var opts: QuestionOption[] = [];
    var rawOpts = q.options || q.answers || [];
    for (var j = 0; j < rawOpts.length; j++) {
      opts.push({
        id: rawOpts[j].id || uid(),
        text: rawOpts[j].text || rawOpts[j].label || '',
        score: rawOpts[j].score || 0,
        imageUrl: rawOpts[j].imageUrl || undefined,
        explanation: rawOpts[j].explanation || undefined,
      });
    }
    blocks.push({
      id: q.id || uid(),
      type: 'question',
      text: q.text || q.title || '',
      subtitle: q.subtitle || undefined,
      questionStyle: q.questionStyle || (q.type === 'image_choice' ? 'imageChoice' : 'buttons'),
      answerLayout: q.answerLayout || q.answer_layout || undefined,
      options: opts,
      required: true,
      branchRules: q.next_question_rules || undefined,
      mediaUrl: q.mediaUrl || q.media_url || undefined,
      mediaType: q.mediaType || q.media_type || undefined,
      timeLimit: q.timeLimit || q.time_limit || undefined,
      questionType: q.questionType || q.question_type || 'single',
    } as QuestionBlock);
  }

  // Convert lead gate if present
  if (quiz.leadGate) {
    var lg = quiz.leadGate;
    var fields: LeadGateField[] = [];
    var lgFields = lg.fields || [];
    for (var k = 0; k < lgFields.length; k++) {
      fields.push({
        id: lgFields[k].id || uid(),
        type: lgFields[k].type || 'email',
        label: lgFields[k].label || lgFields[k].type || 'Email',
        required: lgFields[k].required !== false,
        placeholder: lgFields[k].placeholder || '',
      });
    }
    if (fields.length === 0) {
      fields.push({ id: uid(), type: 'email', label: 'Email', required: true, placeholder: 'you@example.com' });
    }
    blocks.push({
      id: uid(),
      type: 'leadGate',
      headline: lg.headline || lg.title || 'Get your results',
      subtext: lg.subtext || lg.description || '',
      fields: fields,
      buttonLabel: lg.buttonLabel || lg.ctaText || 'See my results',
      placement: 'before_results',
    } as LeadGateBlock);
  }

  // Convert outcomes
  var outcomes = quiz.outcomes || [];
  for (var m = 0; m < outcomes.length; m++) {
    var o = outcomes[m];
    blocks.push({
      id: o.id || uid(),
      type: 'outcome',
      title: o.title || 'Result ' + (m + 1),
      description: o.description || '',
      ctaText: o.ctaText || o.cta_text || '',
      ctaUrl: o.ctaUrl || o.cta_url || '',
      minScore: o.minScore ?? o.min_score,
      maxScore: o.maxScore ?? o.max_score,
      imageUrl: o.imageUrl || o.image_url || undefined,
      shareEnabled: o.shareEnabled || undefined,
      shareText: o.shareText || o.share_text || undefined,
    } as OutcomeBlock);
  }

  return blocks;
}

/**
 * Convert QuizBlock[] back to the legacy { questions, outcomes, leadGate }
 * format for saving via the existing API.
 */
export function blocksToLegacy(blocks: QuizBlock[]): {
  questions: any[];
  outcomes: any[];
  leadGate: any | null;
} {
  var questions: any[] = [];
  var outcomes: any[] = [];
  var leadGate: any = null;

  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    if (block.type === 'question') {
      var qb = block as QuestionBlock;
      questions.push({
        id: qb.id,
        text: qb.text,
        subtitle: qb.subtitle || undefined,
        type: qb.questionStyle === 'imageChoice' ? 'image_choice' : undefined,
        questionStyle: qb.questionStyle || 'buttons',
        questionType: qb.questionType || 'single',
        options: qb.options.map(function(opt) {
          return { id: opt.id, text: opt.text, score: opt.score || 0, imageUrl: opt.imageUrl, explanation: opt.explanation };
        }),
        next_question_rules: qb.branchRules || undefined,
        answerLayout: qb.answerLayout || undefined,
        mediaUrl: qb.mediaUrl || undefined,
        mediaType: qb.mediaType || undefined,
        timeLimit: qb.timeLimit || undefined,
      });
    } else if (block.type === 'outcome') {
      var ob = block as OutcomeBlock;
      outcomes.push({
        id: ob.id,
        title: ob.title,
        description: ob.description,
        ctaText: ob.ctaText || undefined,
        ctaUrl: ob.ctaUrl || undefined,
        minScore: ob.minScore,
        maxScore: ob.maxScore,
        imageUrl: ob.imageUrl || undefined,
        shareEnabled: ob.shareEnabled || undefined,
        shareText: ob.shareText || undefined,
      });
    } else if (block.type === 'leadGate') {
      var lgb = block as LeadGateBlock;
      leadGate = {
        headline: lgb.headline,
        subtext: lgb.subtext || '',
        fields: lgb.fields.map(function(f) {
          return { id: f.id, type: f.type, label: f.label, required: f.required, placeholder: f.placeholder };
        }),
        buttonLabel: lgb.buttonLabel,
        placement: lgb.placement,
        afterQuestionIndex: lgb.afterQuestionIndex,
      };
    }
  }

  return { questions: questions, outcomes: outcomes, leadGate: leadGate };
}
