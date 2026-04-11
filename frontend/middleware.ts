import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])

/**
 * Host allow-list for routing.
 *
 * Both `app.squarespell.com` and `quiz.squarespell.com` point at the same Next.js
 * deployment on Vercel. The only difference is that on the quiz subdomain we want
 * the bare root to land on the /try flow instead of 404-ing (since there is no
 * page.tsx at /). Everything else is served as-is on both hosts — `/embed.js`,
 * `/q/:slug`, `/try`, `/api/*`, etc.
 *
 * The authenticated dashboard stays exclusively on app.squarespell.com because
 * Clerk's protected routes are tied to that origin via the session cookie.
 */
const QUIZ_HOST_SUFFIX = '.squarespell.com'
const QUIZ_SUBDOMAIN = 'quiz'

function isQuizHost(host: string | null): boolean {
  if (!host) return false
  const h = host.toLowerCase()
  return h === `${QUIZ_SUBDOMAIN}${QUIZ_HOST_SUFFIX}` || h.startsWith(`${QUIZ_SUBDOMAIN}.`)
}

export default clerkMiddleware((auth, req) => {
  const host = req.headers.get('host')
  const pathname = req.nextUrl.pathname

  // On quiz.squarespell.com, rewrite the bare root to /try.
  // Also catch /index in case anything links there.
  if (isQuizHost(host) && (pathname === '/' || pathname === '/index')) {
    const url = req.nextUrl.clone()
    url.pathname = '/try'
    return NextResponse.rewrite(url)
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
