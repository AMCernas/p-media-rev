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
import { getMovieDetails, getSeriesDetails, getTMDBImageUrl } from '@/lib/tmdb';
import { getBookDetails } from '@/lib/books';
import { LibraryClient } from './library-client';
import type { MediaType, Review } from '@/lib/types';

interface SearchParams {
  page?: string;
  search?: string;
}

/**
 * Enrich watchlist items with metadata from external APIs
 */
async function enrichWatchlistItems(
  items: Array<{ id: string; mediaId: string; mediaType: MediaType }>
): Promise<Array<{ id: string; mediaId: string; mediaType: MediaType; title?: string; imageUrl?: string | null; year?: string }>> {
  const enriched = await Promise.all(
    items.map(async (item) => {
      try {
        if (item.mediaType === 'MOVIE') {
          const details = await getMovieDetails(item.mediaId);
          return {
            id: item.id,
            mediaId: item.mediaId,
            mediaType: item.mediaType,
            title: details.title,
            imageUrl: getTMDBImageUrl(details.poster_path, 'w185'),
            year: details.release_date ? details.release_date.split('-')[0] : undefined,
          };
        } else if (item.mediaType === 'SERIES') {
          const details = await getSeriesDetails(item.mediaId);
          return {
            id: item.id,
            mediaId: item.mediaId,
            mediaType: item.mediaType,
            title: details.name,
            imageUrl: getTMDBImageUrl(details.poster_path, 'w185'),
            year: details.first_air_date ? details.first_air_date.split('-')[0] : undefined,
          };
        } else if (item.mediaType === 'BOOK') {
          const details = await getBookDetails(item.mediaId);
          const imageUrl = details.volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://') || null;
          return {
            id: item.id,
            mediaId: item.mediaId,
            mediaType: item.mediaType,
            title: details.volumeInfo.title,
            imageUrl,
            year: details.volumeInfo.publishedDate?.split('-')[0],
          };
        }
      } catch (error) {
        console.warn(`Failed to enrich ${item.mediaType} ${item.mediaId}:`, error);
      }
      // Return basic item if enrichment fails
      return {
        id: item.id,
        mediaId: item.mediaId,
        mediaType: item.mediaType,
      };
    })
  );
  return enriched;
}

/**
 * Enrich review items (not watchlist) with metadata from external APIs
 * Casts to Review type after fetching metadata
 */
async function enrichReviews(
  items: Review[]
): Promise<Review[]> {
  const enriched = await Promise.all(
    items.map(async (item) => {
      try {
        if (item.mediaType === 'MOVIE') {
          const details = await getMovieDetails(item.mediaId);
          return {
            ...item,
            title: details.title,
            imageUrl: getTMDBImageUrl(details.poster_path, 'w185'),
            year: details.release_date ? details.release_date.split('-')[0] : undefined,
          } as Review;
        } else if (item.mediaType === 'SERIES') {
          const details = await getSeriesDetails(item.mediaId);
          return {
            ...item,
            title: details.name,
            imageUrl: getTMDBImageUrl(details.poster_path, 'w185'),
            year: details.first_air_date ? details.first_air_date.split('-')[0] : undefined,
          } as Review;
        } else if (item.mediaType === 'BOOK') {
          const details = await getBookDetails(item.mediaId);
          const imageUrl = details.volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://') || null;
          return {
            ...item,
            title: details.volumeInfo.title,
            imageUrl,
            year: details.volumeInfo.publishedDate?.split('-')[0],
          } as Review;
        }
      } catch (error) {
        console.warn(`Failed to enrich ${item.mediaType} ${item.mediaId}:`, error);
      }
      // Return basic item if enrichment fails
      return item;
    })
  );
  return enriched as Review[];
}

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

  // Fetch watchlist (not paginated - kept as before)
  const watchlistRaw = await prisma.review.findMany({
    where: { userId: user.id, status: 'WATCHLIST' },
    orderBy: { updatedAt: 'desc' },
  });
  const watchlist = await enrichWatchlistItems(watchlistRaw);

  // Fetch reviews (paginated via API-like query)
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
  const enrichedReviews = await enrichReviews(reviewsTyped);
  const totalPages = Math.ceil(totalReviews / limit);
  const hasMore = page < totalPages;

  // Pass data to client component
  return (
    <LibraryClient
      initialReviews={enrichedReviews}
      watchlistItems={watchlist}
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