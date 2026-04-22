/**
 * embedPerformance.ts — Embed performance tracking and optimization.
 *
 * Tracks: load time, TTFB, FCP per quiz embed.
 * Provides: performance insights, slow quiz detection.
 */

import { log } from '../lib/logger';
import { supabase } from '../db/supabaseClient';

// ── Performance Logging ──────────────────────────────────────────────────────

export async function logEmbedPerformance(params: {
  quiz_id: string;
  session_id?: string;
  load_time_ms: number;
  ttfb_ms?: number;
  fcp_ms?: number;
  device_type?: string;
  connection_type?: string;
}): Promise<void> {
  try {
    await supabase.from('embed_performance_logs').insert({
      quiz_id: params.quiz_id,
      session_id: params.session_id || null,
      load_time_ms: params.load_time_ms,
      ttfb_ms: params.ttfb_ms || null,
      fcp_ms: params.fcp_ms || null,
      device_type: params.device_type || null,
      connection_type: params.connection_type || null,
    });
  } catch (err: any) {
    log.info('[EmbedPerf] Log failed', { err: err?.message });
  }
}

// ── Performance Analytics ────────────────────────────────────────────────────

export async function getEmbedPerformanceStats(quizId: string, days?: number): Promise<{
  avg_load_time_ms: number;
  median_load_time_ms: number;
  p95_load_time_ms: number;
  avg_fcp_ms: number;
  total_loads: number;
  device_breakdown: Record<string, { count: number; avg_load_ms: number }>;
  connection_breakdown: Record<string, { count: number; avg_load_ms: number }>;
}> {
  var query = supabase
    .from('embed_performance_logs')
    .select('load_time_ms, fcp_ms, device_type, connection_type')
    .eq('quiz_id', quizId);

  if (days) {
    var since = new Date();
    since.setDate(since.getDate() - days);
    query = query.gte('created_at', since.toISOString());
  }

  var { data } = await query;
  if (!data || data.length === 0) {
    return {
      avg_load_time_ms: 0, median_load_time_ms: 0, p95_load_time_ms: 0,
      avg_fcp_ms: 0, total_loads: 0,
      device_breakdown: {}, connection_breakdown: {},
    };
  }

  var loadTimes = data.map(function(d) { return d.load_time_ms; }).sort(function(a, b) { return a - b; });
  var fcpTimes = data.filter(function(d) { return d.fcp_ms; }).map(function(d) { return d.fcp_ms!; });

  var sum = loadTimes.reduce(function(s, v) { return s + v; }, 0);
  var avg = Math.round(sum / loadTimes.length);
  var median = loadTimes[Math.floor(loadTimes.length / 2)];
  var p95 = loadTimes[Math.floor(loadTimes.length * 0.95)];
  var avgFcp = fcpTimes.length > 0
    ? Math.round(fcpTimes.reduce(function(s, v) { return s + v; }, 0) / fcpTimes.length)
    : 0;

  // Device breakdown
  var deviceMap: Record<string, { count: number; totalMs: number }> = {};
  var connMap: Record<string, { count: number; totalMs: number }> = {};

  for (var i = 0; i < data.length; i++) {
    var d = data[i];
    var dev = d.device_type || 'unknown';
    var conn = d.connection_type || 'unknown';

    if (!deviceMap[dev]) deviceMap[dev] = { count: 0, totalMs: 0 };
    deviceMap[dev].count++;
    deviceMap[dev].totalMs += d.load_time_ms;

    if (!connMap[conn]) connMap[conn] = { count: 0, totalMs: 0 };
    connMap[conn].count++;
    connMap[conn].totalMs += d.load_time_ms;
  }

  var deviceBreakdown: Record<string, { count: number; avg_load_ms: number }> = {};
  Object.keys(deviceMap).forEach(function(k) {
    deviceBreakdown[k] = {
      count: deviceMap[k].count,
      avg_load_ms: Math.round(deviceMap[k].totalMs / deviceMap[k].count),
    };
  });

  var connBreakdown: Record<string, { count: number; avg_load_ms: number }> = {};
  Object.keys(connMap).forEach(function(k) {
    connBreakdown[k] = {
      count: connMap[k].count,
      avg_load_ms: Math.round(connMap[k].totalMs / connMap[k].count),
    };
  });

  return {
    avg_load_time_ms: avg,
    median_load_time_ms: median,
    p95_load_time_ms: p95,
    avg_fcp_ms: avgFcp,
    total_loads: data.length,
    device_breakdown: deviceBreakdown,
    connection_breakdown: connBreakdown,
  };
}

/**
 * Generate lightweight embed loader script.
 * This replaces the full quiz bundle with a tiny async loader.
 */
export function generateLightweightLoader(quizSlug: string, embedMode: string): string {
  return '(function(){' +
    'var d=document,s=d.createElement("script");' +
    's.async=true;s.defer=true;' +
    's.src="https://cdn.squarespell.com/embed/v2/loader.min.js";' +
    's.dataset.quiz="' + quizSlug + '";' +
    's.dataset.mode="' + (embedMode || 'inline') + '";' +
    'd.head.appendChild(s);' +
    '})();';
}
