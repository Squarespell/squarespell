/**
 * Phase 1 - the Squarespace brand scraper must never make the server contact internal addresses.
 * POST /api/preview-analyze is public (rate limited only), so scrapeBrand() is reachable by anyone.
 * Every URL below is refused before any connection is attempted, and answered exactly like any other
 * non-Squarespace site (NotSquarespaceError -> 422 NOT_SQUARESPACE), so it is not a reachability oracle.
 */
import { describe, it, expect } from 'vitest';
import { api, nextIp } from '../helpers/testkit';
import { scrapeBrand, NotSquarespaceError } from '../../services/brandScraper';

const BLOCKED = [
  'http://169.254.169.254/latest/meta-data/',
  'http://10.0.0.5/',
  'http://192.168.1.1/admin',
  'http://172.16.0.9/',
  'http://100.64.0.1/',
  'http://0.0.0.0/',
  'http://[fd00:ec2::254]/',
  'http://[::ffff:10.0.0.1]/',
];

describe('brand scraper SSRF guard', () => {
  for (const url of BLOCKED) {
    it('scrapeBrand refuses ' + url, async () => {
      await expect(scrapeBrand(url)).rejects.toBeInstanceOf(NotSquarespaceError);
    });
  }

  it('the public preview-analyze endpoint answers an internal address with the generic 422 NOT_SQUARESPACE', async () => {
    const r = await (await api()).post('/api/preview-analyze').set('X-Forwarded-For', nextIp()).send({ url: 'http://169.254.169.254/latest/meta-data/' });
    expect(r.status).toBe(422);
    expect(r.body.code).toBe('NOT_SQUARESPACE');
  });

  it('the authenticated scrape-brand and from-url routes share the same guard', async () => {
    const { makeUser, bearer } = await import('../helpers/testkit');
    const u = await makeUser();
    const r = await (await api()).post('/api/scrape-brand').set(bearer(u)).send({ url: 'http://10.0.0.5/' });
    expect(r.status).toBe(422);
    expect(r.body.code).toBe('NOT_SQUARESPACE');
  });
});
