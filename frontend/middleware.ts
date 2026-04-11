import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])

/**
 * Host + path routing rules.
 *
 * Single-subdomain architecture: everything user-facing in the Squarespell
 * product lives under app.squarespell.com. The marketing site
 * (squarespell.com) is hosted on Squarespace.
 *
 *   app.squarespell.com
 *     /                              redirect → /tools/quiz-funnel
 *     /tools                         tools hub
 *     /tools/quiz-funnel             quiz tool marketing landing
 *     /tools/quiz-funnel/build       public no-login quiz builder
 *     /q/:slug                       public published quiz
 *     /embed.js, /embed/*            embed loader assets
 *     /sign-in, /sign-up             Clerk auth
 *     /dashboard, /dashboard/*       authenticated dashboard (Clerk-protected)
 *
 *   quiz.squarespell.com (legacy subdomain — will be sunset)
 *     ALL paths                      301 → app.squarespell.com<path>
 *     This keeps every old embed snippet, every shared quiz link, and every
 *     piece of marketing collateral that mentions quiz.squarespell.com
 *     working forever, while consolidating the canonical URL on the app host.
 *
 *   /try (legacy app-host path)      308 → /tools/quiz-funnel/build
 *     Same idea: anyone who saved /try in a bookmark or has it in old code
 *     gets transparently moved to the canonical URL.
 */
const APP_HOST = 'app.squarespell.com'
const QUIZ_HOST_PREFIX = 'quiz.'

function isQuizHost(host: string | null): boolean {
  if (!host) return false
  const h = host.toLowerCase()
  return h.startsWith(QUIZ_HOST_PREFIX)
}

export default clerkMiddleware((auth, req) => {
  const host = req.headers.get('host')
  const pathname = req.nextUrl.pathname

  // 1. Legacy quiz.squarespell.com → permanent 301 to app.squarespell.com.
  //    Preserves path, query, and hash so /q/abc?ref=foo continues to work.
  if (isQuizHost(host)) {
    const target = req.nextUrl.clone()
    target.protocol = 'https:'
    target.host = APP_HOST
    return NextResponse.redirect(target, 301)
  }

  // 2. Legacy /try path → /tools/quiz-funnel/build (with query preserved).
  if (pathname === '/try' || pathname.startsWith('/try/')) {
    const target = req.nextUrl.clone()
    target.pathname = pathname.replace(/^\/try/, '/tools/quiz-funnel/build')
    return NextResponse.redirect(target, 308)
  }

  // 3. Bare root → tools landing (the marketing page is the de-facto home
  //    of the app subdomain). Signed-in users on root will fall through to
  //    page.tsx which redirects them to /dashboard.
  //    (Handled inside app/page.tsx, not here, so we don't break SSR.)

  if (isProtectedRoute(req)) {
    auth().protect({
      unauthenticatedUrl: new URL('/sign-in', req.url).toString(),
    })
  }
  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
