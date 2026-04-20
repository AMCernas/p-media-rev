import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase";
import { Navbar } from "@/components/layout/navbar";

/**
 * Main App Layout - Protected routes with Navbar
 * 
 * All routes in (main) group require authentication.
 * This layout provides the Navbar with user info.
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
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <main className="flex-1">{children}</main>
    </div>
  );
}