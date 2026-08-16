/**
 * The PDF report.
 *
 * Same design language as the web report rather than a second design: the same
 * typefaces, the same restraint, the same rule that numbers are set in the mono
 * face so columns line up. What changes is what a printed document needs and a
 * web page does not, page furniture, an explicit contents ordering, and every
 * finding expanded rather than collapsed, because paper has no disclosure
 * triangles.
 *
 * Rendered with @react-pdf/renderer, which is a layout engine rather than a
 * headless browser. That matters on a serverless function: no Chromium binary,
 * no cold-start penalty measured in seconds, and no surprise when the platform
 * changes its bundled browser.
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type { AuditReport, Finding, Severity } from '../audit/types';
import type { Opportunity } from '../audit/opportunity';
import { GOAL_LABELS } from '../audit/opportunity';
import { nextSteps } from '../audit/verdict';
import {
  SERIF_REGULAR,
  SERIF_SEMIBOLD,
  SANS_REGULAR,
  SANS_SEMIBOLD,
  MONO_REGULAR,
} from './fonts';

/*
 * Three faces, each with one job, the same three the web report uses.
 *
 *   Serif (Newsreader)  the voice: the verdict, section titles, finding titles
 *   Sans  (Inter)       the interface: body copy, labels, the score
 *   Mono  (Plex Mono)   machine text: URLs, evidence values, aligned figures
 *
 * The previous pairing put every label in DM Mono in capitals with wide
 * letterspacing, which is why the report shouted at the reader eight times a
 * page, and DM Mono draws a slashed zero by default, which is how a score of
 * 100 reached a customer as 1OO with strokes through it.
 */
Font.register({
  family: 'Serif',
  fonts: [
    { src: SERIF_REGULAR, fontWeight: 400 },
    { src: SERIF_SEMIBOLD, fontWeight: 600 },
  ],
});
Font.register({
  family: 'Sans',
  fonts: [
    { src: SANS_REGULAR, fontWeight: 400 },
    { src: SANS_SEMIBOLD, fontWeight: 600 },
  ],
});
Font.register({ family: 'Mono', fonts: [{ src: MONO_REGULAR, fontWeight: 400 }] });
// Long URLs and hyphenated evidence strings otherwise overflow their column.
Font.registerHyphenationCallback((word) => [word]);

const INK_0 = '#14171a';
const INK_1 = '#3c4249';
const INK_2 = '#5b636b';
const INK_3 = '#818a93';
const INK_4 = '#9aa2aa';
const LINE_1 = '#d7dce0';
const LINE_2 = '#e6eaed';
const LINE_3 = '#eff2f4';
const ACCENT = '#0a875a';
const CRIT = '#b4271b';
const HIGH = '#9a6410';
const MED = '#1f5f9e';

const SEV_COLOUR: Record<Severity, string> = {
  critical: CRIT,
  high: HIGH,
  medium: MED,
  low: INK_3,
  info: INK_4,
};
const SEV_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Note',
};

/* Opportunities use a coarser three-step effort scale than Finding.effort —
   see opportunity.ts. Mirrors the label set the web report uses (Report.tsx)
   so the PDF and the page tell the same story in the same words. */
const OPP_EFFORT_LABEL: Record<Opportunity['effort'], string> = {
  low: 'Low effort',
  medium: 'Medium effort',
  high: 'Larger project',
};

/**
 * The cover page has a fixed height and an already-calibrated layout, so
 * user-supplied free text (businessDescription up to 500 chars,
 * targetAudience up to 300) is capped for display here rather than trusting
 * the stored length, the same caution the block-packing pages take with
 * finding text further down this file.
 */
function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}

function bandColour(score: number): string {
  if (score >= 80) return ACCENT;
  if (score >= 60) return HIGH;
  return CRIT;
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'Sans',
    fontSize: 9.5,
    color: INK_1,
    lineHeight: 1.55,
    paddingTop: 46,
    paddingBottom: 52,
    paddingHorizontal: 46,
  },
  runningHead: {
    position: 'absolute',
    top: 24,
    left: 46,
    right: 46,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: INK_4,
  },
  footer: {
    position: 'absolute',
    bottom: 26,
    left: 46,
    right: 46,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: INK_4,
  },

  coverEyebrow: { fontSize: 8.5, color: INK_4 },
  // An explicit line height: inheriting 1.55 at 30pt leaves the following line
  // sitting inside this one's box, which reads as overlapping text.
  coverHost: {
    fontFamily: 'Serif',
    fontSize: 30,
    lineHeight: 1.15,
    color: INK_0,
    marginTop: 10,
  },
  coverMeta: { fontSize: 8.5, lineHeight: 1.4, color: INK_3, marginTop: 6 },

  verdictRow: { flexDirection: 'row', marginTop: 30, gap: 28 },
  score: { fontFamily: 'Sans', fontWeight: 600, fontSize: 52, lineHeight: 1 },
  scoreOut: { fontSize: 8, color: INK_4, marginTop: 8 },
  headline: { fontFamily: 'Serif', fontSize: 16, color: INK_0, lineHeight: 1.32 },
  narrative: { marginTop: 9, color: INK_2, fontSize: 9.5 },

  // Baselines, not centres: a 12pt numeral and an 8pt word centred on each
  // other look misaligned, which is what the emailed report showed.
  tally: { flexDirection: 'row', gap: 18, marginTop: 16 },
  tallyItem: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  tallyN: { fontFamily: 'Sans', fontWeight: 600, fontSize: 12, color: INK_0 },
  tallyLabel: { fontSize: 8.5, color: INK_3 },

  rule: { borderTopWidth: 0.5, borderTopColor: LINE_1, marginTop: 20, paddingTop: 14 },
  sectionTitle: { fontFamily: 'Serif', fontSize: 14, lineHeight: 1.25, color: INK_0 },
  sectionNote: { fontSize: 8.5, color: INK_3, marginTop: 5, lineHeight: 1.5 },
  eyebrow: { fontFamily: 'Serif', fontSize: 10.5, color: INK_2 },

  factRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 14 },
  fact: { flexDirection: 'row', gap: 5, alignItems: 'baseline' },
  factK: { fontSize: 8.5, color: INK_4 },
  factV: { fontSize: 9, color: INK_1 },

  step: { flexDirection: 'row', gap: 12, marginTop: 12 },
  stepN: { fontFamily: 'Mono', fontSize: 11, color: INK_4, width: 22 },
  stepTitle: { fontFamily: 'Serif', fontSize: 11.5, lineHeight: 1.3, color: INK_0 },
  stepBody: { fontSize: 9, color: INK_2, marginTop: 3 },
  stepMeta: { fontSize: 8, color: INK_4, marginTop: 4 },

  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: LINE_3,
  },
  catName: { flex: 1, fontSize: 9.5, color: INK_1 },
  catIssues: { width: 62, fontSize: 8.5, color: INK_4, textAlign: 'right' },
  catTrack: { width: 120, height: 3, backgroundColor: LINE_2, marginHorizontal: 12 },
  // Figures that have to line up column on column are set in the mono face:
  // it is the one face here whose digits are guaranteed the same width.
  catScore: { width: 26, fontFamily: 'Mono', fontSize: 9, textAlign: 'right' },

  qRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: LINE_3,
  },
  qTag: { fontSize: 8, width: 44 },
  qText: { flex: 1, fontSize: 9.5, color: INK_1 },

  finding: { marginTop: 18, paddingTop: 14, borderTopWidth: 0.5, borderTopColor: LINE_3 },
  findingFirst: { marginTop: 14 },
  fHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  fSev: { fontSize: 8, width: 44 },
  fTitle: { flex: 1, fontFamily: 'Serif', fontSize: 11.5, lineHeight: 1.3, color: INK_0 },
  fScope: { fontFamily: 'Mono', fontSize: 7.5, color: INK_4 },
  lead: { marginTop: 7, fontSize: 9, color: INK_2 },
  part: { marginTop: 8 },
  partK: { fontSize: 8, color: INK_4, marginBottom: 1 },
  partV: { fontSize: 9, color: INK_2 },
  // A tinted panel rather than a bordered one. A bordered View that lands
  // exactly on a page boundary makes the layout engine emit a nonsense
  // translate value and the render dies, so the border is not worth the risk
  // for a block that reads just as well as a tint.
  evidence: {
    marginTop: 5,
    backgroundColor: '#f5f7f8',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  evRow: { flexDirection: 'row', gap: 10, paddingVertical: 2 },
  evK: { fontSize: 8, color: INK_3, width: 132 },
  evV: { flex: 1, fontFamily: 'Mono', fontSize: 7.5, color: INK_1 },
  // A Text with flex: 1 inside a column stacks to zero height, which drew all
  // four affected URLs on top of each other. This one has no flex.
  urlLine: { fontFamily: 'Mono', fontSize: 7.5, color: INK_2, marginTop: 2 },
  where: { marginTop: 6, borderLeftWidth: 0.5, borderLeftColor: LINE_1, paddingLeft: 8 },
  whereK: { fontSize: 8, color: INK_4 },

  pass: { flexDirection: 'row', gap: 8, paddingVertical: 2.5 },
  passMark: { fontFamily: 'Mono', fontSize: 8, color: ACCENT, width: 10 },

  method: { marginTop: 18, fontSize: 7.5, color: INK_4, lineHeight: 1.6 },
});

function Furniture({ report }: { report: AuditReport }) {
  return (
    <>
      <View style={s.runningHead} fixed>
        <Text>{report.host}</Text>
        <Text>Squarespell site audit</Text>
      </View>
      <View style={s.footer} fixed>
        <Text>squarespell.com</Text>
        <Text render={({ pageNumber }) => `${pageNumber}`} />
      </View>
    </>
  );
}

/** The path part of a URL, or the whole thing if it will not parse. */
function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === '/' ? u.host : u.pathname;
  } catch {
    return url;
  }
}

function FindingBlock({ f, first }: { f: Finding; first?: boolean }) {
  return (
    // Findings never split across a page. Each is a self-contained argument, and
    // splitting "why it matters" from "what to change" across a fold is exactly
    // where a reader loses the thread.
    //
    // The severity is not repeated on the row: it is stated once at the head of
    // the group, and again at the top of any page the group runs onto. Printing
    // it beside all twelve titles was one of the four things every row said at
    // once, and it made the titles harder to scan rather than easier.
    <View style={first ? s.findingFirst : s.finding} wrap={false}>
      <View style={s.fHead}>
        <Text style={s.fTitle}>{f.title}</Text>
        {f.applicableCount > 1 && (
          <Text style={s.fScope}>
            {f.affectedCount}/{f.applicableCount}
          </Text>
        )}
      </View>

      <Text style={s.lead}>{f.detail}</Text>

      {f.evidence.length > 0 && (
        <View style={s.evidence}>
          {f.evidence.slice(0, 5).map((e, i) => (
            <View style={s.evRow} key={i}>
              <Text style={s.evK}>{e.label}</Text>
              <Text style={s.evV}>{e.value}</Text>
            </View>
          ))}
        </View>
      )}

      {f.narrative && (
        <>
          {/* Why and what-changes are one argument, so they are one paragraph.
              Printed as two labelled parts they cost four lines of furniture to
              say what reads better as consecutive sentences. */}
          <View style={s.part}>
            <Text style={s.partK}>Why it matters</Text>
            <Text style={s.partV}>
              {f.narrative.why} {f.narrative.impact}
            </Text>
          </View>
          <View style={s.part}>
            <Text style={s.partK}>What to do</Text>
            <Text style={s.partV}>{f.narrative.action}</Text>
            {f.squarespacePath && (
              <View style={s.where}>
                <Text style={s.whereK}>In Squarespace</Text>
                <Text style={s.partV}>{f.squarespacePath}</Text>
              </View>
            )}
          </View>
        </>
      )}

      {f.affectedUrls.length > 0 && (
        <View style={s.part}>
          <Text style={s.partK}>Where ({f.affectedCount})</Text>
          {/* Paths, run together on as few lines as they need. The host is in
              the running head on every page; printing it eight times is eight
              lines spent on something the reader already knows. */}
          <Text style={s.urlLine}>{f.affectedUrls.map(pathOf).join('   ')}</Text>
        </View>
      )}

    </View>
  );
}

/**
 * Pagination is done here rather than by the layout engine.
 *
 * @react-pdf 4.6 miscalculates offsets when a tall stack of nested blocks
 * paginates automatically: past a certain content height it emits a translate
 * of about -2e22 and the render dies. It is reproducible on this document and
 * not on simpler ones, so rather than tune content until it happens to fit, we
 * decide the page breaks ourselves and mark every block as non-splitting. The
 * layout engine then never has to make a pagination decision on these pages.
 *
 * The estimate does not have to be exact, only conservative. Over-estimating
 * costs a little white space at the foot of a page; under-estimating would
 * clip a finding, so the constants lean high.
 */
/**
 * Usable content height per page, in points.
 *
 * A4 is 842pt and the margins take 98, so 744 is the theoretical ceiling. A
 * sweep across real reports overflows at 760 and holds at 740, so 720 is the
 * setting: comfortably inside the last value that worked, with room for the
 * cases the estimator rounds the wrong way.
 * Re-run scripts/calibrate-pdf.ts after changing any type size in this file.
 */
const PAGE_CONTENT_HEIGHT = Number(process.env.PDF_PAGE_BUDGET || 720);
const CHARS_PER_LINE = 100; // at 9pt Outfit across the text column
const LINE = 14.5; // 9pt at a line height of 1.55, rounded up
const PART = 20; // a part label plus the gap above it
const EV_ROW = 15.6; // 7.5pt line plus the row padding
const URL_ROW = 12.6;
/**
 * Calibration. The model above is built from font metrics, and reality is a few
 * per cent away from it because of hyphenation, orphan lines and rounding. This
 * factor was found by sweeping until no page overflowed on a corpus of real
 * reports, then keeping a little headroom. PDF_HEIGHT_SCALE exists so the sweep
 * can be repeated without editing code.
 */
const SCALE = Number(process.env.PDF_HEIGHT_SCALE || 1);

export function estimateHeight(f: Finding): number {
  const lines = (text: string, perLine = CHARS_PER_LINE) =>
    Math.max(1, Math.ceil((text || '').length / perLine));

  let h = 32; // block margin, the rule above it and its padding
  h += 17; // title row
  if ((f.title || '').length > 70) h += 17; // a title that wraps

  // The lead paragraph carries no label of its own.
  h += 7 + lines(f.detail) * LINE;

  if (f.evidence.length) {
    h += 13; // panel padding
    h += f.evidence.slice(0, 5).reduce(
      (a, e) => a + Math.max(1, Math.ceil(String(e.value || '').length / 58)) * EV_ROW,
      0
    );
  }

  if (f.narrative) {
    // Why and impact are one paragraph under one label.
    h += PART + lines(`${f.narrative.why} ${f.narrative.impact}`) * LINE;
    h += PART + lines(f.narrative.action) * LINE;
    if (f.squarespacePath) h += 14 + lines(f.squarespacePath, 90) * LINE;
  }

  if (f.affectedUrls.length) {
    // Paths on as few lines as they need, not one line each.
    const chars = f.affectedUrls.reduce((a, u) => a + u.replace(/^https?:\/\/[^/]+/, '').length + 3, 0);
    h += PART + Math.max(1, Math.ceil(chars / 88)) * URL_ROW;
  }

  return h * SCALE;
}

/**
 * A section of the report that is not a finding: the categories table, the
 * question list, the comparison, the speed panel, what is already working.
 *
 * `height` is an estimate in points, used only to decide page breaks. `node`
 * takes whether the block landed first on its page, because a block at the top
 * of a page must not draw the rule that separates it from the block above.
 */
export type Block =
  /** Prints whole or not at all: a comparison table, a speed panel. */
  | {
      kind: 'atom';
      key: string;
      height: number;
      node: (first: boolean) => React.ReactNode;
    }
  /**
   * A heading over a list of identical rows, which may break across pages.
   * Splitting these is what keeps a ten-question list from taking a page of
   * its own and leaving a third of the page before it empty.
   */
  | {
      kind: 'rows';
      key: string;
      chrome: number;
      rowHeight: number;
      count: number;
      node: (first: boolean, from: number, to: number, continued: boolean) => React.ReactNode;
    };

export interface Placed {
  block: Block;
  from: number;
  to: number;
  continued: boolean;
}

/*
 * Measured heights, in points, taken off rendered pages rather than derived
 * from the styles: a table row is its text plus its padding plus its rule, and
 * guessing that sum was wrong by nearly a third, which pushed blocks onto pages
 * of their own. Lean high. Over-estimating packs one block fewer; under-
 * estimating leaves a block stranded on an otherwise empty page.
 */
const BLOCK_CHROME = 60; // rule above, section title, gap before the list
const NOTE_LINE = 13; // one line of the small grey note under a title
const TABLE_ROW = 25; // a category, competitor or speed row
const QUESTION_ROW = 23;
const PASS_ROW = 20;

/**
 * A run of rows shorter than this is not worth starting at the foot of a page.
 * Four, not two: a heading, three rows and a "continued" heading overleaf is a
 * worse read than starting the list at the top of the next page.
 */
const MIN_ROWS_TO_START = 4;

/**
 * Fills each page before starting the next, breaking row lists where they run
 * out of room and carrying the heading onto the next page.
 */
export function packBlocks(blocks: Block[], budget: number): Placed[][] {
  const pages: Placed[][] = [];
  let current: Placed[] = [];
  let used = 0;

  const flush = () => {
    if (current.length) pages.push(current);
    current = [];
    used = 0;
  };

  for (const b of blocks) {
    if (b.kind === 'atom') {
      if (current.length && used + b.height > budget) flush();
      current.push({ block: b, from: 0, to: 0, continued: false });
      used += b.height;
      continue;
    }

    let from = 0;
    while (from < b.count) {
      let capacity = Math.floor((budget - used - b.chrome) / b.rowHeight);
      if (capacity < MIN_ROWS_TO_START && current.length) {
        flush();
        capacity = Math.floor((budget - b.chrome) / b.rowHeight);
      }
      // An empty page that still cannot hold three rows means the estimate is
      // wrong somewhere; place one row rather than loop for ever.
      const take = Math.max(1, Math.min(capacity, b.count - from));
      current.push({ block: b, from, to: from + take, continued: from > 0 });
      used += b.chrome + take * b.rowHeight;
      from += take;
      if (from < b.count) flush();
    }
  }

  flush();
  return pages;
}

export function paginate(findings: Finding[], firstPageBudget: number): Finding[][] {
  const pages: Finding[][] = [];
  let current: Finding[] = [];
  let used = 0;
  let budget = firstPageBudget;

  for (const f of findings) {
    const h = Math.min(estimateHeight(f), PAGE_CONTENT_HEIGHT);
    if (current.length && used + h > budget) {
      pages.push(current);
      current = [];
      used = 0;
      budget = PAGE_CONTENT_HEIGHT;
    }
    current.push(f);
    used += h;
  }
  if (current.length) pages.push(current);
  return pages;
}

const FULL_SEVERITIES: Severity[] = ['critical', 'high', 'medium'];
const DETAIL_CAP = 12;

/**
 * Which findings get a full block and which get a line in the appendix.
 *
 * Everything critical or high is set out in full however many there are;
 * mediums fill whatever room is left. A report that runs to twenty-five pages
 * of equal weight has stopped making a case and started making a list, and the
 * online version carries every finding in full anyway.
 *
 * Exported because the pagination calibration script has to make the same
 * selection to know how many pages a report should come to.
 */
export function splitFindings(findings: Finding[]): { detailed: Finding[]; listed: Finding[] } {
  const serious = findings.filter((f) => f.severity === 'critical' || f.severity === 'high');
  const medium = findings.filter((f) => f.severity === 'medium');
  const detailed = [...serious, ...medium].slice(0, Math.max(serious.length, DETAIL_CAP));
  const ids = new Set(detailed.map((f) => f.id));
  return { detailed, listed: findings.filter((f) => !ids.has(f.id)) };
}

export function ReportDocument({ report }: { report: AuditReport }) {
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of report.findings) counts[f.severity]++;
  // Opportunities, not raw findings: the same source the web report reads
  // (report.goalAwareOpportunities, falling back to report.opportunities),
  // so "Start here" tells the same story in both places. `nextSteps` still
  // exists and is still used by the deterministic AI-fallback narrative
  // (verdict.ts) — this only changes what the PDF's own cover page reads
  // from. A report saved before the Opportunity Engine shipped has neither
  // field, so this falls back to the old finding-based list rather than
  // rendering an empty "Start here".
  const oppReport = report.goalAwareOpportunities ?? report.opportunities;
  const topOpportunities = oppReport?.top.slice(0, 3) ?? [];
  const steps = topOpportunities.length > 0 ? [] : nextSteps(report);

  // Part 8 of the personalization brief: the PDF should reflect the same
  // context the web report does. Nothing here is fetched or inferred, only
  // read straight off `report.businessContext` and, for the two free-text
  // fields, capped to protect the cover page's fixed layout. Absent for any
  // audit that supplied none of this, so an old or context-free report's
  // cover page is unchanged.
  const bizGoal = report.businessContext?.goal;
  const bizGoalLabel = bizGoal && bizGoal !== 'not_sure' ? GOAL_LABELS[bizGoal] : null;
  const bizDescription = report.businessContext?.businessDescription
    ? truncate(report.businessContext.businessDescription, 220)
    : null;
  const bizAudience = report.businessContext?.targetAudience
    ? truncate(report.businessContext.targetAudience, 140)
    : null;
  const created = new Date(report.createdAt);
  const faq = report.faq;
  const perf = report.perf;
  const comparison = report.comparison;
  const growth = report.growthIntelligence;

  /*
   * Only the findings worth reading in full get a full block.
   *
   * Writing every finding out at length produced a twenty-five page document,
   * and a twenty-five page document is one nobody opens. Low-severity items and
   * notes are real, so they are still listed, but as a single line each in a
   * table at the back. The reader loses nothing they would have read anyway,
   * and the front of the report stops competing with its own appendix.
   */
  const { detailed, listed } = splitFindings(report.findings);

  // Findings in severity order, with the group heading attached to the first
  // finding of each group so a heading can never end up alone at a page foot.
  const ordered: Array<{ finding: Finding; heading?: string }> = [];
  for (const sev of FULL_SEVERITIES) {
    const items = detailed.filter((f) => f.severity === sev);
    items.forEach((f, i) => {
      ordered.push({
        finding: f,
        heading: i === 0 ? `${SEV_LABEL[sev]} · ${items.length}` : undefined,
      });
    });
  }
  const findingPages = paginate(
    ordered.map((o) => o.finding),
    PAGE_CONTENT_HEIGHT - 80 // the first findings page also carries the section heading
  );
  const headingFor = new Map(ordered.filter((o) => o.heading).map((o) => [o.finding.id, o.heading!]));

  /*
   * Everything between the cover and the findings is built as blocks and packed
   * onto as many pages as they need, rather than each section owning a page.
   *
   * The emailed report is what made the case: a site with no field data and no
   * competitor comparison produced a page carrying one eleven-row table and two
   * thirds of a page of nothing. Packing means a thin report is short and a
   * thick one grows, and neither prints a page of white space.
   */
  const analysis: Block[] = [];

  analysis.push({
    kind: 'rows',
    key: 'categories',
    chrome: BLOCK_CHROME,
    rowHeight: TABLE_ROW,
    count: report.score.categories.length,
    node: (first, from, to, continued) => (
      <View style={first ? undefined : s.rule}>
        <Text style={s.sectionTitle}>Categories{continued ? ', continued' : ''}</Text>
        <View style={{ marginTop: 8 }}>
          {report.score.categories.slice(from, to).map((c) => (
            <View style={s.catRow} key={c.id}>
              <Text style={s.catName}>{c.label}</Text>
              <Text style={s.catIssues}>
                {c.findingCount === 0 ? 'clear' : `${c.findingCount} issue${c.findingCount === 1 ? '' : 's'}`}
              </Text>
              <View style={s.catTrack}>
                <View style={{ width: `${c.score}%`, height: 3, backgroundColor: bandColour(c.score) }} />
              </View>
              <Text style={[s.catScore, { color: bandColour(c.score) }]}>{c.score}</Text>
            </View>
          ))}
        </View>
      </View>
    ),
  });

  if (growth && growth.recommendedActions.length > 0) {
    // Growth Action Plan (Part 20 of the growth-intelligence brief): the
    // same `recommendedActions` the web report's "Your growth opportunities"
    // section shows, capped tighter here on purpose. Five lines, not a
    // second copy of the full opportunity list a few pages later.
    const actions = growth.recommendedActions.slice(0, 5);
    analysis.push({
      kind: 'rows',
      key: 'growth',
      chrome: BLOCK_CHROME + NOTE_LINE,
      rowHeight: QUESTION_ROW,
      count: actions.length,
      node: (first, from, to, continued) => (
        <View style={first ? undefined : s.rule}>
          <Text style={s.sectionTitle}>Growth action plan{continued ? ', continued' : ''}</Text>
          <Text style={s.sectionNote}>{growth.growthSummary}</Text>
          <View style={{ marginTop: 8 }}>
            {actions.slice(from, to).map((a) => (
              <View style={s.qRow} key={a.title}>
                <Text style={s.qTag}>{a.type}</Text>
                <Text style={s.qText}>{a.title}</Text>
              </View>
            ))}
          </View>
        </View>
      ),
    });
  }

  if (report.strengths.length > 0) {
    // Moved forward from the back of the report, where it sat under the
    // lower-priority table and read as an afterthought. It belongs next to the
    // category scores: those two blocks are the same question answered twice.
    analysis.push({
      kind: 'rows',
      key: 'strengths',
      chrome: BLOCK_CHROME + NOTE_LINE,
      rowHeight: PASS_ROW,
      count: report.strengths.length,
      node: (first, from, to, continued) => (
        <View style={first ? undefined : s.rule}>
          <Text style={s.sectionTitle}>What is already working{continued ? ', continued' : ''}</Text>
          <Text style={s.sectionNote}>{report.strengths.length} checks passed cleanly.</Text>
          <View style={{ marginTop: 8 }}>
            {report.strengths.slice(from, to).map((str, i) => (
              <View style={s.pass} key={i}>
                <Text style={s.passMark}>+</Text>
                <Text style={{ fontSize: 9.5, color: INK_2 }}>{str}</Text>
              </View>
            ))}
          </View>
        </View>
      ),
    });
  }

  if (faq?.ran && faq.opportunities.length > 0) {
    analysis.push({
      kind: 'rows',
      key: 'questions',
      chrome: BLOCK_CHROME + NOTE_LINE * 2,
      rowHeight: QUESTION_ROW,
      count: faq.opportunities.length,
      node: (first, from, to, continued) => (
        <View style={first ? undefined : s.rule}>
          <Text style={s.sectionTitle}>
            Questions your site does not answer{continued ? ', continued' : ''}
          </Text>
          <Text style={s.sectionNote}>
            Built from what your own pages say you do, then checked against every page we read.
            &quot;Asked&quot; means a page covers the subject but never gives the answer.
            {faq.gaps.length ? ` ${faq.answered.length} of ${faq.gaps.length} answered.` : ''}
          </Text>
          <View style={{ marginTop: 8 }}>
            {faq.opportunities.slice(from, to).map((g) => (
              <View style={s.qRow} key={g.question}>
                <Text style={[s.qTag, { color: g.status === 'partial' ? HIGH : INK_4 }]}>
                  {g.status === 'partial' ? 'asked' : 'missing'}
                </Text>
                <Text style={s.qText}>{g.question}</Text>
              </View>
            ))}
          </View>
        </View>
      ),
    });
  }

  if (comparison && comparison.competitors.some((c) => c.ok)) {
    // Competitive snapshot (Part 23 of the competitor-intelligence brief):
    // three short, evidence-only lines from the same deterministic engine
    // Compare.tsx reads, not a second competitor report. Absent entirely
    // when there was not enough crawled data on both sides to build it
    // (`intelligence` is undefined), which the primary comparison table
    // below still renders regardless.
    const intel = comparison.intelligence;
    const snapshotLines: Array<{ label: string; detail: string }> = [];
    if (intel?.all[0]) snapshotLines.push({ label: 'Strongest difference', detail: intel.all[0].detail });
    if (intel?.gaps[0]) snapshotLines.push({ label: 'Biggest gap', detail: intel.gaps[0].detail });
    if (intel?.opportunities[0]) snapshotLines.push({ label: 'Biggest opportunity', detail: intel.opportunities[0].detail });

    analysis.push({
      kind: 'atom',
      key: 'comparison',
      height:
        BLOCK_CHROME +
        NOTE_LINE * 2 +
        (comparison.competitors.length + 1) * TABLE_ROW +
        NOTE_LINE * 2 +
        snapshotLines.length * NOTE_LINE * 2,
      node: (first) => (
        <View style={first ? undefined : s.rule} wrap={false}>
          <Text style={s.sectionTitle}>How you compare</Text>
          <Text style={s.sectionNote}>
            The same checks run against the sites you named, scored on the categories that mean the
            same thing on any platform.
          </Text>
          <View style={{ marginTop: 8 }}>
            <View style={s.catRow}>
              <Text style={[s.catName, { color: INK_0 }]}>{comparison.you.host}</Text>
              <Text style={s.catIssues}>you</Text>
              <Text style={[s.catScore, { width: 40, color: bandColour(comparison.you.overall) }]}>
                {comparison.you.overall}
              </Text>
            </View>
            {comparison.competitors.map((c) => (
              <View style={s.catRow} key={c.url}>
                <Text style={s.catName}>{c.host}</Text>
                <Text style={[s.catIssues, { width: 120 }]}>{c.ok ? c.platform : 'not read'}</Text>
                <Text style={[s.catScore, { width: 40, color: c.ok ? bandColour(c.overall) : INK_4 }]}>
                  {c.ok ? String(c.overall) : '-'}
                </Text>
              </View>
            ))}
          </View>
          <Text style={[s.sectionNote, { marginTop: 8 }]}>{comparison.verdict}</Text>
          {snapshotLines.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={s.factK}>Competitive snapshot</Text>
              {snapshotLines.map((l) => (
                <Text key={l.label} style={[s.sectionNote, { marginTop: 4 }]}>
                  <Text style={{ color: INK_0 }}>{l.label}: </Text>
                  {l.detail}
                </Text>
              ))}
            </View>
          )}
        </View>
      ),
    });
  }

  if (perf && perf.field.length > 0) {
    analysis.push({
      kind: 'atom',
      key: 'speed',
      height:
        BLOCK_CHROME +
        NOTE_LINE * 2 +
        perf.field.length * TABLE_ROW +
        (perf.labScore !== null ? NOTE_LINE * 2 : 0),
      node: (first) => (
        <View style={first ? undefined : s.rule} wrap={false}>
          <Text style={s.sectionTitle}>Real speed, measured by Google</Text>
          <Text style={s.sectionNote}>
            Core Web Vitals from real Chrome visitors over the last 28 days.{' '}
            {perf.fieldVerdict === 'pass' ? 'Currently passing.' : 'Currently not passing.'}
          </Text>
          <View style={{ marginTop: 8 }}>
            {perf.field.map((m) => (
              <View style={s.catRow} key={m.metric}>
                <Text style={[s.catName, { fontFamily: 'Mono', fontSize: 8.5 }]}>
                  {m.metric}
                  {m.core ? '' : '  supporting'}
                </Text>
                <Text
                  style={[
                    s.catScore,
                    {
                      width: 54,
                      color: m.category === 'good' ? ACCENT : m.category === 'poor' ? CRIT : HIGH,
                    },
                  ]}
                >
                  {m.display}
                </Text>
                <View style={s.catTrack}>
                  <View style={{ flexDirection: 'row', height: 3 }}>
                    <View style={{ width: `${m.distribution[0]}%`, backgroundColor: '#bfe2d2' }} />
                    <View style={{ width: `${m.distribution[1]}%`, backgroundColor: '#f0d9ac' }} />
                    <View style={{ width: `${m.distribution[2]}%`, backgroundColor: '#f3cec6' }} />
                  </View>
                </View>
                <Text style={[s.catIssues, { width: 56 }]}>{m.distribution[0]}% good</Text>
              </View>
            ))}
          </View>
          {perf.labScore !== null && (
            <Text style={[s.sectionNote, { marginTop: 8 }]}>
              Lab score {perf.labScore} from one simulated load on a throttled phone. Useful for
              diagnosis, and not what Google ranks on.
            </Text>
          )}
        </View>
      ),
    });
  }

  const analysisPages = packBlocks(analysis, PAGE_CONTENT_HEIGHT);

  return (
    <Document
      title={`Squarespace audit, ${report.host}`}
      author="Squarespell"
      subject={`Website audit for ${report.host}`}
      creator="Squarespell Site Auditor"
      producer="Squarespell Site Auditor"
    >
      <Page size="A4" style={s.page}>
        <Furniture report={report} />

        <Text style={s.coverEyebrow}>Squarespace website audit</Text>
        <Text style={s.coverHost}>{report.host}</Text>
        <Text style={s.coverMeta}>
          {report.siteName} · {created.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          {' at '}
          {created.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </Text>

        <View style={s.verdictRow}>
          <View style={{ width: 96 }}>
            <Text style={[s.score, { color: bandColour(report.score.overall) }]}>
              {report.score.overall}
            </Text>
            <Text style={s.scoreOut}>out of 100</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headline}>{report.summary?.headline}</Text>
            <Text style={s.narrative}>{report.summary?.narrative}</Text>
            <View style={s.tally}>
              {(['critical', 'high', 'medium', 'low'] as Severity[])
                .filter((sev) => counts[sev] > 0)
                .map((sev) => (
                  <View style={s.tallyItem} key={sev}>
                    <Text style={[s.tallyN, { color: SEV_COLOUR[sev] }]}>{counts[sev]}</Text>
                    <Text style={s.tallyLabel}>{SEV_LABEL[sev]}</Text>
                  </View>
                ))}
            </View>
          </View>
        </View>

        <View style={s.factRow}>
          <View style={s.fact}>
            <Text style={s.factK}>Platform</Text>
            <Text style={s.factV}>Squarespace {report.squarespace.version}</Text>
          </View>
          {report.squarespace.editor.ratio !== null && (
            <View style={s.fact}>
              <Text style={s.factK}>Editor</Text>
              <Text style={s.factV}>
                {report.squarespace.editor.ratio >= 0.99
                  ? 'Fluid Engine'
                  : report.squarespace.editor.ratio === 0
                    ? 'Classic'
                    : `${Math.round(report.squarespace.editor.ratio * 100)}% Fluid Engine`}
              </Text>
            </View>
          )}
          <View style={s.fact}>
            <Text style={s.factK}>Pages read</Text>
            <Text style={s.factV}>
              {report.coverage.pagesCrawled} of {report.coverage.pagesDiscovered}
            </Text>
          </View>
          <View style={s.fact}>
            <Text style={s.factK}>Checks applied</Text>
            <Text style={s.factV}>{report.coverage.checksApplicable}</Text>
          </View>
          {bizGoalLabel && (
            <View style={s.fact}>
              <Text style={s.factK}>Goal</Text>
              <Text style={s.factV}>{bizGoalLabel}</Text>
            </View>
          )}
        </View>

        {(bizDescription || bizAudience) && (
          <View style={{ marginTop: 10 }}>
            {bizDescription && <Text style={s.sectionNote}>&ldquo;{bizDescription}&rdquo;</Text>}
            {bizAudience && (
              <Text style={[s.sectionNote, { marginTop: bizDescription ? 2 : 5 }]}>
                Reaching: {bizAudience}
              </Text>
            )}
          </View>
        )}

        {topOpportunities.length > 0 && (
          <View style={s.rule}>
            <Text style={s.sectionTitle}>Biggest opportunities</Text>
            <Text style={s.sectionNote}>
              {topOpportunities.length === 1
                ? 'The single highest-value move.'
                : `${topOpportunities.length} highest-value moves, in order.`}
            </Text>
            {topOpportunities.map((o, i) => (
              <View style={s.step} key={o.id}>
                <Text style={s.stepN}>{String(i + 1).padStart(2, '0')}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.stepTitle}>{o.title}</Text>
                  <Text style={s.stepBody}>{o.recommendedAction}</Text>
                  <Text style={s.stepMeta}>
                    {SEV_LABEL[o.priority]} · {OPP_EFFORT_LABEL[o.effort]}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
        {topOpportunities.length === 0 && steps.length > 0 && (
          <View style={s.rule}>
            <Text style={s.sectionTitle}>Start here</Text>
            <Text style={s.sectionNote}>
              {steps.length === 1
                ? 'The single highest-value move.'
                : `${steps.length} highest-value moves, in order.`}
            </Text>
            {steps.map((f, i) => (
              <View style={s.step} key={f.id}>
                <Text style={s.stepN}>{String(i + 1).padStart(2, '0')}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.stepTitle}>{f.title}</Text>
                  <Text style={s.stepBody}>{f.narrative?.action}</Text>
                  <Text style={s.stepMeta}>
                    {SEV_LABEL[f.severity]} ·{' '}
                    {f.effort === 'quick'
                      ? 'about 15 minutes'
                      : f.effort === 'medium'
                        ? 'an hour or two'
                        : 'a planned piece of work'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

      </Page>

      {/* ---- analysis: whatever there is, packed to fill pages ---- */}
      {analysisPages.map((page, i) => (
        <Page size="A4" style={s.page} key={`analysis-${i}`}>
          <Furniture report={report} />
          {page.map((p, j) => (
            <React.Fragment key={`${p.block.key}-${p.from}`}>
              {p.block.kind === 'atom'
                ? p.block.node(j === 0)
                : p.block.node(j === 0, p.from, p.to, p.continued)}
            </React.Fragment>
          ))}
        </Page>
      ))}

      {/* ---------------- findings ---------------- */}
      {findingPages.map((chunk, pageIndex) => (
        <Page size="A4" style={s.page} key={pageIndex}>
          <Furniture report={report} />
          {pageIndex === 0 && (
            <>
              <Text style={s.sectionTitle}>Findings</Text>
              <Text style={s.sectionNote}>
                {detailed.length} of {report.findings.length} set out in full, ordered by severity.
                {listed.length > 0
                  ? ` The remaining ${listed.length} are lower priority and are listed at the back.`
                  : ''}{' '}
                Every one is measured from your own pages.
              </Text>
            </>
          )}
          {/* A group that runs onto another page says so at the top of it,
              which is what the severity label on every row was standing in for. */}
          {!headingFor.has(chunk[0].id) && (
            <Text style={[s.eyebrow, { marginTop: pageIndex === 0 ? 16 : 0, color: INK_3 }]}>
              {SEV_LABEL[chunk[0].severity]}, continued
            </Text>
          )}
          {chunk.map((f, i) => (
            <React.Fragment key={f.id}>
              {headingFor.has(f.id) && (
                <Text
                  style={[
                    s.eyebrow,
                    { marginTop: i === 0 && pageIndex > 0 ? 0 : 18, color: SEV_COLOUR[f.severity] },
                  ]}
                >
                  {headingFor.get(f.id)}
                </Text>
              )}
              <FindingBlock f={f} first={i === 0 || headingFor.has(f.id)} />
            </React.Fragment>
          ))}
        </Page>
      ))}

      {/* ------------ lower priority and method ------------ */}
      <Page size="A4" style={s.page}>
        <Furniture report={report} />

        {listed.length > 0 && (
          <View>
            <Text style={s.sectionTitle}>Lower priority</Text>
            <Text style={s.sectionNote}>
              Worth knowing, not worth reordering your week for. Each of these is set out in full,
              with its evidence and its fix, in the online version of this report.
            </Text>
            <View style={{ marginTop: 8 }}>
              {listed.map((f) => (
                <View style={s.catRow} key={f.id}>
                  <Text style={[s.fSev, { color: SEV_COLOUR[f.severity] }]}>
                    {SEV_LABEL[f.severity]}
                  </Text>
                  <Text style={s.catName}>{f.title}</Text>
                  {f.applicableCount > 1 && (
                    <Text style={s.fScope}>
                      {f.affectedCount}/{f.applicableCount}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={s.method}>
          Method. We crawled {report.coverage.pagesCrawled} of the {report.coverage.pagesDiscovered}{' '}
          pages we discovered, applied {report.coverage.checksApplicable} of{' '}
          {report.coverage.checksRun} checks, measured {report.coverage.imagesProbed} images and read{' '}
          {report.coverage.sitemapUrls} sitemap entries, in{' '}
          {(report.coverage.durationMs / 1000).toFixed(1)} seconds. Checks that did not apply to this
          site were excluded from the score rather than counted as passes. Checks marked as platform
          controlled are set by Squarespace and are reported but not scored. We do not run
          JavaScript, which is also true of most search and AI crawlers.
          {report.coverage.aiUsed
            ? ' The written explanations were generated from these measured findings only. Every number here comes from the crawl, not from a model.'
            : ' The written explanations are generated directly from the measured findings.'}
        </Text>
      </Page>
    </Document>
  );
}
