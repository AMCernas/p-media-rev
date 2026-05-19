/**
 * Settings - User preferences page
 * 
 * Requirements from spec:
 * - Profile name for personalized greeting
 * - Preferred language for TMDB API calls
 * - Default library sort order
 * 
 * Server Component: fetches settings from DB, renders client form
 */
export const dynamic = 'force-dynamic';

import { getAuthenticatedUser } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';
import { SettingsClient } from './settings-client';

interface UserSettings {
  id: string;
  userId: string;
  profileName: string | null;
  preferredLanguage: string;
  librarySort: string;
}

/**
 * Fetch user settings from DB (auto-create if not exists using upsert)
 */
async function getUserSettings(userId: string): Promise<UserSettings> {
  return prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      profileName: null,
      preferredLanguage: 'es-ES',
      librarySort: 'updatedAt_desc',
    },
  });
}

export default async function SettingsPage() {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-[#fafafa]">Settings</h1>
        <p className="text-[#a1a1aa] mt-2">Please log in to access settings.</p>
      </div>
    );
  }
  
  const settings = await getUserSettings(user.id);
  
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-[#fafafa] mb-2">Configuración</h1>
        <p className="text-[#a1a1aa] mb-6">
          Personaliza tu experiencia en Screen Review
        </p>
        
        <SettingsClient
          initialSettings={{
            profileName: settings.profileName || '',
            preferredLanguage: settings.preferredLanguage,
            librarySort: settings.librarySort,
          }}
        />
      </div>
    </div>
  );
}