/**
 * Library - User's watchlist and published reviews
 * 
 * Requirements from spec (REQ-UL-1 to REQ-UL-5):
 * - List all user items (watchlist + reviews)
 * - Filter by type (MOVIE, SERIES, BOOK)
 * - Filter by status (DRAFT, COMPLETED, WATCHLIST)
 * - Combined filters
 * - Show rating for published reviews
 * 
 * New features:
 * - Pagination for reviews (Load More)
 * - Search by title
 * 
 * This is a Server Component that fetches data on the server
 */

import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';
import { enrichReviewItems, enrichWatchlistItems } from '@/lib/enrich';
import { LibraryClient } from './library-client';
import type { MediaType, Review } from '@/lib/types';

interface SearchParams {
  page?: string;
  search?: string;
}

// Use centralized enrichment from lib/enrich
// Wrapper para mantener compatibilidad de tipos

export default async function LibraryPage(props: { searchParams: Promise<SearchParams> }) {
  // Check authentication
  const user = await getAuthenticatedUser();
  
  if (!user) {
    redirect('/login');
  }

  // Resolve search params
  const searchParams = await props.searchParams;
  const page = parseInt(searchParams.page || '1', 10);
  const search = searchParams.search || '';

  // Fetch counts (for stats display - not paginated)
  const [watchlistCount, draftsCount, publishedCount] = await Promise.all([
    prisma.review.count({ where: { userId: user.id, status: 'WATCHLIST' } }),
    prisma.review.count({ where: { userId: user.id, status: 'DRAFT' } }),
    prisma.review.count({ where: { userId: user.id, status: 'COMPLETED' } }),
  ]);

  // Fetch watchlist (limit to 6 items for "Todo" view)
  const watchlistRaw = await prisma.review.findMany({
    where: { userId: user.id, status: 'WATCHLIST' },
    orderBy: { updatedAt: 'desc' },
    take: 6, // Limit to 6 for "Todo" view
  });
  const watchlist = await enrichWatchlistItems(watchlistRaw);

  // Fetch reviews (paginated - 12 items per page)
  const limit = 12;
  const skip = (page - 1) * limit;
  
  const [reviewsRaw, totalReviews] = await Promise.all([
    prisma.review.findMany({
      where: { 
        userId: user.id,
        status: { not: 'WATCHLIST' },
        // Search by title (if available)
        ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.review.count({
      where: { 
        userId: user.id,
        status: { not: 'WATCHLIST' },
        ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
      },
    }),
  ]);

  const reviewsTyped = reviewsRaw as unknown as Review[];
  const enrichedReviews = await enrichReviewItems(reviewsTyped) as any;
  const totalPages = Math.ceil(totalReviews / limit);
  const hasMore = page < totalPages;

  // Pass data to client component
  return (
    <LibraryClient
      initialReviews={enrichedReviews as any}
      watchlistItems={watchlist as any}
      watchlistCount={watchlistCount}
      draftsCount={draftsCount}
      publishedCount={publishedCount}
      // New pagination props
      initialPage={page}
      initialSearch={search}
      totalReviews={totalReviews}
      hasMore={hasMore}
    />
  );
}