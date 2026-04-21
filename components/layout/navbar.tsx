"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/features/search-box";
import { cn } from "@/lib/utils";

/**
 * Navbar - Main navigation with auth state
 * 
 * Shows:
 * - Logo/brand
 * - User menu with name
 * - Sign out button
 * 
 * Requirements from spec (REQ-UA-4):
 * - Show auth state in UI
 */

// Factory function to get Supabase client - only called when needed
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

interface NavbarProps {
  user?: {
    email?: string;
    user_metadata?: {
      full_name?: string;
    };
  } | null;
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const userName = user?.user_metadata?.full_name || user?.email || "User";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4">
        <div className="flex flex-1 items-center justify-between">
          {/* Logo */}
          <a
            href="/dashboard"
            className="flex items-center space-x-2 text-lg font-bold"
          >
            Screen Review
          </a>

          {/* Search - Center (hidden on small screens) */}
          <div className="hidden md:flex flex-1 justify-center px-4">
            <SearchBox />
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {/* Mobile search icon - shown only on small screens */}
            <button
              type="button"
              className="md:hidden p-2 text-muted-foreground"
              onClick={() => {
                // TODO: Open mobile search modal
              }}
            >
              <svg
                className="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {userName}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className={cn("text-sm")}
            >
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}