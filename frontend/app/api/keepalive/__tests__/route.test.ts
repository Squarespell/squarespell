import { describe, it, expect, afterEach } from 'vitest';
import { GET } from '../route';

const saved = process.env.CRON_SECRET;
afterEach(() => { if (saved === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = saved; });

const req = (auth?: string) => new Request('http://localhost/api/keepalive', { headers: auth ? { authorization: auth } : {} });

describe('/api/keepalive authentication fails closed', () => {
  it('rejects the literal "Bearer undefined" when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req('Bearer undefined'));
    expect(res.status).toBe(401);
  });
  it('rejects a missing or wrong bearer token when a secret is configured', async () => {
    process.env.CRON_SECRET = 'local-test-secret';
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req('Bearer nope'))).status).toBe(401);
  });
});
