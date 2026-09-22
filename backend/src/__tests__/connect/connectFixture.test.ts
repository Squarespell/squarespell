/** The staging fixture website: present only when BOTH connect flags are exactly "true"; a plain 404 everywhere else. */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { api, makeUser, bearer, nextIp } from '../helpers/testkit';
import { resetData } from '../helpers/db';

const saved = { flag: process.env.CONNECT_ENABLED, faults: process.env.CONNECT_TEST_FAULTS };
beforeEach(async () => { await resetData(); process.env.CONNECT_ENABLED = 'true'; process.env.CONNECT_TEST_FAULTS = 'true'; });
afterAll(() => {
  for (const [k, v] of [['CONNECT_ENABLED', saved.flag], ['CONNECT_TEST_FAULTS', saved.faults]] as const) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
});

async function connect(domain: string) {
  const u = await makeUser({ plan: 'pro' });
  const r = await (await api()).post('/api/connect/sites').set({ ...bearer(u), 'X-Forwarded-For': nextIp() }).send({ platform: 'html', domain });
  return r.body.site.site_key as string;
}
const page = async (host: string, path = '/') => (await api()).get(path).set('Host', host);

describe('staging fixture website', () => {
  it('serves the loader of the site connected to the requesting hostname, with the inline slot, and is never indexable', async () => {
    const key = await connect('fixture.example.test');
    const r = await page('fixture.example.test');
    expect(r.status).toBe(200);
    expect(r.headers['x-robots-tag']).toContain('noindex');
    expect(r.headers['cache-control']).toBe('no-store');
    expect(r.text).toContain('<script async src="https://app.example.test/connect/loader.js" data-site="' + key + '"></script>');
    expect(r.text).toContain('data-squarespell-slot="hero-quiz"');
    expect((await page('fixture.example.test', '/pricing')).status).toBe(200);
  });
  it('is a 404 for a host with no connected site, and after the site is disconnected', async () => {
    expect((await page('nobody.example.test')).status).toBe(404);
    const u = await makeUser({ plan: 'pro' });
    const app = await api();
    const c = await app.post('/api/connect/sites').set({ ...bearer(u), 'X-Forwarded-For': nextIp() }).send({ platform: 'html', domain: 'gone.example.test' });
    expect((await page('gone.example.test')).status).toBe(200);
    await app.post('/api/connect/sites/' + c.body.site.id + '/disconnect').set({ ...bearer(u), 'X-Forwarded-For': nextIp() });
    expect((await page('gone.example.test')).status).toBe(404);
  });
  it('does not exist unless both flags are exactly "true"', async () => {
    await connect('fixture.example.test');
    for (const [flag, faults] of [['true', undefined], [undefined, 'true'], ['true', '1'], ['1', 'true'], [undefined, undefined]] as const) {
      if (flag === undefined) delete process.env.CONNECT_ENABLED; else process.env.CONNECT_ENABLED = flag;
      if (faults === undefined) delete process.env.CONNECT_TEST_FAULTS; else process.env.CONNECT_TEST_FAULTS = faults;
      expect((await page('fixture.example.test')).status, String(flag) + '/' + String(faults)).toBe(404);
    }
  });
  it('does not shadow real routes', async () => {
    expect(((await (await api()).get('/health'))).body).toEqual({ ok: true });
  });
});
