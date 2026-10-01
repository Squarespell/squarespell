import { NextRequest, NextResponse } from 'next/server'

/**
 * Host + path routing rules.
 *
 * Everything user-facing lives on the app host (app.<domain>):
 *   /                              public homepage (signed-in visitors are sent to /dashboard by the page)
 *   /tools/quiz-funnel/build       public no-login quiz builder
 *   /q/:slug, /quiz/:slug          public published quiz
 *   /embed.js, /embed/*            embed loader assets
 *   /sign-in, /sign-up, /forgot-password, /reset-password, /verify-email
 *                                  our own sign-in (sessions live on the API host, see lib/auth/client.tsx)
 *   /dashboard, /admin             signed-in pages; useDashboardAuth sends signed-out visitors to /sign-in and the
 *                                  API refuses every request without a valid access token
 *
 *   quiz.<domain> (legacy)         ALL paths 301 → app.<domain><path>, so old embed snippets and shared links work
 *   admin.<domain>                 302 → app.<domain>/admin
 *   /try (legacy path)             308 → /tools/quiz-funnel/build
 */
const QUIZ_HOST_PREFIX = 'quiz.'
const ADMIN_HOST_PREFIX = 'admin.'

function appHostFor(host: string, prefix: string): string {
  return 'app.' + host.slice(prefix.length)
}

export default function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase()
  const pathname = req.nextUrl.pathname

  if (host.startsWith(ADMIN_HOST_PREFIX)) {
    const target = req.nextUrl.clone()
    target.protocol = 'https:'
    target.host = appHostFor(host, ADMIN_HOST_PREFIX)
    target.pathname = '/admin'
    return NextResponse.redirect(target, 302)
  }

  if (host.startsWith(QUIZ_HOST_PREFIX)) {
    const target = req.nextUrl.clone()
    target.protocol = 'https:'
    target.host = appHostFor(host, QUIZ_HOST_PREFIX)
    return NextResponse.redirect(target, 301)
  }

  if (pathname === '/try' || pathname.startsWith('/try/')) {
    const target = req.nextUrl.clone()
    target.pathname = pathname.replace(/^\/try/, '/tools/quiz-funnel/build')
    return NextResponse.redirect(target, 308)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
}
