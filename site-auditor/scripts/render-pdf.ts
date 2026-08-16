/**
 * Renders the PDF from a saved report, without needing a database.
 *
 * Usage:
 *   npx tsx scripts/run-audit.ts https://example.com --json > /tmp/report.json
 *   npx tsx scripts/render-pdf.ts /tmp/report.json /tmp/report.pdf
 *
 * The API route renders from a stored audit, which means checking the document
 * end to end normally requires a configured database. This exists so the
 * layout can be iterated on locally in a second, against a real report rather
 * than a fixture.
 */

import fs from 'node:fs';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { ReportDocument } from '../src/lib/pdf/document';
import type { AuditReport } from '../src/lib/audit/types';

async function main() {
  const [input, output = '/tmp/report.pdf'] = process.argv.slice(2);
  if (!input) {
    console.error('Usage: tsx scripts/render-pdf.ts <report.json> [out.pdf]');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(input, 'utf8'));
  // Accepts either a bare report or the NDJSON "done" event that the API emits.
  const report: AuditReport = raw.report || raw;

  const started = Date.now();
  const element = React.createElement(ReportDocument, { report }) as React.ReactElement<any>;
  const buffer = await renderToBuffer(element);
  fs.writeFileSync(output, buffer);
  console.log(
    `${output}  ${(buffer.length / 1024).toFixed(0)} KB  in ${((Date.now() - started) / 1000).toFixed(1)}s`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
