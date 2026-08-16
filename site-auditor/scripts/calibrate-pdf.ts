/**
 * Checks that the PDF renders and that its pages are neither over- nor
 * under-filled.
 *
 * The document paginates itself (see the note in src/lib/pdf/document.tsx), so
 * the height model has to stay honest. Run this against a handful of real
 * reports after changing any type size, spacing or block:
 *
 *   npx tsx scripts/run-audit.ts https://example.com --json > /tmp/a.json
 *   npx tsx scripts/calibrate-pdf.ts /tmp/a.json /tmp/b.json
 *
 * Two failures matter. A render that throws is the layout engine dying on a
 * pagination decision it should never have had to make, which is what the
 * manual pagination exists to prevent. A page filled past 96% is a page that
 * was about to overflow, which means the estimates are running low.
 *
 * Requires pdftoppm (poppler-utils) and Python with Pillow and numpy, both of
 * which are already used elsewhere in this repo's tooling.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { execFileSync } from 'node:child_process';
import { ReportDocument } from '../src/lib/pdf/document';
import type { AuditReport } from '../src/lib/audit/types';

/** Percentage of each page's height that carries ink, top edge to last mark. */
function pageFills(pdf: string): number[] {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-'));
  execFileSync('pdftoppm', ['-r', '40', '-png', pdf, path.join(dir, 'p')]);
  const script = `
import glob, sys
import numpy as np
from PIL import Image
out = []
for f in sorted(glob.glob(sys.argv[1] + '/p-*.png')):
    a = np.array(Image.open(f).convert('L'))
    rows = (a < 230).sum(axis=1)
    nz = [i for i, v in enumerate(rows) if v > 0]
    out.append(round((nz[-1] if nz else 0) / a.shape[0] * 100))
print(' '.join(str(v) for v in out))
`;
  const result = execFileSync('python3', ['-c', script, dir]).toString().trim();
  fs.rmSync(dir, { recursive: true, force: true });
  return result ? result.split(' ').map(Number) : [];
}

async function main() {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error('Usage: tsx scripts/calibrate-pdf.ts <report.json> [more.json ...]');
    process.exit(1);
  }

  let bad = 0;
  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const report: AuditReport = raw.report || raw;
    const out = path.join(os.tmpdir(), 'calibrate.pdf');

    let buffer: Buffer;
    try {
      buffer = await renderToBuffer(
        React.createElement(ReportDocument, { report }) as React.ReactElement<any>
      );
    } catch (e: any) {
      bad++;
      console.log(`${path.basename(file)}  RENDER FAILED  ${String(e.message).slice(0, 60)}`);
      continue;
    }
    fs.writeFileSync(out, buffer);

    const fills = pageFills(out);
    const over = fills.filter((f) => f > 96).length;
    const thin = fills.filter((f) => f < 30).length;
    if (over) bad++;
    console.log(
      `${path.basename(file).padEnd(34)} ${String(fills.length).padStart(2)}p  ` +
        `${over ? `OVERFULL x${over}  ` : ''}${thin ? `thin x${thin}  ` : ''}` +
        fills.join(' ')
    );
  }

  console.log(bad === 0 ? '\nAll reports rendered inside the page.' : `\n${bad} need attention.`);
  process.exit(bad === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
