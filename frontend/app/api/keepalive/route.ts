/**
 * GET /api/keepalive
 *
 * Vercel Cron endpoint — pings the Render backend every 10 minutes
 * to prevent cold starts. Configured in vercel.json under "crons".
 *
 * Vercel calls this with the Authorization header set to
 * CRON_SECRET automatically — no manual token needed.
 */
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

export async function GET(request: Request): Promise<Response> {
  // Validate the request is from Vercel Cron (not a random caller).
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const start = Date.now();
  try {
    const res = await fetch(`${BACKEND}/health`, {
      method: 'GET',
      // Keep timeout tight — we just want to wake the server, not wait for a quiz
      signal: AbortSignal.timeout(20000),
    });
    const elapsed = Date.now() - start;
    const body = await res.text().catch(() => '');
    console.log(`[keepalive] backend=${BACKEND} status=${res.status} elapsed=${elapsed}ms body=${body}`);
    return Response.json({ ok: res.ok, status: res.status, elapsed, backend: BACKEND });
  } catch (err: any) {
    const elapsed = Date.now() - start;
    console.error(`[keepalive] FAILED backend=${BACKEND} elapsed=${elapsed}ms err=${err?.message}`);
    // Return 200 so Vercel doesn't mark the cron as failed on a Render hiccup —
    // a non-200 from this route would cause Vercel to alert, which is noise.
    return Response.json({ ok: false, error: err?.message, elapsed, backend: BACKEND }, { status: 200 });
  }
}
