/** The loader route: configuration only, never a fallback to another deployment's domain. */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';

const KEYS = ['CONNECT_ENABLED', 'NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_SITE_URL'] as const;
const saved: Record<string, string | undefined> = {};
beforeEach(() => { for (const k of KEYS) saved[k] = process.env[k]; });
afterEach(() => { for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } });

const configure = (over: Partial<Record<(typeof KEYS)[number], string | undefined>> = {}) => {
  const v = { CONNECT_ENABLED: 'true', NEXT_PUBLIC_API_URL: 'https://api-staging.example.test', NEXT_PUBLIC_SITE_URL: 'https://staging.example.test', ...over };
  for (const k of KEYS) { if (v[k] === undefined) delete process.env[k]; else process.env[k] = v[k] as string; }
};

describe('GET /connect/loader.js', () => {
  it('a staging configuration produces a loader that uses only the staging site and the staging API', async () => {
    configure();
    const res = await GET();
    const body = await res.text();
    expect(res.status).toBe(200);
    expect(body).toContain("ORIGIN = 'https://staging.example.test'");
    expect(body).toContain("API = 'https://api-staging.example.test'");
    expect(body).not.toMatch(/squarespellquiz\.com/);
    expect(body).not.toMatch(/app\.squarespell\.com/);
    expect(body).not.toMatch(/quiz\.squarespell\.com/);
    expect(body).not.toMatch(/document\.cookie/);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
  it('a production configuration produces a loader for the production site', async () => {
    configure({ NEXT_PUBLIC_SITE_URL: 'https://squarespellquiz.com', NEXT_PUBLIC_API_URL: 'https://api.squarespellquiz.com' });
    const body = await (await GET()).text();
    expect(body).toContain("ORIGIN = 'https://squarespellquiz.com'");
    expect(body).toContain("API = 'https://api.squarespellquiz.com'");
    expect(body).not.toMatch(/app\.squarespell\.com|quiz\.squarespell\.com/);
  });
  it('never falls back to the production domain: a missing site URL or API URL is a 503 with no origin in the body', async () => {
    for (const over of [{ NEXT_PUBLIC_SITE_URL: undefined }, { NEXT_PUBLIC_SITE_URL: '   ' }, { NEXT_PUBLIC_API_URL: undefined }]) {
      configure(over);
      const res = await GET();
      const body = await res.text();
      expect(res.status, JSON.stringify(over)).toBe(503);
      expect(body).not.toMatch(/squarespellquiz|squarespell\.com|ORIGIN/);
      expect(res.headers.get('cache-control')).toBe('no-store');
    }
  });
  it('refuses a malformed origin instead of serving it', async () => {
    configure({ NEXT_PUBLIC_SITE_URL: 'javascript:alert(1)' });
    expect((await GET()).status).toBe(503);
  });
  it('is a plain 404 while the feature flag is off', async () => {
    for (const flag of [undefined, 'false', 'TRUE', '1']) {
      configure({ CONNECT_ENABLED: flag });
      const res = await GET();
      expect(res.status, String(flag)).toBe(404);
      expect(await res.text()).not.toContain('ORIGIN');
    }
  });
});
