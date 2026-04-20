"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
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

          {/* User Menu */}
          <div className="flex items-center gap-4">
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