import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])

/**
 * Host allow-list for routing.
 *
 * Both `app.squarespell.com` and `quiz.squarespell.com` point at the same Next.js
 * deployment on Vercel. The routing rules are:
 *
 *  quiz.squarespell.com
 *    /                 → rewrite to /try  (the Stage 1 hook widget)
 *    /try(/*)          → serve as-is
 *    /q/:slug          → serve as-is      (public published quiz)
 *    /embed*           → serve as-is      (embed script + assets)
 *    /api/*            → serve as-is
 *    /_next/*, assets  → serve as-is      (already excluded by matcher)
 *    ANYTHING ELSE     → 308 redirect to app.squarespell.com<path>
 *
 *    This includes /dashboard, /sign-in, /sign-up, /billing, etc. — those
 *    belong on the app subdomain because Clerk session cookies are scoped
 *    to that origin. Without this redirect, signing in on quiz.* creates
 *    the session on the wrong host and the dashboard sidebar never mounts.
 *
 *  app.squarespell.com / squarespell.com
 *    Served as-is; protected routes use Clerk middleware.
 */
const HOST_SUFFIX = '.squarespell.com'
const APP_HOST = 'app.squarespell.com'
const QUIZ_SUBDOMAIN = 'quiz'

function isQuizHost(host: string | null): boolean {
  if (!host) return false
  const h = host.toLowerCase()
  return h === `${QUIZ_SUBDOMAIN}${HOST_SUFFIX}` || h.startsWith(`${QUIZ_SUBDOMAIN}.`)
}

// Paths that the quiz subdomain is allowed to serve directly.
// Everything else on the quiz host is redirected to app.squarespell.com.
function isQuizAllowedPath(pathname: string): boolean {
  if (pathname === '/' || pathname === '/index') return true
  if (pathname === '/try' || pathname.startsWith('/try/')) return true
  if (pathname.startsWith('/q/')) return true
  if (pathname === '/embed.js' || pathname.startsWith('/embed/')) return true
  if (pathname.startsWith('/api/')) return true
  return false
}

export default clerkMiddleware((auth, req) => {
  const host = req.headers.get('host')
  const pathname = req.nextUrl.pathname

  if (isQuizHost(host)) {
    // 1. Bare root → rewrite to /try (internal, URL stays as quiz.squarespell.com)
    if (pathname === '/' || pathname === '/index') {
      const url = req.nextUrl.clone()
      url.pathname = '/try'
      return NextResponse.rewrite(url)
    }

    // 2. Anything not explicitly allowed on quiz host → redirect to app host
    //    Preserves path, query, and hash so /dashboard/abc?justClaimed=1 works.
    if (!isQuizAllowedPath(pathname)) {
      const target = req.nextUrl.clone()
      target.protocol = 'https:'
      target.host = APP_HOST
      return NextResponse.redirect(target, 308)
    }
  }

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
