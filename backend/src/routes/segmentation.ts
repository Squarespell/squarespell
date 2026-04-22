/**
 * segmentation.ts — API routes for lead tags, segments, and auto-tag rules.
 * Internal segmentation engine — replaces Mailchimp/Klaviyo.
 */

import { Router } from 'express';
import { requireAuth, attachUser, AuthenticatedRequest } from '../middleware/auth';
import { supabase } from '../db/supabaseClient';
import {
  createTag, assignTag, removeTag, getLeadTags,
  createSegment, updateSegment, deleteSegment, listSegments,
  getSegmentLeads,
} from '../services/segmentation';
import type { SegmentRule } from '../services/segmentation';

export var segmentationRouter = Router();

// ── TAGS ─────────────────────────────────────────────────────────────────────

// GET /api/tags — list all tags for user
segmentationRouter.get('/tags', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { data, error } = await supabase
      .from('lead_tags')
      .select('*')
      .eq('user_id', req.userId)
      .order('name');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tags — create a tag
segmentationRouter.post('/tags', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    var { data, error } = await createTag(req.userId!, name, color);
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tags/:id — delete a tag
segmentationRouter.delete('/tags/:id', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { error } = await supabase
      .from('lead_tags')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/:leadId/tags — assign tag to lead
segmentationRouter.post('/leads/:leadId/tags', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { tag_id } = req.body;
    if (!tag_id) return res.status(400).json({ error: 'tag_id required' });
    var { data, error } = await assignTag(req.params.leadId, tag_id, 'manual');
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leads/:leadId/tags/:tagId — remove tag from lead
segmentationRouter.delete('/leads/:leadId/tags/:tagId', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { error } = await removeTag(req.params.leadId, req.params.tagId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/:leadId/tags — get tags for a lead
segmentationRouter.get('/leads/:leadId/tags', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var tags = await getLeadTags(req.params.leadId);
    res.json(tags);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── SEGMENTS ─────────────────────────────────────────────────────────────────

// GET /api/segments — list all segments
segmentationRouter.get('/segments', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { data, error } = await listSegments(req.userId!);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/segments — create a segment
segmentationRouter.post('/segments', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { name, rules, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    if (!rules || !Array.isArray(rules)) return res.status(400).json({ error: 'rules array required' });
    var { data, error } = await createSegment(req.userId!, name, rules as SegmentRule[], description);
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/segments/:id — update a segment
segmentationRouter.patch('/segments/:id', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { name, rules, description } = req.body;
    var { data, error } = await updateSegment(req.params.id, req.userId!, { name, rules, description });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/segments/:id — delete a segment
segmentationRouter.delete('/segments/:id', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { error } = await deleteSegment(req.params.id, req.userId!);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/segments/:id/leads — get leads matching a segment
segmentationRouter.get('/segments/:id/leads', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var limit = parseInt(req.query.limit as string) || 50;
    var offset = parseInt(req.query.offset as string) || 0;
    var result = await getSegmentLeads(req.params.id, req.userId!, limit, offset);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── AUTO-TAG RULES ───────────────────────────────────────────────────────────

// GET /api/auto-tag-rules — list all rules
segmentationRouter.get('/auto-tag-rules', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { data, error } = await supabase
      .from('auto_tag_rules')
      .select('*, lead_tags(name, color)')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auto-tag-rules — create a rule
segmentationRouter.post('/auto-tag-rules', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { tag_id, conditions, quiz_id } = req.body;
    if (!tag_id) return res.status(400).json({ error: 'tag_id required' });
    var { data, error } = await supabase
      .from('auto_tag_rules')
      .insert({
        user_id: req.userId,
        tag_id: tag_id,
        conditions: conditions || [],
        quiz_id: quiz_id || null,
      })
      .select('*, lead_tags(name, color)')
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/auto-tag-rules/:id — update a rule
segmentationRouter.patch('/auto-tag-rules/:id', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { conditions, enabled, quiz_id } = req.body;
    var updateObj: any = {};
    if (conditions !== undefined) updateObj.conditions = conditions;
    if (enabled !== undefined) updateObj.enabled = enabled;
    if (quiz_id !== undefined) updateObj.quiz_id = quiz_id;

    var { data, error } = await supabase
      .from('auto_tag_rules')
      .update(updateObj)
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select('*, lead_tags(name, color)')
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auto-tag-rules/:id — delete a rule
segmentationRouter.delete('/auto-tag-rules/:id', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { error } = await supabase
      .from('auto_tag_rules')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
