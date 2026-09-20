/** Guards the names-only configuration map (docs/relaunch/SQUARESPELL_PHASE_1_RESULTS.md, section 3). */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../../..');
const SCRIPT = path.join(ROOT, 'scripts/config-inventory.mjs');
const DOC = path.join(ROOT, 'docs/relaunch/SQUARESPELL_PHASE_1_RESULTS.md');

describe('configuration inventory', () => {
  it('every environment variable referenced by the code has an ownership entry (add it to scripts/config-inventory.mjs)', () => {
    const out = execFileSync(process.execPath, [SCRIPT, '--check'], { encoding: 'utf8' });
    expect(out).toMatch(/^OK: \d+ variables/);
  });

  it('the results document lists every variable and leaves the live-dashboard column to the coordinator, with no secret values', () => {
    const rows: Array<{ name: string }> = JSON.parse(execFileSync(process.execPath, [SCRIPT, '--json'], { encoding: 'utf8' }));
    const doc = fs.readFileSync(DOC, 'utf8');
    const missing = rows.map((r) => r.name).filter((n) => !doc.includes('`' + n + '`'));
    expect(missing).toEqual([]);
    expect(doc).toContain('TO_BE_FILLED');
    expect(doc).not.toMatch(/sk_live_[A-Za-z0-9]{10,}|whsec_[A-Za-z0-9+/=]{16,}|sk-ant-[A-Za-z0-9_-]{16,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/);
  });
});
