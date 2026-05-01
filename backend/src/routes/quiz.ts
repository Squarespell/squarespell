import { log } from '../lib/logger';
import { Router } from 'express';
import { requireAuth, attachUser, AuthenticatedRequest } from '../middleware/auth';
import { guardQuizCreation } from '../middleware/planGuard';
import { supabase } from '../db/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import * as abTesting from '../services/abTesting';
import { generateQuizReport } from '../services/pdfReport';
import { generateReportToken, verifyReportToken } from '../services/reportToken';
import * as teamService from '../services/teamService';
import { notifyQuizPublished } from '../services/notifications';
import { makeUniqueSlug, isLegacyRandomSlug } from '../utils/slug';

interface EmailInSequence {
  delay_days: number;
  subject: string;
  body: string;
  cta_url?: string;
  cta_text?: string;
}

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const router = Router();
router.use(requireAuth, attachUser);

router.get('/', async (req: AuthenticatedRequest, res) => {
  const { data, error } = await supabase.from('quizzes').select('id,title,status,slug,lead_count,view_count,created_at,updated_at').eq('user_id', req.dbUserId).neq('status', 'archived').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', guardQuizCreation, async (req: AuthenticatedRequest, res) => {
  const { title, questions, outcomes, branding, settings, mode } = req.body;
  const quizMode = mode && ['lead_quiz', 'price_calculator', 'service_recommender', 'client_qualifier', 'segmentation_quiz'].includes(mode) ? mode : 'lead_quiz';
  const { data, error } = await supabase.from('quizzes').insert({ user_id: req.dbUserId, title: title ?? 'Untitled Quiz', slug: await makeUniqueSlug(title ?? 'Untitled Quiz'), mode: quizMode, questions: questions ?? [], outcomes: outcomes ?? [], branding: branding ?? {}, settings: settings ?? {}, status: 'draft' }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  // For limited plans, the atomic guard already incremented quiz_count.
  // For unlimited plans (trial, pro, business), increment here.
  if (!(req as any).quizCountIncrementedAtomically) {
    await supabase.rpc('increment_quiz_count', { uid: req.dbUserId });
  }
  res.status(201).json(data);
});

router.get('/archived/list', async (req: AuthenticatedRequest, res) => {
  const { data, error } = await supabase.from('quizzes')
    .select('id,title,status,slug,lead_count,view_count,created_at,updated_at')
    .eq('user_id', req.dbUserId).eq('status', 'archived')
    .order('updated_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/:id', async (req: AuthenticatedRequest, res) => {
  const { data, error } = await supabase.from('quizzes').select('*').eq('id', req.params.id).eq('user_id', req.dbUserId).single();
  if (error || !data) return res.status(404).json({ error: 'Quiz not found' });
  res.json(data);
});

router.patch('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    // Get user's plan to enforce branding toggle restrictions
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('plan')
      .eq('id', req.dbUserId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const plan = user.plan ?? 'free';
    const canRemoveBranding = ['growth', 'pro', 'agency'].includes(plan);

    // Build updates
    const allowed = ['title', 'questions', 'outcomes', 'branding', 'settings', 'mode'];
    const updates: Record<string, any> = {};
    allowed.forEach(k => {
      if (req.body[k] !== undefined) {
        updates[k] = req.body[k];
      }
    });

    // Validate mode if present
    if (updates.mode && !['lead_quiz', 'price_calculator', 'service_recommender', 'client_qualifier', 'segmentation_quiz'].includes(updates.mode)) {
      return res.status(400).json({ error: 'Invalid quiz mode' });
    }

    // Enforce plan restrictions on branding toggle
    if (updates.settings) {
      if (!canRemoveBranding && updates.settings.show_branding === false) {
        // Free/Starter/Trial users cannot disable branding - force it back to true
        updates.settings = {
          ...updates.settings,
          show_branding: true,
        };
      }
    }

    // ── Optimistic locking ──────────────────────────────────────────────
    // If the client sends an expected_version, check it matches the DB
    // before applying updates. This prevents silent overwrites from
    // concurrent editors or duplicate tabs.
    var expectedVersion = req.body.expected_version;

    if (typeof expectedVersion === 'number') {
      // Use a conditional update: only succeed if version matches
      var query = supabase
        .from('quizzes')
        .update(Object.assign({}, updates, { version: expectedVersion + 1 }))
        .eq('id', req.params.id)
        .eq('user_id', req.dbUserId)
        .eq('version', expectedVersion)
        .select()
        .single();

      var { data, error } = await query;

      if (error && error.code === 'PGRST116') {
        // No row matched — either quiz not found or version mismatch
        var { data: existing } = await supabase
          .from('quizzes')
          .select('version')
          .eq('id', req.params.id)
          .eq('user_id', req.dbUserId)
          .single();

        if (existing && existing.version !== expectedVersion) {
          return res.status(409).json({
            error: 'Conflict: quiz was modified by another session',
            current_version: existing.version,
            expected_version: expectedVersion
          });
        }
        return res.status(404).json({ error: 'Quiz not found' });
      }

      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    // No version sent — legacy save (no conflict detection)
    const { data: legacyData, error: legacyError } = await supabase
      .from('quizzes')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.dbUserId)
      .select()
      .single();

    if (legacyError) return res.status(500).json({ error: legacyError.message });
    res.json(legacyData);
  } catch (err: any) {
    log.error('Quiz patch error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Update failed' });
  }
});

router.post('/:id/publish', async (req: AuthenticatedRequest, res) => {
  // M3: Validate quiz has at least 1 question and 1 outcome before publishing
  const { data: quizForValidation } = await supabase
    .from('quizzes').select('questions,outcomes')
    .eq('id', req.params.id).eq('user_id', req.dbUserId).single();
  if (!quizForValidation) return res.status(404).json({ error: 'Quiz not found' });
  var questions = quizForValidation.questions as any[] || [];
  var outcomes = quizForValidation.outcomes as any[] || [];
  if (questions.length === 0) return res.status(400).json({ error: 'Quiz must have at least 1 question to publish' });
  if (outcomes.length === 0) return res.status(400).json({ error: 'Quiz must have at least 1 outcome to publish' });

  // Validate score ranges — check for overlaps and gaps
  var scoredOutcomes = outcomes.filter(function(o: any) {
    return o.minScore !== undefined && o.maxScore !== undefined &&
           o.minScore !== null && o.maxScore !== null;
  });
  if (scoredOutcomes.length > 1) {
    // Sort by minScore
    var sorted = scoredOutcomes.slice().sort(function(a: any, b: any) { return a.minScore - b.minScore; });
    var warnings: string[] = [];
    for (var si = 0; si < sorted.length - 1; si++) {
      var curr = sorted[si];
      var next = sorted[si + 1];
      if (curr.maxScore >= next.minScore) {
        warnings.push('Score ranges overlap between "' + (curr.title || 'Outcome ' + (si + 1)) + '" and "' + (next.title || 'Outcome ' + (si + 2)) + '"');
      } else if (curr.maxScore + 1 < next.minScore) {
        warnings.push('Score gap between ' + (curr.maxScore + 1) + '-' + (next.minScore - 1) + ' has no matching outcome');
      }
    }
    // Return warnings but don't block publish — just inform the user
    if (warnings.length > 0) {
      // We still allow publish but include warnings in the response
      // The frontend can show these to the user
    }
  }

  // If the slug is still the legacy 8-char random, regenerate from title
  // so the published URL is human-readable.
  const { data: existing } = await supabase
    .from('quizzes').select('slug,title')
    .eq('id', req.params.id).eq('user_id', req.dbUserId).single();
  const updates: any = { status: 'live' };
  if (existing && isLegacyRandomSlug(existing.slug)) {
    updates.slug = await makeUniqueSlug(existing.title || 'quiz', req.params.id);
  }
  const { data, error } = await supabase.from('quizzes').update(updates).eq('id', req.params.id).eq('user_id', req.dbUserId).select().single();
  if (error) return res.status(500).json({ error: error.message });

  // Fire notification (non-blocking)
  notifyQuizPublished(req.dbUserId!, data?.title || 'Quiz', req.params.id).catch(function() {});

  res.json(data);
});

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const { error } = await supabase.from('quizzes').update({ status: 'archived' }).eq('id', req.params.id).eq('user_id', req.dbUserId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

router.post('/:id/restore', async (req: AuthenticatedRequest, res) => {
  const { data: existing } = await supabase.from('quizzes')
    .select('status').eq('id', req.params.id).eq('user_id', req.dbUserId).single();
  if (!existing) return res.status(404).json({ error: 'Quiz not found' });
  if (existing.status !== 'archived') {
    return res.status(400).json({ error: 'Quiz is not archived' });
  }
  const { data, error } = await supabase.from('quizzes')
    .update({ status: 'draft' }).eq('id', req.params.id).eq('user_id', req.dbUserId).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});


// POST /api/quizzes/:id/duplicate - clone an existing quiz as a new draft
router.post('/:id/duplicate', guardQuizCreation, async (req: AuthenticatedRequest, res) => {
  try {
    const { data: source, error: srcErr } = await supabase
      .from('quizzes')
      .select('title, questions, outcomes, branding, settings, mode')
      .eq('id', req.params.id)
      .eq('user_id', req.dbUserId)
      .single();
    if (srcErr || !source) return res.status(404).json({ error: 'Quiz not found' });

    const srcTitle = (source.title as string) || 'Untitled Quiz';
    // Avoid piling up "(Copy) (Copy) (Copy)" - cap to a single suffix
    const newTitle = /\(Copy\)$/i.test(srcTitle.trim()) ? srcTitle : `${srcTitle} (Copy)`;

    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        user_id: req.dbUserId,
        title: newTitle,
        slug: await makeUniqueSlug(newTitle),
        mode: source.mode ?? 'lead_quiz',
        questions: source.questions ?? [],
        outcomes: source.outcomes ?? [],
        branding: source.branding ?? {},
        settings: source.settings ?? {},
        status: 'draft',
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });

    await supabase.rpc('increment_quiz_count', { uid: req.dbUserId });
    res.status(201).json(data);
  } catch (err: any) {
    log.error('Quiz duplicate error:', { err: err });
    res.status(500).json({ error: err?.message ?? 'Duplicate failed' });
  }
});

router.get('/:id/leads', async (req: AuthenticatedRequest, res) => {
  const { data, error } = await supabase.from('leads').select('id,name,email,outcome_id,created_at').eq('quiz_id', req.params.id).eq('user_id', req.dbUserId).order('created_at', { ascending: false }).limit(500);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

router.get('/:id/leads/export', async (req: AuthenticatedRequest, res) => {
  const { data, error } = await supabase.from('leads').select('name,email,outcome_id,created_at,answers').eq('quiz_id', req.params.id).eq('user_id', req.dbUserId).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  const rows = data ?? [];
  const csv = ['Name,Email,Outcome,Date,Answers', ...rows.map(r => [`"${(r.name??'').replace(/"/g,'""')}"`,`"${r.email}"`,`"${(r.outcome_id??'')}"`,`"${new Date(r.created_at).toISOString()}"`,`"${JSON.stringify(r.answers??{}).replace(/"/g,'""')}"`].join(','))].join('\n');
  res.setHeader('Content-Type','text/csv');
  res.setHeader('Content-Disposition','attachment; filename="leads.csv"');
  res.send(csv);
});

// ── Email Sequences ───────────────────────────────────────────────────────────
// GET /api/quizzes/:id/sequences - list all email sequences for a quiz
router.get('/:id/sequences', async (req: AuthenticatedRequest, res) => {
  try {
    // Verify quiz ownership
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, user_id')
      .eq('id', req.params.id)
      .single();

    if (quizError || !quiz || quiz.user_id !== req.dbUserId) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const { data: sequences, error: seqError } = await supabase
      .from('email_sequences')
      .select('id, quiz_id, outcome_id, name, emails, conditions, enabled, created_at, updated_at')
      .eq('quiz_id', req.params.id)
      .order('created_at', { ascending: false });

    if (seqError) {
      return res.status(500).json({ error: seqError.message });
    }

    res.json(sequences ?? []);
  } catch (err: any) {
    log.error('Sequences list error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to fetch sequences' });
  }
});

// POST /api/quizzes/:id/sequences - create a new email sequence
router.post('/:id/sequences', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, emails, conditions, enabled } = req.body;

    // Verify quiz ownership
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, user_id')
      .eq('id', req.params.id)
      .single();

    if (quizError || !quiz || quiz.user_id !== req.dbUserId) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Validate name
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Sequence name is required' });
    }

    // Validate emails array
    if (!Array.isArray(emails)) {
      return res.status(400).json({ error: 'emails must be an array' });
    }

    // Validate each email in the sequence
    for (const email of emails) {
      if (typeof email.delay_days !== 'number' || email.delay_days < 0) {
        return res.status(400).json({ error: 'Each email must have delay_days >= 0' });
      }
      if (typeof email.subject !== 'string' || !email.subject.trim()) {
        return res.status(400).json({ error: 'Each email must have a subject' });
      }
      if (typeof email.body !== 'string' || !email.body.trim()) {
        return res.status(400).json({ error: 'Each email must have a body' });
      }
    }

    // Validate and default conditions
    let validConditions = conditions || {};
    if (typeof validConditions !== 'object') {
      return res.status(400).json({ error: 'conditions must be an object' });
    }

    // Create sequence
    const { data: sequence, error: insertError } = await supabase
      .from('email_sequences')
      .insert({
        quiz_id: req.params.id,
        outcome_id: null,
        name: name.trim(),
        emails,
        conditions: validConditions,
        enabled: enabled !== false,
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    res.status(201).json(sequence);
  } catch (err: any) {
    log.error('Sequence create error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to create sequence' });
  }
});

// PUT /api/quizzes/:id/sequences/:sequenceId - update an email sequence
router.put('/:id/sequences/:sequenceId', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, emails, conditions, enabled } = req.body;

    // Verify quiz ownership
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, user_id')
      .eq('id', req.params.id)
      .single();

    if (quizError || !quiz || quiz.user_id !== req.dbUserId) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Validate name if provided
    if (name !== undefined && (!name || typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ error: 'Sequence name must be a non-empty string' });
    }

    // Validate emails array if provided
    if (emails !== undefined) {
      if (!Array.isArray(emails)) {
        return res.status(400).json({ error: 'emails must be an array' });
      }

      for (const email of emails) {
        if (typeof email.delay_days !== 'number' || email.delay_days < 0) {
          return res.status(400).json({ error: 'Each email must have delay_days >= 0' });
        }
        if (typeof email.subject !== 'string' || !email.subject.trim()) {
          return res.status(400).json({ error: 'Each email must have a subject' });
        }
        if (typeof email.body !== 'string' || !email.body.trim()) {
          return res.status(400).json({ error: 'Each email must have a body' });
        }
      }
    }

    // Validate conditions if provided
    if (conditions !== undefined && typeof conditions !== 'object') {
      return res.status(400).json({ error: 'conditions must be an object' });
    }

    // Build update object
    const updates: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name.trim();
    if (emails !== undefined) updates.emails = emails;
    if (conditions !== undefined) updates.conditions = conditions;
    if (enabled !== undefined) updates.enabled = enabled;

    // Update sequence
    const { data: sequence, error: updateError } = await supabase
      .from('email_sequences')
      .update(updates)
      .eq('id', req.params.sequenceId)
      .eq('quiz_id', req.params.id)
      .select()
      .single();

    if (updateError || !sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    res.json(sequence);
  } catch (err: any) {
    log.error('Sequence update error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to update sequence' });
  }
});

// DELETE /api/quizzes/:id/sequences/:sequenceId - delete an email sequence
router.delete('/:id/sequences/:sequenceId', async (req: AuthenticatedRequest, res) => {
  try {
    // Verify quiz ownership
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, user_id')
      .eq('id', req.params.id)
      .single();

    if (quizError || !quiz || quiz.user_id !== req.dbUserId) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const { error: deleteError } = await supabase
      .from('email_sequences')
      .delete()
      .eq('id', req.params.sequenceId)
      .eq('quiz_id', req.params.id);

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }

    res.json({ success: true });
  } catch (err: any) {
    log.error('Sequence delete error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to delete sequence' });
  }
});

// ── Outcome Automations (one-node MVP) ────────────────────────────────────
// GET /api/quizzes/:id/outcome-automations - load existing auto-sequences
router.get('/:id/outcome-automations', async (req: AuthenticatedRequest, res) => {
  try {
    const quizId = req.params.id;
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, user_id')
      .eq('id', quizId)
      .single();
    if (quizError || !quiz || quiz.user_id !== req.dbUserId) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const { data: sequences } = await supabase
      .from('email_sequences')
      .select('id, name, emails, conditions, enabled')
      .eq('quiz_id', quizId)
      .like('name', 'auto:%');

    const automations = (sequences || []).map((seq: any) => {
      const cond = seq.conditions as any;
      const email = (seq.emails as any[])?.[0] || {};
      return {
        outcome_id: cond?.outcome_ids?.[0] || '',
        enabled: seq.enabled,
        subject: email.subject || '',
        body: email.body || '',
        cta_url: email.cta_url || '',
        cta_text: email.cta_text || '',
        sequence_id: seq.id,
      };
    });

    res.json(automations);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Failed to load automations' });
  }
});

// PUT /api/quizzes/:id/outcome-automations
// Syncs inline automation configs from the builder to email_sequences.
// Each automation creates a single-email sequence keyed to one outcome.
router.put('/:id/outcome-automations', async (req: AuthenticatedRequest, res) => {
  try {
    const quizId = req.params.id;
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, user_id')
      .eq('id', quizId)
      .single();
    if (quizError || !quiz || quiz.user_id !== req.dbUserId) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // automations: array of { outcome_id, enabled, subject, body, cta_url?, cta_text? }
    const automations: Array<{
      outcome_id: string;
      enabled: boolean;
      subject: string;
      body: string;
      cta_url?: string;
      cta_text?: string;
    }> = req.body.automations || [];

    // Fetch existing auto-sequences for this quiz (tagged via name convention)
    const { data: existing } = await supabase
      .from('email_sequences')
      .select('id, name, conditions')
      .eq('quiz_id', quizId)
      .like('name', 'auto:%');
    const existingByOutcome = new Map<string, string>();
    for (const seq of existing || []) {
      const cond = seq.conditions as any;
      const oid = cond?.outcome_ids?.[0];
      if (oid) existingByOutcome.set(oid, seq.id);
    }

    const results: Array<{ outcome_id: string; sequence_id: string; action: string }> = [];

    for (const auto of automations) {
      const seqId = existingByOutcome.get(auto.outcome_id);
      if (auto.enabled && auto.subject) {
        const emailPayload: EmailInSequence = {
          delay_days: 0,
          subject: auto.subject,
          body: auto.body || '',
          cta_url: auto.cta_url || undefined,
          cta_text: auto.cta_text || undefined,
        };
        if (seqId) {
          // Update existing
          await supabase.from('email_sequences').update({
            emails: [emailPayload],
            enabled: true,
            updated_at: new Date().toISOString(),
          }).eq('id', seqId);
          results.push({ outcome_id: auto.outcome_id, sequence_id: seqId, action: 'updated' });
        } else {
          // Create new
          const { data: created } = await supabase.from('email_sequences').insert({
            quiz_id: quizId,
            name: `auto:${auto.outcome_id}`,
            emails: [emailPayload],
            conditions: { outcome_ids: [auto.outcome_id] },
            enabled: true,
          }).select('id').single();
          if (created) {
            results.push({ outcome_id: auto.outcome_id, sequence_id: created.id, action: 'created' });
          }
        }
        existingByOutcome.delete(auto.outcome_id);
      } else if (seqId) {
        // Disable or remove the automation
        await supabase.from('email_sequences').update({
          enabled: false,
          updated_at: new Date().toISOString(),
        }).eq('id', seqId);
        results.push({ outcome_id: auto.outcome_id, sequence_id: seqId, action: 'disabled' });
        existingByOutcome.delete(auto.outcome_id);
      }
    }

    res.json({ ok: true, results });
  } catch (err: any) {
    log.error('Outcome automation sync error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to sync automations' });
  }
});

// ── AI Email Content Generation ──────────────────────────────────────────
// POST /api/quizzes/:id/generate-email - generate subject + body for an outcome follow-up
router.post('/:id/generate-email', async (req: AuthenticatedRequest, res) => {
  try {
    const quizId = req.params.id;
    const { outcome_id, fields } = req.body; // fields: ['subject'] | ['body'] | ['subject','body']

    // Load quiz to get title and outcome details
    const { data: quiz, error: qErr } = await supabase
      .from('quizzes')
      .select('title, outcomes, brand')
      .eq('id', quizId)
      .eq('user_id', req.userId)
      .single();
    if (qErr || !quiz) return res.status(404).json({ error: 'Quiz not found' });

    const outcomes: any[] = Array.isArray(quiz.outcomes) ? quiz.outcomes : [];
    const outcome = outcomes.find((o: any) => o.id === outcome_id);
    if (!outcome) return res.status(400).json({ error: 'Outcome not found in quiz' });

    const businessName = quiz.brand?.site_name || quiz.title || 'Our business';

    const { generateEmailContent } = await import('../services/claudeService');
    const result = await generateEmailContent(
      quiz.title,
      outcome.title || outcome.name || 'Your result',
      outcome.description || '',
      businessName,
      Array.isArray(fields) ? fields : ['subject', 'body']
    );

    res.json(result);
  } catch (err: any) {
    log.error('Generate email content error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to generate email content' });
  }
});

// ── A/B Testing ───────────────────────────────────────────────────────────
// POST /api/quizzes/:id/ab-tests - create a new A/B test
router.post('/:id/ab-tests', async (req: AuthenticatedRequest, res) => {
  try {
    const quizId = req.params.id;
    const { name, variants } = req.body;

    if (!quizId) {
      return res.status(400).json({ error: 'Quiz ID is required' });
    }

    // Verify quiz ownership
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, user_id')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz || quiz.user_id !== req.dbUserId) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Validate input
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Test name is required' });
    }

    if (!Array.isArray(variants) || variants.length < 2) {
      return res.status(400).json({ error: 'At least 2 variants are required' });
    }

    // Validate variants
    for (const v of variants) {
      if (!v.variant_id || !v.quiz_id || typeof v.weight !== 'number' || v.weight <= 0) {
        return res.status(400).json({ error: 'Each variant must have variant_id, quiz_id, and weight > 0' });
      }
    }

    if (!req.dbUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const test = await abTesting.createTest(req.dbUserId, quizId, name, variants);
    res.status(201).json(test);
  } catch (err: any) {
    log.error('Create test error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to create test' });
  }
});

// GET /api/quizzes/:id/ab-tests - list all tests for a quiz
router.get('/:id/ab-tests', async (req: AuthenticatedRequest, res) => {
  try {
    const quizId = req.params.id;

    if (!quizId) {
      return res.status(400).json({ error: 'Quiz ID is required' });
    }

    // Verify quiz ownership
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, user_id')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz || quiz.user_id !== req.dbUserId) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const tests = await abTesting.listTestsForQuiz(quizId);
    res.json(tests);
  } catch (err: any) {
    log.error('List tests error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to list tests' });
  }
});

// GET /api/ab-tests/:testId - get test details with stats
router.get('/tests/:testId', async (req: AuthenticatedRequest, res) => {
  try {
    const test = await abTesting.getTest(req.params.testId);

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Verify ownership
    if (test.user_id !== req.dbUserId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get stats
    const stats = await abTesting.getTestStats(req.params.testId);

    res.json({ ...test, stats });
  } catch (err: any) {
    log.error('Get test error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to get test' });
  }
});

// PATCH /api/ab-tests/:testId - update test status
router.patch('/tests/:testId', async (req: AuthenticatedRequest, res) => {
  try {
    const { status } = req.body;

    const test = await abTesting.getTest(req.params.testId);

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    if (test.user_id !== req.dbUserId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!['running', 'paused', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updated = await abTesting.updateTestStatus(req.params.testId, status);
    res.json(updated);
  } catch (err: any) {
    log.error('Update test error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to update test' });
  }
});

// POST /api/ab-tests/:testId/winner - declare a winner
router.post('/tests/:testId/winner', async (req: AuthenticatedRequest, res) => {
  try {
    const { variant_id } = req.body;

    const test = await abTesting.getTest(req.params.testId);

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    if (test.user_id !== req.dbUserId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!variant_id) {
      return res.status(400).json({ error: 'Variant ID is required' });
    }

    const updated = await abTesting.declareWinner(req.params.testId, variant_id);
    res.json(updated);
  } catch (err: any) {
    log.error('Declare winner error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to declare winner' });
  }
});

// GET /api/public/ab-test/:testId/assign - public endpoint to assign visitor to variant
router.get('/public/ab-test/:testId/assign', async (req, res) => {
  try {
    const testId = req.params.testId;
    const { visitor_id } = req.query;

    if (!testId) {
      return res.status(400).json({ error: 'Test ID is required' });
    }

    if (!visitor_id || typeof visitor_id !== 'string') {
      return res.status(400).json({ error: 'visitor_id query parameter is required' });
    }

    const assignment = await abTesting.assignVariant(testId, visitor_id);
    res.json(assignment);
  } catch (err: any) {
    log.error('Assign variant error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to assign variant' });
  }
});

// ── Team Management ────────────────────────────────────────────────────────

// POST /api/teams - Create a new team
router.post('/teams', async (req: AuthenticatedRequest, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const team = await teamService.createTeam(req.userId!, name.trim());
    res.status(201).json(team);
  } catch (err: any) {
    log.error('Create team error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to create team' });
  }
});

// GET /api/teams - List user's teams
router.get('/teams', async (req: AuthenticatedRequest, res) => {
  try {
    const teams = await teamService.getUserTeams(req.userId!);
    res.json(teams);
  } catch (err: any) {
    log.error('List teams error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to fetch teams' });
  }
});

// GET /api/teams/:teamId - Get team details with members
router.get('/teams/:teamId', async (req: AuthenticatedRequest, res) => {
  try {
    const teamId = req.params.teamId;

    // Check if user is a member of this team
    const hasAccess = await teamService.checkTeamPermission(teamId, req.userId!, 'viewer');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const team = await teamService.getTeamDetails(teamId);
    res.json(team);
  } catch (err: any) {
    log.error('Get team error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to fetch team' });
  }
});

// POST /api/teams/:teamId/members - Invite a member to team
router.post('/teams/:teamId/members', async (req: AuthenticatedRequest, res) => {
  try {
    const teamId = req.params.teamId;
    const { email, role } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!['owner', 'admin', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user is admin or owner in this team
    const hasPermission = await teamService.checkTeamPermission(teamId, req.userId!, 'admin');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Only admins can invite members' });
    }

    const member = await teamService.inviteMember(teamId, email.trim(), role, req.userId!);
    res.status(201).json(member);
  } catch (err: any) {
    log.error('Invite member error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to invite member' });
  }
});

// PATCH /api/teams/:teamId/members/:userId - Update member role
router.patch('/teams/:teamId/members/:userId', async (req: AuthenticatedRequest, res) => {
  try {
    const { teamId, userId } = req.params;
    const { role } = req.body;

    if (!['owner', 'admin', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user is admin or owner in this team
    const hasPermission = await teamService.checkTeamPermission(teamId, req.userId!, 'admin');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Only admins can update roles' });
    }

    const member = await teamService.updateMemberRole(teamId, userId, role);
    res.json(member);
  } catch (err: any) {
    log.error('Update member role error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to update member role' });
  }
});

// DELETE /api/teams/:teamId/members/:userId - Remove member from team
router.delete('/teams/:teamId/members/:userId', async (req: AuthenticatedRequest, res) => {
  try {
    const { teamId, userId } = req.params;

    // Check if user is admin or owner in this team
    const hasPermission = await teamService.checkTeamPermission(teamId, req.userId!, 'admin');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Only admins can remove members' });
    }

    await teamService.removeMember(teamId, userId);
    res.json({ success: true });
  } catch (err: any) {
    log.error('Remove member error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to remove member' });
  }
});

// POST /api/teams/:teamId/quizzes - Share quiz with team
router.post('/teams/:teamId/quizzes', async (req: AuthenticatedRequest, res) => {
  try {
    const { teamId } = req.params;
    const { quizId } = req.body;

    if (!quizId) {
      return res.status(400).json({ error: 'Quiz ID is required' });
    }

    // Check if user is admin or owner in this team
    const hasPermission = await teamService.checkTeamPermission(teamId, req.userId!, 'admin');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Only admins can share quizzes' });
    }

    // Verify user owns the quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id')
      .eq('id', quizId)
      .eq('user_id', req.dbUserId)
      .single();

    if (quizError || !quiz) {
      return res.status(404).json({ error: 'Quiz not found or not owned by you' });
    }

    const teamQuiz = await teamService.addQuizToTeam(teamId, quizId);
    res.status(201).json(teamQuiz);
  } catch (err: any) {
    log.error('Share quiz error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to share quiz' });
  }
});

// DELETE /api/teams/:teamId/quizzes/:quizId - Remove quiz from team
router.delete('/teams/:teamId/quizzes/:quizId', async (req: AuthenticatedRequest, res) => {
  try {
    const { teamId, quizId } = req.params;

    // Check if user is admin or owner in this team
    const hasPermission = await teamService.checkTeamPermission(teamId, req.userId!, 'admin');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Only admins can unshare quizzes' });
    }

    await teamService.removeQuizFromTeam(teamId, quizId);
    res.json({ success: true });
  } catch (err: any) {
    log.error('Remove quiz error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to remove quiz' });
  }
});

// ── ROI Analytics ───────────────────────────────────────────────────────────
// GET /api/quizzes/:id/analytics/roi - get ROI analytics for a quiz
router.get('/:id/analytics/roi', async (req: AuthenticatedRequest, res) => {
  try {
    // Verify quiz ownership
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, user_id, mode, settings')
      .eq('id', req.params.id)
      .eq('user_id', req.dbUserId)
      .single();

    if (quizError || !quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Get all leads for this quiz
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, metadata, answers')
      .eq('quiz_id', req.params.id)
      .eq('user_id', req.dbUserId);

    if (leadsError) {
      return res.status(500).json({ error: leadsError.message });
    }

    const allLeads = leads ?? [];
    const totalLeads = allLeads.length;
    const dealValue = quiz.settings?.average_deal_value ?? 0;

    let estimatedPipeline = 0;
    let qualifiedLeads = 0;

    if (quiz.mode === 'price_calculator') {
      // For price_calculator: sum calculated_price from metadata
      estimatedPipeline = allLeads.reduce((sum, lead) => {
        const price = lead.metadata?.calculated_price ?? 0;
        return sum + (typeof price === 'number' ? price : 0);
      }, 0);
    } else if (quiz.mode === 'client_qualifier') {
      // For client_qualifier: count qualified leads and multiply by deal_value
      qualifiedLeads = allLeads.filter(lead => {
        const answers = lead.answers ?? {};
        const isQualified = Object.values(answers).some(v => v === true);
        return isQualified;
      }).length;
      estimatedPipeline = qualifiedLeads * dealValue;
    } else {
      // For all other modes: multiply total leads by deal_value
      estimatedPipeline = totalLeads * dealValue;
    }

    res.json({
      total_leads: totalLeads,
      qualified_leads: qualifiedLeads,
      estimated_pipeline: estimatedPipeline,
      average_deal_value: dealValue,
    });
  } catch (err: any) {
    log.error('ROI analytics error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to get ROI analytics' });
  }
});

// ── PDF Reports ───────────────────────────────────────────────────────────
// POST /api/quizzes/:id/report-settings - save report settings
router.post('/:id/report-settings', async (req: AuthenticatedRequest, res) => {
  try {
    const { enabled, include_answers, custom_footer_text } = req.body;

    // Verify quiz ownership
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, user_id, settings')
      .eq('id', req.params.id)
      .single();

    if (quizError || !quiz || quiz.user_id !== req.dbUserId) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Merge new report settings into existing settings
    const updatedSettings = {
      ...(quiz.settings || {}),
      report_enabled: enabled !== false,
      report_include_answers: include_answers === true,
      report_custom_footer: custom_footer_text || '',
    };

    const { data: updated, error: updateError } = await supabase
      .from('quizzes')
      .update({ settings: updatedSettings })
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    res.json(updated);
  } catch (err: any) {
    log.error('Report settings error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to save report settings' });
  }
});

export default router;
