"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

/**
 * Login Page - Auth with email/password
 * 
 * Uses Supabase Auth directly from client side.
 * Redirects to /dashboard on success.
 * 
 * Requirements from spec (REQ-UA-1 to REQ-UA-4):
 * - Form with email and password fields
 * - Validate credentials against Supabase Auth
 * - Maintain session via cookie
 * - Show auth state in UI
 */

// Factory function to get Supabase client - only called when needed
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      // Login successful - redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#fafafa]">
            Screen Review
          </h1>
          <p className="mt-2 text-sm text-[#a1a1aa]">
            Inicia sesión en tu cuenta
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-[#fafafa]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={cn(
                "flex h-10 w-full rounded-lg border border-[#27272a] bg-[#121215] px-3 py-2 text-sm text-[#fafafa]",
                "placeholder:text-[#a1a1aa]",
                "focus:outline-none focus:ring-2 focus:ring-[#a78bfa] focus:ring-offset-2 focus:ring-offset-[#09090b]",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-[#fafafa]"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={cn(
                "flex h-10 w-full rounded-lg border border-[#27272a] bg-[#121215] px-3 py-2 text-sm text-[#fafafa]",
                "placeholder:text-[#a1a1aa]",
                "focus:outline-none focus:ring-2 focus:ring-[#a78bfa] focus:ring-offset-2 focus:ring-offset-[#09090b]",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 p-3 text-sm text-[#ef4444]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full h-10 rounded-lg bg-[#a78bfa] text-[#09090b] px-4 py-2 text-sm font-semibold",
              "hover:bg-[#a78bfa]/90",
              "disabled:pointer-events-none disabled:opacity-50",
              "transition-colors"
            )}
          >
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}