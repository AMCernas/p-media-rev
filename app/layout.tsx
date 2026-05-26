import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from '@/lib/theme-context';
import { createSupabaseServerClient } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Shelf - Tu biblioteca de películas, series y libros",
  description: "Reseña y organiza tu contenido favorito",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read user's theme preference from DB to avoid flash
  let initialTheme: 'dark' | 'light' = 'dark';
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const settings = await prisma.userSettings.findUnique({
        where: { userId: user.id },
        select: { theme: true },
      });
      if (settings?.theme === 'light') initialTheme = 'light';
    }
  } catch {
    // Silently fall back to dark if DB/auth unavailable
  }

  return (
    <html lang="es" className={`${dmSans.variable} ${jetbrainsMono.variable} h-full antialiased dark`} suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..900;1,9..40,100..900&family=JetBrains+Mono:wght@100..800&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-20..48&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider initialTheme={initialTheme}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
