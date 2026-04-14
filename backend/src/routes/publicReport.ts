import { Router } from 'express';
import { supabase } from '../db/supabaseClient';
import { verifyReportToken } from '../services/reportToken';
import { generateQuizReport } from '../services/pdfReport';

const router = Router();

// GET /api/public/leads/:leadId/report - download PDF report (requires signed token)
router.get('/public/leads/:leadId/report', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Verify the token
    let leadId: string;
    try {
      leadId = verifyReportToken(token);
    } catch (err: any) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Verify leadId matches the param
    if (leadId !== req.params.leadId) {
      return res.status(401).json({ error: 'Token does not match lead ID' });
    }

    // Fetch lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, name, email, quiz_id, outcome_id, answers, created_at')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Fetch quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, mode, questions, outcomes, branding, settings')
      .eq('id', lead.quiz_id)
      .single();

    if (quizError || !quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Check if reports are enabled
    if (!quiz.settings?.report_enabled) {
      return res.status(403).json({ error: 'Reports are not enabled for this quiz' });
    }

    // Find the outcome
    const outcome = quiz.outcomes?.find((o: any) => o.id === lead.outcome_id);
    if (!outcome) {
      return res.status(404).json({ error: 'Outcome not found' });
    }

    // Generate the PDF
    const pdfBuffer = await generateQuizReport(
      lead,
      quiz,
      outcome,
      lead.answers || {},
      {
        enabled: true,
        include_answers: quiz.settings?.report_include_answers || false,
        custom_footer_text: quiz.settings?.report_custom_footer || undefined,
      }
    );

    // Return PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${lead.name?.replace(/\s+/g, '-') || 'lead'}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('Report generation error:', err);
    res.status(500).json({ error: err.message ?? 'Failed to generate report' });
  }
});

export default router;
