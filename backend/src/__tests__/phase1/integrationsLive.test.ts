/**
 * Phase 1 - integrations advertised as live. Native pushes are exercised against a stubbed network; anything that is not
 * mounted or not implemented must be listed as planned, never as available.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { pushLeadToIntegration } from '../../services/integrations';
import { validateWebhookUrl } from '../../utils/urlValidator';
import { api } from '../helpers/testkit';

const lead = { email: 'ada@customer.example', firstName: 'Ada', tags: ['hot'], metadata: { score: 3 } };
afterEach(() => vi.unstubAllGlobals());

describe('native integrations', () => {
  it('reject an incomplete configuration for every native type, without any network call', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const cases: Array<[string, RegExp]> = [
      ['mailchimp', /Mailchimp/],
      ['klaviyo', /Klaviyo/],
      ['convertkit', /ConvertKit/],
      ['activecampaign', /ActiveCampaign/],
      ['hubspot', /HubSpot/],
      ['acuity', /Acuity/],
      ['calendly', /Calendly/],
    ];
    for (const [type, re] of cases) {
      const r = await pushLeadToIntegration({ type, config: {} }, lead);
      expect(r.success, type).toBe(false);
      expect(r.error, type).toMatch(re);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('Klaviyo: creates the profile, then adds it to the list, authenticating with the account key', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 'prof_1' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchSpy);
    const r = await pushLeadToIntegration({ type: 'klaviyo', config: { apiKey: 'pk_test_KEY', listId: 'LIST1' } }, lead);
    expect(r).toEqual({ success: true });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const [profileUrl, profileInit] = fetchSpy.mock.calls[0];
    expect(profileUrl).toBe('https://a.klaviyo.com/api/profiles/');
    expect(profileInit.headers.Authorization).toBe('Klaviyo-API-Key pk_test_KEY');
    const profileBody = JSON.parse(profileInit.body);
    expect(profileBody.data.attributes).toMatchObject({ email: 'ada@customer.example', first_name: 'Ada' });
    expect(profileBody.data.attributes.properties).toMatchObject({ score: 3, tags: ['hot'] });
    const [listUrl, listInit] = fetchSpy.mock.calls[1];
    expect(listUrl).toBe('https://a.klaviyo.com/api/lists/LIST1/relationships/profiles/');
    expect(JSON.parse(listInit.body).data).toEqual([{ type: 'profile', id: 'prof_1' }]);
  });

  it('Klaviyo: a rejected profile returns the provider detail, a missing profile id is an error, and an "already on list" reply is not fatal', async () => {
    const cfg = { type: 'klaviyo', config: { apiKey: 'k', listId: 'L' } };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, json: async () => ({ detail: 'invalid api key' }) }));
    expect(await pushLeadToIntegration(cfg, lead)).toEqual({ success: false, error: 'invalid api key' });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ data: {} }) }));
    expect((await pushLeadToIntegration(cfg, lead)).error).toMatch(/profile ID/);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 'p' } }) }).mockResolvedValueOnce({ ok: false, json: async () => ({ detail: 'already on list' }) }),
    );
    expect((await pushLeadToIntegration(cfg, lead)).success).toBe(true);
  });

  it('a network failure is reported as a failed push, never as delivered', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('socket hang up')));
    const r = await pushLeadToIntegration({ type: 'klaviyo', config: { apiKey: 'k', listId: 'L' } }, lead);
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/socket hang up/);
  });

  it('a type with no native implementation is refused, not silently accepted', async () => {
    for (const type of ['zapier', 'salesforce', 'made-up']) {
      const r = await pushLeadToIntegration({ type, config: {} }, lead);
      expect(r).toMatchObject({ success: false });
      expect(r.error).toMatch(/Unsupported integration type/);
    }
  });
});

describe('webhook destinations', () => {
  it('accept public https URLs and refuse plain http, private ranges, cloud metadata and embedded credentials', () => {
    expect(validateWebhookUrl('https://hooks.example.com/lead')).toBeNull();
    for (const bad of ['http://hooks.example.com/lead', 'https://10.1.2.3/x', 'https://192.168.1.5/x', 'https://172.16.0.4/x', 'https://169.254.169.254/latest/meta-data', 'https://user:secret@hooks.example.com/x', 'not a url', '']) {
      expect(validateWebhookUrl(bad), bad).not.toBeNull();
    }
  });
});

describe('Zapier is planned, not live', () => {
  it('no Zapier route is mounted on the API', async () => {
    const r = await (await api()).post('/api/zapier/auth/test').send({});
    expect(r.status).toBe(404);
  });

  it('the integrations catalog never marks a Zapier-based tile as available', () => {
    const page = fs.readFileSync(path.resolve(__dirname, '../../../../frontend/app/dashboard/integrations/page.tsx'), 'utf8');
    const zapierTiles = page.split('\n').filter((l) => /\{\s*type:\s*'zapier'/.test(l));
    expect(zapierTiles.length).toBeGreaterThan(10);
    for (const line of zapierTiles) expect(line, line.slice(0, 80)).toMatch(/available:\s*false/);
  });
});
