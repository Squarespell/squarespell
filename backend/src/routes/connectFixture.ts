import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../db/supabaseClient';
import { connectEnabled, getConnectConfig } from '../services/connect/service';
import { hostnameFromHeader } from '../services/connect/hostname';

/**
 * Staging fixture: a tiny "customer website" served at the API host's own root, used only to prove the connect flow end to end
 * (verification by page fetch, heartbeat from a real browser, popup, floating tab and inline slot).
 *
 * It exists ONLY when both CONNECT_ENABLED and CONNECT_TEST_FAULTS are exactly "true". In production neither is set, so every
 * request falls through to the normal 404. The page carries the loader of the site connected to the requesting hostname, which
 * is exactly what a customer's page carries after the one-time install. It contains no customer data.
 */
export const connectFixtureRouter = Router();

const fixtureOn = () => connectEnabled() && process.env.CONNECT_TEST_FAULTS === 'true';
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

connectFixtureRouter.get(['/', '/pricing', '/contact', '/services/web'], async (req: Request, res: Response, next: NextFunction) => {
  if (!fixtureOn()) return next();
  const host = hostnameFromHeader('https://' + String(req.headers.host || ''));
  if (!host) return next();
  const { data: site } = await supabase.from('connected_sites').select('site_key').eq('hostname', host).neq('state', 'disconnected').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!site) return next();
  const path = req.path === '/' ? 'Home' : req.path.slice(1);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store');
  res.send(
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">' +
    '<title>Connect fixture: ' + esc(path) + '</title></head><body style="font-family:system-ui,sans-serif;max-width:720px;margin:32px auto;padding:0 16px">' +
    '<h1>Fixture website: ' + esc(path) + '</h1><p>A controlled test page for the one-button connect flow. It exists only on staging.</p>' +
    '<nav><a href="/">Home</a> | <a href="/pricing">Pricing</a> | <a href="/services/web">Services</a> | <a href="/contact">Contact</a></nav>' +
    '<section><h2>Inline slot</h2><div data-squarespell-slot="hero-quiz"></div></section>' +
    '<script async src="' + esc(getConnectConfig().loaderUrl) + '" data-site="' + esc(site.site_key) + '"></script></body></html>',
  );
});
