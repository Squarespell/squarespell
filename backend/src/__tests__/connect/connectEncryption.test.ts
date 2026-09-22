/** Private platform credentials: AES-256-GCM with a key-version prefix, backward compatible with the existing format. */
import { describe, it, expect, beforeEach } from 'vitest';
import { encrypt, decrypt, encryptVersioned, KEY_VERSION, encryptConfig, decryptConfig } from '../../utils/encryption';
import { makeUser } from '../helpers/testkit';
import { resetData, sql } from '../helpers/db';
import { generateSiteKey } from '../../services/connect/rules';

const SECRET = 'platform-access-token-EXAMPLE-0123456789';

describe('key-versioned encryption', () => {
  it('writes v1:iv:tag:ciphertext, never the plaintext, and round-trips', () => {
    const v = encryptVersioned(SECRET);
    expect(KEY_VERSION).toBe('v1');
    expect(v.startsWith('v1:')).toBe(true);
    expect(v.split(':')).toHaveLength(4);
    expect(v).not.toContain(SECRET);
    expect(decrypt(v)).toBe(SECRET);
  });
  it('uses a fresh IV every time', () => {
    expect(encryptVersioned(SECRET)).not.toBe(encryptVersioned(SECRET));
  });
  it('still reads the existing un-prefixed format', () => {
    const legacy = encrypt(SECRET);
    expect(legacy.split(':')).toHaveLength(3);
    expect(decrypt(legacy)).toBe(SECRET);
  });
  it('fails closed on an unknown key version or a tampered value', () => {
    const v = encryptVersioned(SECRET);
    expect(() => decrypt(v.replace(/^v1:/, 'v9:'))).toThrow(/Unknown encryption key version/);
    const parts = v.split(':');
    parts[3] = (parts[3][0] === 'a' ? 'b' : 'a') + parts[3].slice(1);
    expect(() => decrypt(parts.join(':'))).toThrow();
    expect(() => decrypt('v1:abc')).toThrow();
  });
  it('a versioned value inside a config is recognised as already encrypted and is not encrypted twice', () => {
    const cfg = encryptConfig({ access_token: encryptVersioned(SECRET), label: 'plain' });
    expect(cfg.access_token.split(':')).toHaveLength(4);
    expect(cfg.label).toBe('plain');
    expect(decryptConfig(cfg).access_token).toBe(SECRET);
  });
  it('the existing config format is unchanged for existing integrations', () => {
    const cfg = encryptConfig({ api_key: 'k-123', list_id: 'abc' });
    expect(cfg.api_key.split(':')).toHaveLength(3);
    expect(decryptConfig(cfg)).toEqual({ api_key: 'k-123', list_id: 'abc' });
  });
});

describe('stored credentials (site_authorizations)', () => {
  beforeEach(async () => { await resetData(); });
  it('holds only ciphertext and is deleted with the site', async () => {
    const owner = await makeUser({ plan: 'pro' });
    const site = (await sql<{ id: string }>('insert into connected_sites (user_id, platform, hostname, site_key) values ($1,$2,$3,$4) returning id', [owner.id, 'html', 'customer.invalid', generateSiteKey()]))[0];
    await sql('insert into site_authorizations (site_id, user_id, method, access_token_enc, refresh_token_enc, approved_scopes) values ($1,$2,$3,$4,$5,$6)', [site.id, owner.id, 'oauth', encryptVersioned(SECRET), encryptVersioned('refresh-' + SECRET), ['read:site']]);
    const row = (await sql<any>('select * from site_authorizations'))[0];
    expect(JSON.stringify(row)).not.toContain(SECRET);
    expect(decrypt(row.access_token_enc)).toBe(SECRET);
    expect(row.approved_scopes).toEqual(['read:site']);
    await sql('delete from connected_sites where id=$1', [site.id]);
    expect(await sql('select 1 from site_authorizations')).toHaveLength(0);
  });
});
