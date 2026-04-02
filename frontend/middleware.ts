import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
const isPublic = createRouteMatcher(['/', '/pricing', '/sign-in(.*)', '/sign-up(.*)', '/quiz/(.*)']);
export default clerkMiddleware((auth, req) => { if (!isPublic(req)) auth().protect(); });
export const config = { matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'] };
