"use client";

import { useState } from "react";
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
  const [isOpen, setIsOpen] = useState(false);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuario";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile hamburger button - refined */}
      <button
        type="button"
        aria-label="Abrir menú"
        onClick={toggleSidebar}
        className={cn(
          "fixed top-16 left-3 z-50",
          "w-10 h-10 flex items-center justify-center",
          "rounded-lg bg-[#121215]/90 backdrop-blur-sm",
          "border border-white/10 text-[#fafafa]",
          "hover:bg-[#18181b] hover:border-white/20",
          "transition-all duration-200 ease-out",
          "md:hidden",
          isOpen && "opacity-0 pointer-events-none"
        )}
      >
        <span className="material-symbols-outlined text-2xl leading-none">menu</span>
      </button>

      {/* Close button when sidebar is open */}
      <button
        type="button"
        aria-label="Cerrar menú"
        onClick={closeSidebar}
        className={cn(
          "fixed top-16 left-3 z-50",
          "w-10 h-10 flex items-center justify-center",
          "rounded-lg bg-[#121215]/90 backdrop-blur-sm",
          "border border-white/10 text-[#fafafa]",
          "hover:bg-[#18181b] hover:border-white/20",
          "transition-all duration-200 ease-out",
          "md:hidden",
          !isOpen && "opacity-0 pointer-events-none"
        )}
      >
        <span className="material-symbols-outlined text-2xl leading-none">close</span>
      </button>

      {/* Sidebar - enhanced animation & styling */}
      <aside
        id="sidebar"
        className={cn(
          "fixed left-0 top-16 z-40",
          "w-64 h-[calc(100vh-4rem)]",
          "bg-[#0c0c0f]/95 backdrop-blur-md",
          "border-r border-white/[0.08]",
          "flex flex-col",
          // Mobile animation
          "md:top-0 md:h-full md:translate-x-0",
          "transition-all duration-300 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: visible by default
          "md:translate-x-0"
        )}
        style={{
          boxShadow: isOpen ? "4px 0 24px rgba(0,0,0,0.4)" : "none"
        }}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08]">
          <Link href="/dashboard" className="flex items-center gap-3 group" onClick={closeSidebar}>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center shadow-lg shadow-[#a78bfa]/20">
              <span className="material-symbols-outlined text-[#09090b] text-xl">movie</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#fafafa] tracking-tight">Screen Review</h1>
              <p className="text-xs text-[#71717a]">Tu biblioteca</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4">
          <div className="space-y-1">
            {navItems.map((item, index) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSidebar}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg",
                    "transition-all duration-200 ease-out",
                    "hover:translate-x-1",
                    isActive
                      ? "bg-gradient-to-r from-[#a78bfa]/15 to-transparent text-[#a78bfa] border-l-2 border-[#a78bfa]"
                      : "text-[#a1a1aa] hover:bg-white/[0.05] hover:text-[#fafafa] border-l-2 border-transparent"
                  )}
                >
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User section */}
        {user && (
          <div className="p-4 mt-auto border-t border-white/[0.08]">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.03] mb-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] flex items-center justify-center text-[#09090b] font-semibold text-sm shadow-lg shadow-[#a78bfa]/30">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#fafafa] truncate">{userName}</p>
                <p className="text-xs text-[#71717a] truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
                "text-sm font-medium text-[#71717a]",
                "bg-white/[0.03] hover:bg-red-500/10 hover:text-red-400 border border-white/[0.05]",
                "transition-all duration-200"
              )}
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              Cerrar sesión
            </button>
          </div>
        )}
      </aside>

      {/* Mobile overlay - refined backdrops */}
      <div
        className={cn(
          "fixed inset-0 z-30",
          "bg-black/60 backdrop-blur-sm",
          "transition-all duration-300 ease-out",
          "md:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={closeSidebar}
      />
    </>
  );
}