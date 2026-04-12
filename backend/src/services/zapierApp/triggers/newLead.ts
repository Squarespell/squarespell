import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface NewLeadPayload {
  lead_id: string;
  email: string;
  name: string;
  quiz_title: string;
  outcome_title: string;
  score?: number;
  answers: Record<string, any>;
  created_at: string;
}

/**
 * Perform: fetch leads created since last poll
 * Called whenever Zapier needs to fetch new leads
 */
export async function perform(z: any, bundle: any): Promise<NewLeadPayload[]> {
  try {
    const userId = bundle.authData.user_id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Get the timestamp of the last poll (or default to 1 hour ago)
    const lastPoll = bundle.meta?.lastFetchTime
      ? new Date(bundle.meta.lastFetchTime)
      : new Date(Date.now() - 60 * 60 * 1000);

    // Fetch leads created since last poll
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, email, name, answers, outcome_id, created_at, quiz_id')
      .eq('user_id', userId)
      .gte('created_at', lastPoll.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (!leads || leads.length === 0) {
      return [];
    }

    // Fetch quiz and outcome information for each lead
    const enrichedLeads: NewLeadPayload[] = [];

    for (const lead of leads) {
      try {
        // Get quiz title
        const { data: quiz, error: quizError } = await supabase
          .from('quizzes')
          .select('title, outcomes')
          .eq('id', lead.quiz_id)
          .single();

        if (quizError || !quiz) {
          console.warn(`Could not fetch quiz ${lead.quiz_id} for lead ${lead.id}`);
          continue;
        }

        // Find outcome title from outcomes array
        let outcomeTitle = 'Unknown';
        if (quiz.outcomes && Array.isArray(quiz.outcomes)) {
          const outcome = quiz.outcomes.find((o: any) => o.id === lead.outcome_id);
          if (outcome) {
            outcomeTitle = outcome.title || 'Unknown';
          }
        }

        enrichedLeads.push({
          lead_id: lead.id,
          email: lead.email,
          name: lead.name || '',
          quiz_title: quiz.title,
          outcome_title: outcomeTitle,
          answers: lead.answers || {},
          created_at: lead.created_at,
        });
      } catch (err: any) {
        console.error(`Error enriching lead ${lead.id}:`, err);
      }
    }

    return enrichedLeads;
  } catch (err: any) {
    console.error('newLead trigger error:', err);
    throw err;
  }
}

/**
 * Zapier trigger definition for "New Lead Captured"
 */
export const newLead = {
  key: 'new_lead',
  noun: 'Lead',
  display: {
    label: 'New Lead Captured',
    description: 'Triggers when a new lead is captured from your quiz.',
    hidden: false,
  },
  operation: {
    type: 'polling',
    inputFields: [],
    outputFields: [
      {
        key: 'lead_id',
        label: 'Lead ID',
        type: 'string',
      },
      {
        key: 'email',
        label: 'Email Address',
        type: 'string',
      },
      {
        key: 'name',
        label: 'Name',
        type: 'string',
      },
      {
        key: 'quiz_title',
        label: 'Quiz Title',
        type: 'string',
      },
      {
        key: 'outcome_title',
        label: 'Outcome / Result',
        type: 'string',
      },
      {
        key: 'score',
        label: 'Score',
        type: 'integer',
      },
      {
        key: 'answers',
        label: 'Quiz Answers',
        type: 'object',
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
