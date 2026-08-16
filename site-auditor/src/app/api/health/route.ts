import { isDbConfigured } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    ok: true,
    service: 'squarespell-auditor',
    time: new Date().toISOString(),
    database: isDbConfigured() ? 'configured' : 'not configured',
    ai: process.env.ANTHROPIC_API_KEY ? 'configured' : 'not configured (reports fall back to deterministic summaries)',
  });
}
