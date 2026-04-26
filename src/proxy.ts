/**
 * Route guard using next-auth.
 * next-auth checks for a valid session cookie automatically.
 * Unauthenticated requests to protected routes are redirected to /login.
 */
export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /api/auth/* (next-auth endpoints)
     * - /login (sign-in page)
     * - /_next/*, /favicon.ico (static assets)
     */
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)",
  ],
};
