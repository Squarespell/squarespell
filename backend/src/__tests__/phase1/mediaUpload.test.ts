/**
 * Phase 1 - POST /api/media/upload: authorization, allowed types, size cap, content sniffing, storage failure and cleanup.
 * The hermetic client has no storage backend, so each test installs a small in-memory bucket.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { api, makeUser, bearer } from '../helpers/testkit';
import { resetData } from '../helpers/db';
import { supabase } from '../../db/supabaseClient';

const realStorage = (supabase as any).storage;
const uploads: Array<{ path: string; size: number; type: string }> = [];
const removed: string[] = [];

function installBucket(o: { uploadError?: boolean; noUrl?: boolean } = {}) {
  (supabase as any).storage = {
    from: () => ({
      upload: async (path: string, body: Buffer, opts: any) => {
        if (o.uploadError) return { data: null, error: { message: 'secret internal bucket detail' } };
        uploads.push({ path, size: body.length, type: opts.contentType });
        return { data: { path }, error: null };
      },
      getPublicUrl: (path: string) => ({ data: { publicUrl: o.noUrl ? undefined : 'https://cdn.example.test/' + path } }),
      remove: async (paths: string[]) => {
        removed.push(...paths);
        return { data: null, error: null };
      },
    }),
  };
}

beforeEach(async () => {
  await resetData();
  uploads.length = 0;
  removed.length = 0;
  installBucket();
});
afterEach(() => {
  (supabase as any).storage = realStorage;
});

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const GIF = Buffer.concat([Buffer.from('GIF89a', 'latin1'), Buffer.alloc(32)]);
const WEBP = Buffer.concat([Buffer.from('RIFF', 'latin1'), Buffer.alloc(4), Buffer.from('WEBP', 'latin1'), Buffer.alloc(32)]);
const body = (buf: Buffer, over: Record<string, any> = {}) => ({ data: buf.toString('base64'), fileName: 'photo.png', contentType: 'image/png', ...over });

describe('media upload authorization', () => {
  it('requires a session and, once signed in, the CSRF token', async () => {
    const app = await api();
    const anon = await app.post('/api/media/upload').send(body(PNG));
    expect(anon.status).toBe(401);
    const u = await makeUser();
    const noCsrf = await app.post('/api/media/upload').set('Cookie', bearer(u).Cookie).send(body(PNG));
    expect(noCsrf.status).toBe(403);
    expect(uploads).toHaveLength(0);
  });
});

describe('media upload validation', () => {
  it('stores each allowed image type under the caller\'s own folder, with the extension taken from the verified type', async () => {
    const u = await makeUser();
    const app = await api();
    const cases: Array<[Buffer, string, string]> = [[PNG, 'image/png', 'png'], [JPEG, 'image/jpeg', 'jpg'], [GIF, 'image/gif', 'gif'], [WEBP, 'image/webp', 'webp']];
    for (const [buf, type, ext] of cases) {
      const r = await app.post('/api/media/upload').set(bearer(u)).send(body(buf, { contentType: type, fileName: 'evil.html' }));
      expect(r.status, type).toBe(200);
      expect(r.body.path.startsWith(u.id + '/'), type).toBe(true);
      expect(r.body.path.endsWith('.' + ext), type).toBe(true);
      expect(r.body.url).toBe('https://cdn.example.test/' + r.body.path);
    }
    expect(uploads.map((x) => x.type)).toEqual(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
  });

  it('refuses types that can carry script or are not images', async () => {
    const u = await makeUser();
    const app = await api();
    for (const type of ['text/html', 'image/svg+xml', 'application/javascript', 'application/pdf']) {
      const r = await app.post('/api/media/upload').set(bearer(u)).send(body(Buffer.from('<script>alert(1)</script>'), { contentType: type, fileName: 'x.png' }));
      expect(r.status, type).toBe(415);
    }
    expect(uploads).toHaveLength(0);
  });

  it('refuses bytes that do not match the declared image type', async () => {
    const u = await makeUser();
    const app = await api();
    const wrong = await app.post('/api/media/upload').set(bearer(u)).send(body(JPEG, { contentType: 'image/png' }));
    expect(wrong.status).toBe(415);
    const html = await app.post('/api/media/upload').set(bearer(u)).send(body(Buffer.from('<html><script>alert(1)</script></html>'), { contentType: 'image/png' }));
    expect(html.status).toBe(415);
    expect(uploads).toHaveLength(0);
  });

  it('enforces the 5 MB cap and rejects empty or malformed requests', async () => {
    const u = await makeUser();
    const app = await api();
    const big = await app.post('/api/media/upload').set(bearer(u)).send({ data: 'A'.repeat(8 * 1024 * 1024), fileName: 'big.png', contentType: 'image/png' });
    expect(big.status).toBe(413);
    const missing = await app.post('/api/media/upload').set(bearer(u)).send({ fileName: 'x.png' });
    expect(missing.status).toBe(400);
    const empty = await app.post('/api/media/upload').set(bearer(u)).send({ data: '=', fileName: 'x.png', contentType: 'image/png' });
    expect(empty.status).toBe(400);
    expect(uploads).toHaveLength(0);
  });
});

describe('media upload failure handling', () => {
  it('a storage error returns a generic 500 that does not leak the provider message', async () => {
    installBucket({ uploadError: true });
    const u = await makeUser();
    const r = await (await api()).post('/api/media/upload').set(bearer(u)).send(body(PNG));
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.body)).not.toContain('secret internal');
  });

  it('an upload whose public URL cannot be produced is removed again instead of being left behind', async () => {
    installBucket({ noUrl: true });
    const u = await makeUser();
    const r = await (await api()).post('/api/media/upload').set(bearer(u)).send(body(PNG));
    expect(r.status).toBe(500);
    expect(uploads).toHaveLength(1);
    expect(removed).toEqual([uploads[0].path]);
  });
});
