import { Router } from 'express';
import { requireAuth, attachUser, AuthenticatedRequest } from '../middleware/auth';
import { supabase } from '../db/supabaseClient';

const router = Router();

const SQSP_CLIENT_ID = process.env.SQUARESPACE_CLIENT_ID || '';
const SQSP_CLIENT_SECRET = process.env.SQUARESPACE_CLIENT_SECRET || '';
const SQSP_REDIRECT_URI = 'https://squarespell-backend.onrender.com/auth/squarespace/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://squarespell.com';

// GET /auth/squarespace/connect  -  redirect to Squarespace OAuth
// Uses token query param since browser redirects can't set Authorization header
router.get('/connect', async (req, res) => {
  const token = req.query.token as string;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  // Decode JWT to get clerk user ID, then look up DB user
  let dbUserId = '';
  try {
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1] + '='.repeat((4 - parts[1].length % 4) % 4), 'base64').toString());
    const clerkId = payload.sub;
    if (!clerkId) return res.status(401).json({ error: 'Invalid token' });

    const { data } = await supabase.from('users').select('id').eq('clerk_user_id', clerkId).single();
    if (!data) return res.status(404).json({ error: 'User not found' });
    dbUserId = data.id;
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const params = new URLSearchParams({
    client_id: SQSP_CLIENT_ID,
    redirect_uri: SQSP_REDIRECT_URI,
    scope: 'website.orders.read,website.inventory.read',
    response_type: 'code',
    state: dbUserId,
  });
  res.redirect(`https://login.squarespace.com/api/1/login/oauth/provider/authorize?${params}`);
});

// GET /auth/squarespace/callback  -  exchange code for token
router.get('/callback', async (req, res) => {
  const { code, state: userId } = req.query;

  if (!code || !userId) {
    return res.redirect(`${FRONTEND_URL}/dashboard?sqsp_error=missing_params`);
  }

  try {
    // Exchange authorization code for access token
    const tokenRes = await fetch('https://login.squarespace.com/api/1/login/oauth/provider/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: SQSP_REDIRECT_URI,
        client_id: SQSP_CLIENT_ID,
        client_secret: SQSP_CLIENT_SECRET,
      }),
    });

    if (!tokenRes.ok) {
      console.error('Squarespace token exchange failed:', await tokenRes.text());
      return res.redirect(`${FRONTEND_URL}/dashboard?sqsp_error=token_failed`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Get the connected site info
    let siteUrl = '';
    try {
      const siteRes = await fetch('https://api.squarespace.com/1.0/authorization/website', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (siteRes.ok) {
        const siteData = await siteRes.json();
        siteUrl = siteData.siteUrl || siteData.url || '';
      }
    } catch {
      // Site URL lookup is non-critical
    }

    // Save to users table
    const { error } = await supabase
      .from('users')
      .update({
        squarespace_token: accessToken,
        squarespace_site_url: siteUrl,
      })
      .eq('id', userId as string);

    if (error) {
      console.error('Failed to save Squarespace token:', error.message);
      return res.redirect(`${FRONTEND_URL}/dashboard?sqsp_error=save_failed`);
    }

    res.redirect(`${FRONTEND_URL}/dashboard?sqsp_connected=true`);
  } catch (err: any) {
    console.error('Squarespace OAuth error:', err.message);
    res.redirect(`${FRONTEND_URL}/dashboard?sqsp_error=unknown`);
  }
});

// GET /auth/squarespace/status  -  check if user has connected
router.get('/status', requireAuth, attachUser, async (req: AuthenticatedRequest, res) => {
  const { data } = await supabase
    .from('users')
    .select('squarespace_token,squarespace_site_url')
    .eq('id', req.dbUserId)
    .single();

  res.json({
    connected: !!(data?.squarespace_token),
    site_url: data?.squarespace_site_url || null,
  });
});

export default router;
