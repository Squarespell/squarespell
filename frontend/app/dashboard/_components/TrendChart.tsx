'use client';

/**
 * TrendChart - multi-series line chart for the 2026 redesign (Analytics, per-quiz analytics).
 *
 * Plain SVG, no chart library. The first series gets a soft cobalt area fill. When every value is zero it keeps the
 * axis and grid and shows an honest "No activity in this period" message instead of an invented curve.
 */

import { DASHBOARD_COLORS as C } from './dashboardColors';

export type TrendSeries = { key: string; label: string; color: string; values: number[] };

function niceStep(maxVal: number): number {
  var raw = Math.max(maxVal, 4) / 4;
  var mag = Math.pow(10, Math.floor(Math.log10(raw)));
  var steps = [1, 2, 5, 10].map(function(m) { return m * mag; });
  for (var i = 0; i < steps.length; i++) if (steps[i] >= raw) return steps[i];
  return 10 * mag;
}

export function TrendLegend({ series }: { series: TrendSeries[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', fontSize: 14, color: C.GRAY_600 }}>
      {series.map(function(s) {
        return (
          <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, border: s.color === C.ACID ? '1px solid #C9D93F' : 'none' }} />
            {s.label}
          </span>
        );
      })}
    </div>
  );
}

export function TrendChart({
  labels,
  series,
  height = 260,
  emptyTitle = 'No activity in this period',
  emptyBody = 'Your quizzes haven’t received any views in this period. Check back later or share a quiz.',
}: {
  labels: string[];
  series: TrendSeries[];
  height?: number;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  var W = 900;
  var H = height;
  var padL = 34;
  var padR = 10;
  var padT = 14;
  var padB = 30;
  var maxVal = 0;
  series.forEach(function(s) { s.values.forEach(function(v) { if (v > maxVal) maxVal = v; }); });
  var empty = maxVal === 0;
  var step = niceStep(maxVal);
  var top = step * 4;
  var n = labels.length;
  var usableW = W - padL - padR;
  var stepX = n > 1 ? usableW / (n - 1) : 0;
  function y(v: number) { return padT + (1 - v / top) * (H - padT - padB); }
  function x(i: number) { return padL + i * stepX; }
  var labelEvery = Math.max(1, Math.ceil(n / 9));
  var baseY = y(0);

  function lineD(values: number[]) {
    return values.map(function(v, i) { return (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' ');
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" style={{ display: 'block' }} role="img" aria-label={series.map(function(s) { return s.label; }).join(', ') + ' over time'}>
        <defs>
          <linearGradient id="sqTrendGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={C.ACCENT} stopOpacity="0.14" />
            <stop offset="100%" stopColor={C.ACCENT} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map(function(i) {
          var v = step * i;
          return (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={C.GRAY_100} strokeDasharray={i === 0 ? undefined : '3 4'} />
              <text x={padL - 10} y={y(v) + 4} fontSize="11" fill={C.GRAY_500} textAnchor="end" fontFamily="Inter">{v}</text>
            </g>
          );
        })}
        {labels.map(function(l, i) {
          var last = n - 1;
          if (i !== last && (i % labelEvery !== 0 || last - i < labelEvery * 0.6)) return null;
          return (
            <g key={i}>
              <line x1={x(i)} x2={x(i)} y1={padT} y2={baseY} stroke={C.GRAY_100} strokeDasharray="3 4" />
              <text x={x(i)} y={H - 8} fontSize="11" fill={C.GRAY_500} textAnchor="middle" fontFamily="Inter">{l}</text>
            </g>
          );
        })}
        {!empty && series.length > 0 && n > 0 && (
          <path d={lineD(series[0].values) + ' L' + x(n - 1) + ' ' + baseY + ' L' + x(0) + ' ' + baseY + ' Z'} fill="url(#sqTrendGrad)" />
        )}
        {!empty && series.slice().reverse().map(function(s) {
          return <path key={s.key} d={lineD(s.values)} fill="none" stroke={s.color === C.ACID ? '#8FA2FF' : s.color} strokeWidth={s === series[0] ? 2.25 : 2} strokeLinejoin="round" />;
        })}
      </svg>
      {empty && (
        <div style={{ position: 'absolute', left: padL, right: 0, top: 0, bottom: padB, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none' }}>
          <span style={{ width: 48, height: 48, borderRadius: '50%', background: C.GRAY_50, border: '1px solid ' + C.BORDER, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: C.INK, marginBottom: 12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 20v-6M12 20V8M18 20v-10" /></svg>
          </span>
          <div style={{ fontSize: 17, fontWeight: 600, color: C.INK, marginBottom: 4 }}>{emptyTitle}</div>
          <div style={{ fontSize: 14, color: C.GRAY_500, maxWidth: 320, lineHeight: 1.45 }}>{emptyBody}</div>
        </div>
      )}
    </div>
  );
}

/** Continuous day buckets (YYYY-MM-DD) from `from` to today, for zero-filling sparse API series. */
export function dayRange(from: Date, maxDays = 366): string[] {
  var out: string[] = [];
  var d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  var end = new Date();
  var endKey = end.toISOString().slice(0, 10);
  for (var i = 0; i < maxDays; i++) {
    var key = d.toISOString().slice(0, 10);
    out.push(key);
    if (key >= endKey) break;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function shortDay(key: string): string {
  var parts = key.split('-');
  return MONTHS[parseInt(parts[1], 10) - 1] + ' ' + parseInt(parts[2], 10);
}
