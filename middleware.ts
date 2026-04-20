import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Auth Middleware - Protect routes based on auth state
 * 
 * - Protects all / (main) routes (dashboard, library, editor, details)
 * - Allows /login and /api routes
 * - Redirects unauthenticated users to /login
 * 
 * Requirements from spec:
 * - REQ-UA-3: Maintain session via cookie
 * - REQ-UA-4: Show auth state in UI (handled by middleware redirect)
 */

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Create Supabase client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser();

  // Get current path
  const pathname = request.nextUrl.pathname;

  // Define public routes that don't require auth
  const publicRoutes = ['/login', '/api'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Define protected routes that require auth
  const protectedRoutes = ['/dashboard', '/library', '/editor', '/details'];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Root path also requires auth (redirect to dashboard after login)
  const isRoot = pathname === '/';

  // If accessing protected route without user, redirect to login
  if (!user && (isProtectedRoute || isRoot)) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If user is logged in and tries to access /login, redirect to dashboard
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

// Specify which routes this middleware applies to
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};