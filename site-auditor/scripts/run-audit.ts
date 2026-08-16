/** CLI harness for exercising the engine directly. `npm run engine -- <url>` */

import { runAudit, AuditError, DEFAULT_CONFIG } from '../src/lib/audit/pipeline';

const url = process.argv[2];
const json = process.argv.includes('--json');
if (!url) {
  console.error('usage: npm run engine -- <url> [--json]');
  process.exit(1);
}

(async () => {
  try {
    const report = await runAudit(
      url,
      (e) => {
        if (json) return;
        if (e.type === 'stage') console.log(`  [${String(e.pct).padStart(3)}%] ${e.label}`);
        if (e.type === 'detail') console.log(`         · ${e.message}`);
      },
      { ...DEFAULT_CONFIG, totalBudgetMs: 120_000 }
    );

    if (json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    console.log('\n' + '='.repeat(72));
    console.log(`${report.siteName} — ${report.host}`);
    console.log(
      `Squarespace ${report.squarespace.version} · detection ${report.squarespace.confidence}% · ${report.squarespace.siteStatus}`
    );
    if (report.squarespace.templateFamily) console.log(`Template: ${report.squarespace.templateFamily}`);
    console.log(
      `Editor: ${report.squarespace.editor.fluid} fluid / ${report.squarespace.editor.classic} classic`
    );
    console.log(
      `Features: ${Object.entries(report.squarespace.features)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(', ') || 'none detected'}`
    );
    console.log('='.repeat(72));
    console.log(`SCORE ${report.score.overall}/100 (${report.score.grade})`);
    if (report.score.gated) console.log(`  ${report.score.gateReason}`);
    for (const c of report.score.categories) {
      const bar = '█'.repeat(Math.round(c.score / 5)).padEnd(20, '·');
      console.log(
        `  ${c.label.padEnd(22)} ${bar} ${String(c.score).padStart(3)}  (${c.applicableChecks} checks)`
      );
    }
    console.log('-'.repeat(72));
    console.log(
      `Coverage: ${report.coverage.pagesCrawled} pages crawled of ${report.coverage.pagesDiscovered} discovered · ` +
        `${report.coverage.checksApplicable}/${report.coverage.checksRun} checks applicable · ` +
        `${report.coverage.imagesProbed} images · ${(report.coverage.durationMs / 1000).toFixed(1)}s`
    );
    console.log('-'.repeat(72));
    console.log(`FINDINGS (${report.findings.length})`);
    for (const f of report.findings) {
      const lock = f.platformLocked ? ' [platform]' : '';
      console.log(`  ${f.severity.toUpperCase().padEnd(8)} ${f.id.padEnd(12)} ${f.title}${lock}`);
      for (const ev of f.evidence.slice(0, 2)) {
        console.log(`             └ ${ev.label}: ${ev.value.slice(0, 110)}`);
      }
    }
    console.log('-'.repeat(72));
    console.log('STRENGTHS');
    report.strengths.forEach((s) => console.log(`  ✓ ${s}`));
    console.log('-'.repeat(72));
    console.log(`OPPORTUNITY: ${report.opportunity.tier} — ${report.opportunity.services.join(', ')}`);
    console.log('='.repeat(72) + '\n');
  } catch (e: any) {
    if (e instanceof AuditError) {
      console.log(`\n✗ ${e.code}: ${e.message}`);
      if (e.hint) console.log(`  ${e.hint}\n`);
      return;
    }
    console.error('UNEXPECTED', e);
    process.exit(1);
  }
})();
