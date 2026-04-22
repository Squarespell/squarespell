/**
 * automation.ts — API routes for email automation rules.
 * CRUD for automation rules + execution log.
 */

import { Router } from 'express';
import { requireAuth, attachUser, AuthenticatedRequest } from '../middleware/auth';
import { supabase } from '../db/supabaseClient';

export var automationRouter = Router();

// GET /api/automations — list all automation rules
automationRouter.get('/', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { data, error } = await supabase
      .from('email_automation_rules')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/automations — create automation rule
automationRouter.post('/', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { name, trigger_config, action_config, delay_minutes } = req.body;
    if (!name || !trigger_config || !action_config) {
      return res.status(400).json({ error: 'name, trigger_config, action_config required' });
    }

    var { data, error } = await supabase
      .from('email_automation_rules')
      .insert({
        user_id: req.userId,
        name: name,
        trigger_config: trigger_config,
        action_config: action_config,
        delay_minutes: delay_minutes || 0,
      })
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/automations/:id — update automation rule
automationRouter.patch('/:id', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { name, trigger_config, action_config, delay_minutes, enabled } = req.body;
    var updateObj: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateObj.name = name;
    if (trigger_config !== undefined) updateObj.trigger_config = trigger_config;
    if (action_config !== undefined) updateObj.action_config = action_config;
    if (delay_minutes !== undefined) updateObj.delay_minutes = delay_minutes;
    if (enabled !== undefined) updateObj.enabled = enabled;

    var { data, error } = await supabase
      .from('email_automation_rules')
      .update(updateObj)
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/automations/:id — delete automation rule
automationRouter.delete('/:id', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { error } = await supabase
      .from('email_automation_rules')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/automations/:id/log — execution log for a rule
automationRouter.get('/:id/log', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    // Verify ownership
    var { data: rule } = await supabase
      .from('email_automation_rules')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();
    if (!rule) return res.status(404).json({ error: 'Rule not found' });

    var limit = parseInt(req.query.limit as string) || 50;
    var { data, error } = await supabase
      .from('automation_execution_log')
      .select('*')
      .eq('rule_id', req.params.id)
      .order('executed_at', { ascending: false })
      .limit(limit);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
