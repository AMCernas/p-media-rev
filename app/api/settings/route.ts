/**
 * Settings API Route
 * 
 * Handles CRUD operations for user settings.
 * 
 * Endpoints:
 * - GET /api/settings - Get user settings (auto-create if missing)
 * - PATCH /api/settings - Update user settings (upsert pattern)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';

interface UpdateSettingsBody {
  profileName?: string;
  preferredLanguage?: string;
  librarySort?: string;
  theme?: string;
}

const VALID_LANGUAGES = ['es-ES', 'en-US'];
const VALID_SORTS = ['updatedAt_desc', 'updatedAt_asc', 'rating_desc', 'title_asc'];
const VALID_THEMES = ['dark', 'light'];

/**
 * GET /api/settings - Get user settings
 * 
 * Auto-creates UserSettings with defaults if not exists.
 * Returns: { id, userId, profileName, preferredLanguage, librarySort, createdAt, updatedAt }
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Try to get existing settings
    let settings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });
    
    // Auto-create if doesn't exist
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: user.id,
          profileName: null,
          preferredLanguage: 'es-ES',
          librarySort: 'updatedAt_desc',
        },
      });
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('GET /api/settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/settings - Update user settings
 * 
 * Body: { profileName?, preferredLanguage?, librarySort? }
 * Uses upsert pattern - creates if not exists, updates if exists.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body: UpdateSettingsBody = await request.json();
    const { profileName, preferredLanguage, librarySort, theme } = body;
    
    // Validate preferredLanguage if provided
    if (preferredLanguage && !VALID_LANGUAGES.includes(preferredLanguage)) {
      return NextResponse.json(
        { error: `Invalid preferredLanguage. Must be one of: ${VALID_LANGUAGES.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Validate librarySort if provided
    if (librarySort && !VALID_SORTS.includes(librarySort)) {
      return NextResponse.json(
        { error: `Invalid librarySort. Must be one of: ${VALID_SORTS.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Validate theme if provided
    if (theme && !VALID_THEMES.includes(theme)) {
      return NextResponse.json(
        { error: `Invalid theme. Must be one of: ${VALID_THEMES.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Build update data (only include provided fields)
    const updateData: any = {};
    if (profileName !== undefined) updateData.profileName = profileName;
    if (preferredLanguage !== undefined) updateData.preferredLanguage = preferredLanguage;
    if (librarySort !== undefined) updateData.librarySort = librarySort;
    if (theme !== undefined) updateData.theme = theme;
    
    // Upsert: update if exists, create if not
    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        profileName: profileName ?? null,
        preferredLanguage: preferredLanguage ?? 'es-ES',
        librarySort: librarySort ?? 'updatedAt_desc',
        theme: theme ?? 'dark',
      },
    });
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('PATCH /api/settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}