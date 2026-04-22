/**
 * segmentation.ts — Internal Lead Segmentation Engine
 *
 * Replaces Mailchimp/Klaviyo segmentation entirely.
 * Handles: auto-tagging, segment evaluation, lead filtering.
 *
 * RULES FORMAT (shared by segments + auto-tag rules):
 * [
 *   { field: 'outcome_id', op: 'eq', value: 'uuid-here' },
 *   { field: 'score', op: 'gte', value: 80 },
 *   { field: 'tag', op: 'has', value: 'hot-lead' },
 *   { field: 'answer', op: 'eq', value: { question_index: 2, option_index: 1 } },
 *   { field: 'quiz_id', op: 'eq', value: 'uuid-here' },
 *   { field: 'language', op: 'eq', value: 'fr' },
 *   { field: 'created_at', op: 'gte', value: '2025-01-01' }
 * ]
 */

import { log } from '../lib/logger';
import { supabase } from '../db/supabaseClient';

// ── Types ────────────────────────────────────────────────────────────────────

interface SegmentRule {
  field: string;
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'has' | 'not_has' | 'contains' | 'in';
  value: any;
}

interface LeadContext {
  lead_id: string;
  quiz_id: string;
  user_id: string;
  outcome_id: string | null;
  score: number | null;
  answers: Record<string, any>;
  email: string;
  name: string | null;
  language: string;
  tags: string[];          // current tag names
  created_at: string;
}

// ── Rule Evaluation ──────────────────────────────────────────────────────────

function evaluateRule(rule: SegmentRule, ctx: LeadContext): boolean {
  var fieldValue: any;

  switch (rule.field) {
    case 'outcome_id':
      fieldValue = ctx.outcome_id;
      break;
    case 'score':
      fieldValue = ctx.score;
      break;
    case 'quiz_id':
      fieldValue = ctx.quiz_id;
      break;
    case 'email':
      fieldValue = ctx.email;
      break;
    case 'name':
      fieldValue = ctx.name;
      break;
    case 'language':
      fieldValue = ctx.language;
      break;
    case 'created_at':
      fieldValue = ctx.created_at;
      break;
    case 'tag':
      // Special: check tag membership
      if (rule.op === 'has') return ctx.tags.includes(String(rule.value));
      if (rule.op === 'not_has') return !ctx.tags.includes(String(rule.value));
      return false;
    case 'answer':
      // Special: check specific answer
      // value format: { question_index: N, option_index: M }
      if (rule.value && typeof rule.value === 'object') {
        var qi = String(rule.value.question_index);
        var actual = ctx.answers[qi];
        if (rule.op === 'eq') return actual === rule.value.option_index || actual === String(rule.value.option_index);
        if (rule.op === 'neq') return actual !== rule.value.option_index && actual !== String(rule.value.option_index);
      }
      return false;
    default:
      return false;
  }

  switch (rule.op) {
    case 'eq':
      return String(fieldValue) === String(rule.value);
    case 'neq':
      return String(fieldValue) !== String(rule.value);
    case 'gt':
      return Number(fieldValue) > Number(rule.value);
    case 'gte':
      return Number(fieldValue) >= Number(rule.value);
    case 'lt':
      return Number(fieldValue) < Number(rule.value);
    case 'lte':
      return Number(fieldValue) <= Number(rule.value);
    case 'contains':
      return String(fieldValue || '').toLowerCase().includes(String(rule.value).toLowerCase());
    case 'in':
      if (Array.isArray(rule.value)) return rule.value.map(String).includes(String(fieldValue));
      return false;
    case 'has':
      if (Array.isArray(fieldValue)) return fieldValue.includes(rule.value);
      return String(fieldValue) === String(rule.value);
    case 'not_has':
      if (Array.isArray(fieldValue)) return !fieldValue.includes(rule.value);
      return String(fieldValue) !== String(rule.value);
    default:
      return false;
  }
}

function evaluateAllRules(rules: SegmentRule[], ctx: LeadContext): boolean {
  if (!rules || rules.length === 0) return true;
  // ALL rules must match (AND logic)
  return rules.every(function(rule) { return evaluateRule(rule, ctx); });
}

// ── Build Lead Context ───────────────────────────────────────────────────────

async function buildLeadContext(leadId: string): Promise<LeadContext | null> {
  var { data: lead, error } = await supabase
    .from('leads')
    .select('id, quiz_id, user_id, outcome_id, score, answers, email, name, language, created_at')
    .eq('id', leadId)
    .single();

  if (error || !lead) return null;

  // Fetch current tags
  var { data: tagAssignments } = await supabase
    .from('lead_tag_assignments')
    .select('tag_id, lead_tags(name)')
    .eq('lead_id', leadId);

  var tags = (tagAssignments || []).map(function(ta: any) {
    return ta.lead_tags?.name || '';
  }).filter(Boolean);

  return {
    lead_id: lead.id,
    quiz_id: lead.quiz_id,
    user_id: lead.user_id,
    outcome_id: lead.outcome_id,
    score: lead.score,
    answers: lead.answers || {},
    email: lead.email,
    name: lead.name,
    language: lead.language || 'en',
    tags: tags,
    created_at: lead.created_at,
  };
}

// ── Auto-Tagging ─────────────────────────────────────────────────────────────

/**
 * Run all auto-tag rules for a user against a specific lead.
 * Called automatically when a new lead is created.
 */
export async function runAutoTagRules(leadId: string, userId: string, quizId: string): Promise<string[]> {
  var appliedTags: string[] = [];

  try {
    var ctx = await buildLeadContext(leadId);
    if (!ctx) return appliedTags;

    // Fetch enabled rules for this user (global + quiz-specific)
    var { data: rules } = await supabase
      .from('auto_tag_rules')
      .select('id, tag_id, conditions, quiz_id, lead_tags(name)')
      .eq('user_id', userId)
      .eq('enabled', true);

    if (!rules || rules.length === 0) return appliedTags;

    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];

      // Skip if rule is quiz-specific and doesn't match
      if (rule.quiz_id && rule.quiz_id !== quizId) continue;

      var conditions = (rule.conditions || []) as SegmentRule[];
      if (evaluateAllRules(conditions, ctx)) {
        // Apply tag
        var { error: tagErr } = await supabase
          .from('lead_tag_assignments')
          .upsert({
            lead_id: leadId,
            tag_id: rule.tag_id,
            source: 'auto_rule',
          }, { onConflict: 'lead_id,tag_id' });

        if (!tagErr) {
          var tagName = (rule as any).lead_tags?.name || rule.tag_id;
          appliedTags.push(tagName);
        }
      }
    }

    if (appliedTags.length > 0) {
      log.info('[Segmentation] Auto-tagged lead', { leadId, tags: appliedTags });
    }
  } catch (err: any) {
    log.info('[Segmentation] Auto-tag error', { leadId, err: err?.message });
  }

  return appliedTags;
}

// ── Segment Evaluation ───────────────────────────────────────────────────────

/**
 * Check if a lead belongs to a specific segment.
 */
export async function leadMatchesSegment(leadId: string, segmentId: string): Promise<boolean> {
  var { data: segment } = await supabase
    .from('lead_segments')
    .select('rules')
    .eq('id', segmentId)
    .single();

  if (!segment) return false;

  var ctx = await buildLeadContext(leadId);
  if (!ctx) return false;

  return evaluateAllRules(segment.rules as SegmentRule[], ctx);
}

/**
 * Get all leads matching a segment's rules (for a specific user).
 * Returns lead IDs. Uses application-level filtering on the full rule set.
 */
export async function getSegmentLeads(
  segmentId: string,
  userId: string,
  limit: number = 100,
  offset: number = 0
): Promise<{ leads: any[]; total: number }> {
  var { data: segment } = await supabase
    .from('lead_segments')
    .select('rules')
    .eq('id', segmentId)
    .eq('user_id', userId)
    .single();

  if (!segment) return { leads: [], total: 0 };

  var rules = (segment.rules || []) as SegmentRule[];

  // Optimization: build basic SQL filters from simple rules
  var query = supabase
    .from('leads')
    .select('id, quiz_id, name, email, outcome_id, score, answers, language, created_at', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // Pre-filter with SQL where possible
  for (var r = 0; r < rules.length; r++) {
    var rule = rules[r];
    if (rule.field === 'quiz_id' && rule.op === 'eq') {
      query = query.eq('quiz_id', rule.value);
    }
    if (rule.field === 'outcome_id' && rule.op === 'eq') {
      query = query.eq('outcome_id', rule.value);
    }
    if (rule.field === 'score' && rule.op === 'gte') {
      query = query.gte('score', rule.value);
    }
    if (rule.field === 'score' && rule.op === 'lte') {
      query = query.lte('score', rule.value);
    }
    if (rule.field === 'language' && rule.op === 'eq') {
      query = query.eq('language', rule.value);
    }
  }

  var { data: allLeads, count } = await query;
  if (!allLeads) return { leads: [], total: 0 };

  // Apply complex rules (answer, tag) in application layer
  var hasComplexRules = rules.some(function(r) {
    return r.field === 'answer' || r.field === 'tag';
  });

  var filteredLeads = allLeads;
  if (hasComplexRules) {
    var filtered: any[] = [];
    for (var i = 0; i < allLeads.length; i++) {
      var lead = allLeads[i];
      // Build minimal context for complex rule evaluation
      var miniCtx: LeadContext = {
        lead_id: lead.id,
        quiz_id: lead.quiz_id,
        user_id: userId,
        outcome_id: lead.outcome_id,
        score: lead.score,
        answers: lead.answers || {},
        email: lead.email,
        name: lead.name,
        language: lead.language || 'en',
        tags: [],  // Will fetch if needed
        created_at: lead.created_at,
      };

      // Fetch tags only if tag rules exist
      var tagRules = rules.filter(function(r) { return r.field === 'tag'; });
      if (tagRules.length > 0) {
        var { data: ta } = await supabase
          .from('lead_tag_assignments')
          .select('lead_tags(name)')
          .eq('lead_id', lead.id);
        miniCtx.tags = (ta || []).map(function(t: any) { return t.lead_tags?.name || ''; }).filter(Boolean);
      }

      if (evaluateAllRules(rules, miniCtx)) {
        filtered.push(lead);
      }
    }
    filteredLeads = filtered;
  }

  var total = filteredLeads.length;
  var paged = filteredLeads.slice(offset, offset + limit);

  // Update cached count
  await supabase
    .from('lead_segments')
    .update({ cached_count: total, cached_at: new Date().toISOString() })
    .eq('id', segmentId);

  return { leads: paged, total: total };
}

// ── Tag Management ───────────────────────────────────────────────────────────

export async function createTag(userId: string, name: string, color?: string) {
  var { data, error } = await supabase
    .from('lead_tags')
    .insert({ user_id: userId, name: name, color: color || '#0D7377' })
    .select()
    .single();
  return { data, error };
}

export async function assignTag(leadId: string, tagId: string, source?: string) {
  var { data, error } = await supabase
    .from('lead_tag_assignments')
    .upsert({
      lead_id: leadId,
      tag_id: tagId,
      source: source || 'manual',
    }, { onConflict: 'lead_id,tag_id' })
    .select()
    .single();
  return { data, error };
}

export async function removeTag(leadId: string, tagId: string) {
  var { error } = await supabase
    .from('lead_tag_assignments')
    .delete()
    .eq('lead_id', leadId)
    .eq('tag_id', tagId);
  return { error };
}

export async function getLeadTags(leadId: string) {
  var { data } = await supabase
    .from('lead_tag_assignments')
    .select('tag_id, assigned_at, source, lead_tags(id, name, color)')
    .eq('lead_id', leadId);
  return (data || []).map(function(ta: any) {
    return {
      id: ta.lead_tags?.id,
      name: ta.lead_tags?.name,
      color: ta.lead_tags?.color,
      assigned_at: ta.assigned_at,
      source: ta.source,
    };
  });
}

// ── Segment Management ───────────────────────────────────────────────────────

export async function createSegment(userId: string, name: string, rules: SegmentRule[], description?: string) {
  var { data, error } = await supabase
    .from('lead_segments')
    .insert({ user_id: userId, name: name, rules: rules, description: description || null })
    .select()
    .single();
  return { data, error };
}

export async function updateSegment(segmentId: string, userId: string, updates: { name?: string; rules?: SegmentRule[]; description?: string }) {
  var updateObj: any = { updated_at: new Date().toISOString() };
  if (updates.name) updateObj.name = updates.name;
  if (updates.rules) updateObj.rules = updates.rules;
  if (updates.description !== undefined) updateObj.description = updates.description;

  var { data, error } = await supabase
    .from('lead_segments')
    .update(updateObj)
    .eq('id', segmentId)
    .eq('user_id', userId)
    .select()
    .single();
  return { data, error };
}

export async function deleteSegment(segmentId: string, userId: string) {
  var { error } = await supabase
    .from('lead_segments')
    .delete()
    .eq('id', segmentId)
    .eq('user_id', userId);
  return { error };
}

export async function listSegments(userId: string) {
  var { data, error } = await supabase
    .from('lead_segments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

// ── Export ────────────────────────────────────────────────────────────────────

export { evaluateAllRules, buildLeadContext };
export type { SegmentRule, LeadContext };
