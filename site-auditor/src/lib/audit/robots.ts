/** robots.txt fetching, parsing and per-user-agent evaluation. */

import { safeFetch } from './safeFetch';
import type { RobotsInfo } from './types';

export async function fetchRobots(origin: string): Promise<RobotsInfo> {
  const empty: RobotsInfo = {
    found: false,
    status: 0,
    raw: '',
    sitemaps: [],
    groups: [],
    isSquarespaceDefault: false,
  };
  try {
    const res = await safeFetch(new URL('/robots.txt', origin).toString(), {
      timeoutMs: 8000,
      maxBytes: 512_000,
    });
    if (res.status !== 200 || !/text\/plain|text\//.test(res.contentType || 'text/plain')) {
      return { ...empty, status: res.status, found: false };
    }
    return { ...parseRobots(res.body), status: res.status, found: true };
  } catch {
    return empty;
  }
}

export function parseRobots(raw: string): RobotsInfo {
  const lines = raw.split(/\r?\n/);
  const groups: RobotsInfo['groups'] = [];
  const sitemaps: string[] = [];
  let current: RobotsInfo['groups'][number] | null = null;
  let expectingAgents = false;

  for (const line of lines) {
    const clean = line.replace(/#.*$/, '').trim();
    if (!clean) continue;
    const idx = clean.indexOf(':');
    if (idx === -1) continue;
    const field = clean.slice(0, idx).trim().toLowerCase();
    const value = clean.slice(idx + 1).trim();

    if (field === 'user-agent') {
      if (!expectingAgents || !current) {
        current = { agents: [], allow: [], disallow: [] };
        groups.push(current);
        expectingAgents = true;
      }
      current.agents.push(value.toLowerCase());
    } else if (field === 'sitemap') {
      if (value) sitemaps.push(value);
    } else if (field === 'allow' || field === 'disallow') {
      expectingAgents = false;
      if (!current) {
        current = { agents: ['*'], allow: [], disallow: [] };
        groups.push(current);
      }
      if (field === 'allow') current.allow.push(value);
      else current.disallow.push(value);
    }
  }

  const isSquarespaceDefault =
    /^\s*#\s*Squarespace Robots Txt/i.test(raw) ||
    (/Disallow:\s*\/config/.test(raw) && /Disallow:\s*\/\*\?format=json/.test(raw));

  return { found: true, status: 200, raw, sitemaps, groups, isSquarespaceDefault };
}

function matchPattern(pattern: string, path: string): number {
  // Returns match length, or -1. Supports `*` wildcard and `$` anchor.
  if (pattern === '') return -1;
  const anchored = pattern.endsWith('$');
  const p = anchored ? pattern.slice(0, -1) : pattern;
  const parts = p.split('*');
  let pos = 0;
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    if (seg === '') continue;
    const found = i === 0 ? (path.startsWith(seg) ? 0 : -1) : path.indexOf(seg, pos);
    if (found === -1) return -1;
    pos = found + seg.length;
  }
  if (anchored && pos !== path.length) return -1;
  return p.replace(/\*/g, '').length;
}

/** Google's precedence: most specific matching rule wins; Allow beats Disallow on ties. */
export function isAllowed(robots: RobotsInfo, userAgent: string, path: string): boolean {
  if (!robots.found || robots.groups.length === 0) return true;
  const ua = userAgent.toLowerCase();

  let best: RobotsInfo['groups'][number] | null = null;
  let bestLen = -1;
  for (const g of robots.groups) {
    for (const a of g.agents) {
      if (a === '*') {
        if (bestLen < 0) {
          best = g;
          bestLen = 0;
        }
      } else if (ua.includes(a) && a.length > bestLen) {
        best = g;
        bestLen = a.length;
      }
    }
  }
  if (!best) return true;

  let allowLen = -1;
  let disallowLen = -1;
  for (const r of best.allow) allowLen = Math.max(allowLen, matchPattern(r, path));
  for (const r of best.disallow) disallowLen = Math.max(disallowLen, matchPattern(r, path));

  if (disallowLen === -1) return true;
  if (allowLen >= disallowLen) return true;
  return false;
}

/** True when a group explicitly names this agent (rather than falling through to `*`). */
export function hasExplicitGroup(robots: RobotsInfo, userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return robots.groups.some((g) => g.agents.some((a) => a !== '*' && ua.includes(a)));
}
