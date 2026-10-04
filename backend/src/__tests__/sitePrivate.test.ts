/**
 * Private sites and unreadable colors in the scraper (services/brandScraper.ts). A Squarespace trial site that was not public
 * yet produced a quiz titled "Discover Your Ideal Private Site Solution", a "Log In" button to /config and white text on white.
 */
import { describe, expect, it } from 'vitest';
import { isPrivateSitePage, readableTextColor, SitePrivateError, NotSquarespaceError } from '../services/brandScraper';

const SQSP_LOCK = `<!doctype html><html><head><title>Private Site</title>
<link rel="stylesheet" href="https://static1.squarespace.com/static/versioned-site-css/abc/site.css"/></head>
<body><div class="lock-screen"><h1>Private Site</h1><a href="/config">Site owner? Log in</a></div></body></html>`;

const PASSWORD_PAGE = `<!doctype html><html><head><title>Fixture Bakery</title></head>
<body class="sqs-password-page"><form><input type="password" name="password"><button>Enter</button></form></body></html>`;

const REAL_PAGE = `<!doctype html><html><head><title>Fixture Bakery | Fresh bread daily</title></head>
<body><h1>Fresh bread daily</h1><p>Our private events menu is on the events page. Ask about our password-free gift cards.</p></body></html>`;

describe('private site detection', () => {
  it('recognizes the Squarespace "Private Site" screen', () => {
    expect(isPrivateSitePage(SQSP_LOCK, 200)).toBe(true);
  });
  it('recognizes a password screen', () => {
    expect(isPrivateSitePage(PASSWORD_PAGE, 200)).toBe(true);
  });
  it('treats 401 and 403 as private', () => {
    expect(isPrivateSitePage('<html></html>', 401)).toBe(true);
    expect(isPrivateSitePage('<html></html>', 403)).toBe(true);
  });
  it('does not flag a normal page that only mentions the words', () => {
    expect(isPrivateSitePage(REAL_PAGE, 200)).toBe(false);
  });
  it('is rejected like a non-Squarespace site, with its own code and a next step', () => {
    const e = new SitePrivateError('example.com');
    expect(e).toBeInstanceOf(NotSquarespaceError);
    expect(e.code).toBe('SITE_PRIVATE');
    expect(e.message).toContain('Site availability');
    expect(new NotSquarespaceError('example.com').code).toBe('NOT_SQUARESPACE');
  });
});

describe('detected colors are saved readable', () => {
  it('replaces white text detected on a white background', () => {
    expect(readableTextColor('#ffffff', '#ffffff')).toBe('#111111');
    expect(readableTextColor('#111111', '#000000')).toBe('#ffffff');
  });
  it('keeps text that already reads well', () => {
    expect(readableTextColor('#222222', '#ffffff')).toBe('#222222');
    expect(readableTextColor('#f5f5f5', '#101010')).toBe('#f5f5f5');
  });
});
