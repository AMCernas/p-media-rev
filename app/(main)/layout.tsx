import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase";
import { Sidebar } from "@/components/layout/sidebar";
import { SearchBox } from "@/components/features/search-box";

/**
 * Main App Layout - Protected routes with Sidebar navigation
 * 
 * All routes in (main) group require authentication.
 * This layout provides the Sidebar with user info.
 * 
 * Protected routes:
 * - /dashboard
 * - /library
 * - /editor
 * - /details
 */

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  // If no user, middleware will redirect to /login
  // But we also check here for server-side protection
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Skip to main content - Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 bg-[#a78bfa] text-[#09090b] rounded-lg font-semibold"
      >
        Saltar al contenido principal
      </a>

      {/* Sidebar - Desktop & Mobile */}
      <Sidebar user={user} />

      {/* Navbar - Mobile only */}
      <header className="sticky top-0 z-50 w-full bg-[#09090b]/95 backdrop-blur border-b border-[#27272a] md:hidden">
        <div className="flex h-14 items-center px-4">
          <div className="flex-1 max-w-xl mx-auto w-full">
            <SearchBox />
          </div>
        </div>
      </header>

      {/* Main content - offset for sidebar on desktop */}
      <main
        id="main-content"
        className="md:ml-64 pt-14 md:pt-0 min-h-screen"
      >
        {children}
      </main>
    </div>
  );
}