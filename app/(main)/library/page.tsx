/**
 * Library - User's watchlist and published reviews
 * 
 * Requirements from spec (REQ-UL-1 to REQ-UL-5):
 * - List all user items (watchlist + reviews)
 * - Filter by type (MOVIE, SERIES, BOOK)
 * - Filter by status (DRAFT, PUBLISHED, WATCHLIST)
 * - Combined filters
 * - Show rating for published reviews
 * 
 * This is a Server Component that fetches data on the server
 */

import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';
import { LibraryClient } from './library-client';

export default async function LibraryPage() {
  // Check authentication
  const user = await getAuthenticatedUser();
  
  if (!user) {
    redirect('/login');
  }

  // Fetch user's reviews (watchlist + reviews)
  const reviews = await prisma.review.findMany({
    where: {
      userId: user.id,
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  // Separate into watchlist and reviews
  const watchlist = reviews.filter(r => r.status === 'WATCHLIST');
  const drafts = reviews.filter(r => r.status === 'DRAFT');
  const published = reviews.filter(r => r.status === 'PUBLISHED');

  // Pass data to client component
  return (
    <LibraryClient
      initialReviews={reviews}
      watchlistCount={watchlist.length}
      draftsCount={drafts.length}
      publishedCount={published.length}
    />
  );
}