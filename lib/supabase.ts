import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase Auth Client for SSR (Next.js App Router)
 * 
 * Uses @supabase/ssr for proper cookie-based session handling.
 * Environment variables required:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * 
 * Usage in Server Components:
 * ```typescript
 * import { createSupabaseServerClient } from '@/lib/supabase';
 * 
 * export default async function Page() {
 *   const supabase = await createSupabaseServerClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   // ...
 * }
 * ```
 */

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Cannot set cookies from Server Components or Route Handlers
          // Use middleware or Client Components for cookie operations
          return;
        },
      },
    }
  );
}

/**
 * Get current authenticated user from server-side
 * Returns null if not authenticated
 * 
 * Usage:
 * ```typescript
 * import { getAuthenticatedUser } from '@/lib/supabase';
 * import { redirect } from 'next/navigation';
 * 
 * export default async function DashboardPage() {
 *   const user = await getAuthenticatedUser();
 *   if (!user) redirect('/login');
 *   // ...
 * }
 * ```
 */
export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Cookie options for Supabase Auth
 * Used when setting auth cookies manually
 */
export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
};