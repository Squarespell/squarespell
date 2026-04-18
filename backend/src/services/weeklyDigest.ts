import { log } from '../lib/logger';
import { Resend } from 'resend';
import { supabase } from '../db/supabaseClient';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface WeeklyDigestParams {
  userId: string;
  userEmail: string;
}

/**
 * Task 5.6: Send weekly digest email
 * Computes last 7 days stats for user's active quizzes and sends summary email.
 */
export async function sendWeeklyDigest(params: WeeklyDigestParams): Promise<boolean> {
  if (!resend) {
    log.info('[WeeklyDigest] Resend not configured, skipping');
    return false;
  }

  const { userId, userEmail } = params;

  try {
    // Fetch all active quizzes for user
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id,title,slug')
      .eq('user_id', userId)
      .eq('status', 'live');

    if (!quizzes || quizzes.length === 0) {
      log.info('[WeeklyDigest] No active quizzes found for user', { detail: userId });
      return false;
    }

    // Get date range for last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const isoStart = sevenDaysAgo.toISOString();

    // Compute stats for each quiz
    const quizStats = await Promise.all(
      quizzes.map(async (quiz) => {
        const { count: views } = await supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('quiz_id', quiz.id)
          .eq('event_type', 'view')
          .gte('created_at', isoStart);

        const { count: leads } = await supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('quiz_id', quiz.id)
          .gte('created_at', isoStart);

        return {
          title: quiz.title,
          slug: quiz.slug,
          views: views ?? 0,
          leads: leads ?? 0
        };
      })
    );

    // Find top quiz by leads
    const topQuiz = quizStats.reduce((max, curr) => (curr.leads > max.leads ? curr : max), quizStats[0]);

    // Calculate totals
    const totalViews = quizStats.reduce((sum, q) => sum + q.views, 0);
    const totalLeads = quizStats.reduce((sum, q) => sum + q.leads, 0);

    // Send email
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    <div style="background:#fff;border-radius:16px;padding:40px 32px">
      <h1 style="font-size:28px;margin:0 0 8px;color:#1a1a1a">Your Weekly Quiz Digest</h1>
      <p style="font-size:14px;color:#666;margin:0 0 32px">Last 7 days summary</p>

      <div style="background:#f9f9f9;border-radius:12px;padding:24px;margin:0 0 24px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:0 0 24px">
          <div>
            <p style="font-size:12px;color:#999;margin:0 0 8px;text-transform:uppercase;font-weight:600">Total Views</p>
            <p style="font-size:32px;margin:0;color:#D2FF1D;font-weight:700">${totalViews}</p>
          </div>
          <div>
            <p style="font-size:12px;color:#999;margin:0 0 8px;text-transform:uppercase;font-weight:600">Total Leads</p>
            <p style="font-size:32px;margin:0;color:#D2FF1D;font-weight:700">${totalLeads}</p>
          </div>
        </div>
        <div style="border-top:1px solid #eee;padding-top:16px">
          <p style="font-size:12px;color:#999;margin:0 0 8px;text-transform:uppercase;font-weight:600">Top Quiz</p>
          <p style="font-size:16px;margin:0;color:#1a1a1a;font-weight:600">${topQuiz.title}</p>
          <p style="font-size:13px;color:#666;margin:4px 0 0">${topQuiz.leads} leads this week</p>
        </div>
      </div>

      <div style="margin:24px 0">
        <h3 style="font-size:16px;margin:0 0 16px;color:#1a1a1a">Quiz Breakdown</h3>
        ${quizStats
          .map(
            (q) => `
          <div style="padding:12px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center">
            <div>
              <p style="font-size:14px;margin:0;color:#1a1a1a;font-weight:500">${q.title}</p>
              <p style="font-size:12px;color:#999;margin:4px 0 0">Views: ${q.views} · Leads: ${q.leads}</p>
            </div>
          </div>
        `
          )
          .join('')}
      </div>

      <a href="${process.env.APP_URL}/dashboard" style="display:inline-block;margin-top:24px;padding:14px 32px;background:#D2FF1D;color:#0a0f05;border-radius:24px;text-decoration:none;font-weight:600;font-size:14px">View Full Analytics →</a>
    </div>
    <p style="text-align:center;font-size:12px;color:#999;margin:24px 0 0">Powered by Squarespell</p>
  </div>
</body>
</html>`;

    await resend.emails.send({
      from: 'Squarespell <digest@squarespell.com>',
      to: userEmail,
      subject: `Weekly Quiz Digest: ${totalLeads} new leads`,
      html
    });

    // Log email delivery
    try {
      await supabase
        .from('email_logs')
        .insert({
          user_id: userId,
          type: 'weekly_digest',
          metadata: { totalViews, totalLeads, quizCount: quizzes.length }
        });
    } catch (err) {
      log.error('[WeeklyDigest] Failed to log email:', { err: err });
    }

    log.info('[WeeklyDigest] Sent to', { detail: userEmail });
    return true;
  } catch (error) {
    log.error('[WeeklyDigest] Failed:', { err: error });
    return false;
  }
}
