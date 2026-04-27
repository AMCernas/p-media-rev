"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Biblioteca", href: "/library", icon: "library_books" },
  { label: "Editor", href: "/editor", icon: "edit_note" },
];

interface SidebarProps {
  user?: {
    email?: string;
    user_metadata?: {
      full_name?: string;
    };
  } | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuario";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#121215] border border-[#27272a] text-[#fafafa] md:hidden"
        onClick={() => {
          const sidebar = document.getElementById("sidebar");
          if (sidebar) {
            sidebar.classList.toggle("translate-x-0");
            sidebar.classList.toggle("-translate-x-full");
          }
        }}
      >
        <span className="material-symbols-outlined text-xl">menu</span>
      </button>

      {/* Sidebar */}
      <aside
        id="sidebar"
        className="fixed left-0 top-0 h-full w-64 bg-[#0c0c0f] border-r border-[#27272a] flex flex-col z-40 
                   transform -translate-x-full md:translate-x-0 transition-transform duration-300"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#27272a]">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#a78bfa] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#09090b] text-xl">movie</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#fafafa]">Screen Review</h1>
              <p className="text-xs text-[#a1a1aa]">Tu biblioteca</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive
                    ? "bg-[#a78bfa]/10 text-[#a78bfa] border-l-2 border-[#a78bfa]"
                    : "text-[#a1a1aa] hover:bg-[#0f0f12] hover:text-[#fafafa]"
                )}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        {user && (
          <div className="p-4 border-t border-[#27272a]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-[#a78bfa] flex items-center justify-center text-[#09090b] font-semibold text-sm">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#fafafa] truncate">{userName}</p>
                <p className="text-xs text-[#a1a1aa] truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg",
                "text-sm font-medium text-[#a1a1aa]",
                "hover:bg-[#18181b] hover:text-[#fafafa]",
                "transition-colors duration-150"
              )}
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              Cerrar sesión
            </button>
          </div>
        )}
      </aside>

      {/* Overlay for mobile */}
      <div
        id="sidebar-overlay"
        className="fixed inset-0 bg-black/50 z-30 hidden md:hidden"
        onClick={() => {
          const sidebar = document.getElementById("sidebar");
          const overlay = document.getElementById("sidebar-overlay");
          sidebar?.classList.add("-translate-x-full");
          sidebar?.classList.remove("translate-x-0");
          overlay?.classList.add("hidden");
        }}
      />
    </>
  );
}