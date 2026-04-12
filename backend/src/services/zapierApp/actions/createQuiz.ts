import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function makeSlug() {
  return Math.random().toString(36).slice(2, 10);
}

interface CreateQuizRequest {
  title: string;
  mode?: string;
  description?: string;
}

interface CreateQuizResponse {
  id: string;
  title: string;
  mode: string;
  status: string;
  slug: string;
  created_at: string;
}

/**
 * Perform: create a new quiz
 */
export async function perform(z: any, bundle: any): Promise<CreateQuizResponse> {
  try {
    const userId = bundle.authData.user_id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { title, mode, description } = bundle.inputData as CreateQuizRequest;

    if (!title || !title.trim()) {
      throw new Error('Quiz title is required');
    }

    const quizMode = (mode && ['lead_quiz', 'price_calculator', 'service_recommender', 'client_qualifier', 'segmentation_quiz'].includes(mode))
      ? mode
      : 'lead_quiz';

    // Create the quiz
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .insert({
        user_id: userId,
        title: title.trim(),
        slug: makeSlug(),
        mode: quizMode,
        description: description || '',
        questions: [],
        outcomes: [],
        branding: {},
        settings: {},
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create quiz: ${error.message}`);
    }

    if (!quiz) {
      throw new Error('Quiz creation returned no data');
    }

    // Increment quiz count (non-critical, don't fail if this fails)
    try {
      await supabase.rpc('increment_quiz_count', { uid: userId });
    } catch (err: any) {
      console.warn('Failed to increment quiz count:', err);
    }

    return {
      id: quiz.id,
      title: quiz.title,
      mode: quiz.mode,
      status: quiz.status,
      slug: quiz.slug,
      created_at: quiz.created_at,
    };
  } catch (err: any) {
    console.error('createQuiz action error:', err);
    throw err;
  }
}

/**
 * Zapier action definition for "Create Quiz"
 */
export const createQuiz = {
  key: 'create_quiz',
  noun: 'Quiz',
  display: {
    label: 'Create Quiz',
    description: 'Create a new quiz in Squarespell.',
    hidden: false,
  },
  operation: {
    inputFields: [
      {
        key: 'title',
        label: 'Quiz Title',
        type: 'string',
        required: true,
        helpText: 'The name of your quiz.',
      },
      {
        key: 'mode',
        label: 'Quiz Mode',
        type: 'string',
        choices: [
          { sample: 'lead_quiz', label: 'Lead Quiz' },
          { sample: 'price_calculator', label: 'Price Calculator' },
          { sample: 'service_recommender', label: 'Service Recommender' },
          { sample: 'client_qualifier', label: 'Client Qualifier' },
          { sample: 'segmentation_quiz', label: 'Segmentation Quiz' },
        ],
        required: false,
        helpText: 'Type of quiz to create. Defaults to Lead Quiz.',
      },
      {
        key: 'description',
        label: 'Description',
        type: 'string',
        required: false,
        helpText: 'Optional description of the quiz.',
      },
    ],
    outputFields: [
      {
        key: 'id',
        label: 'Quiz ID',
        type: 'string',
      },
      {
        key: 'title',
        label: 'Quiz Title',
        type: 'string',
      },
      {
        key: 'mode',
        label: 'Quiz Mode',
        type: 'string',
      },
      {
        key: 'status',
        label: 'Status',
        type: 'string',
      },
      {
        key: 'slug',
        label: 'Quiz Slug',
        type: 'string',
      },
      {
        key: 'created_at',
        label: 'Created At',
        type: 'datetime',
      },
    ],
    perform,
  },
};
