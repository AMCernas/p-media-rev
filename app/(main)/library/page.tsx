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
 * This is a Server Component that fetches data on the server
 */

import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';
import { getMovieDetails, getSeriesDetails, getTMDBImageUrl } from '@/lib/tmdb';
import { getBookDetails } from '@/lib/books';
import { LibraryClient } from './library-client';
import type { MediaType, Review } from '@/lib/types';

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

  // Cast to proper type to avoid Prisma enum mismatch
  const reviewsTyped = reviews as unknown as Review[];

  // Separate into watchlist and reviews
  const watchlistRaw = reviewsTyped.filter(r => r.status === 'WATCHLIST');
  const drafts = reviewsTyped.filter(r => r.status === 'DRAFT');
  const published = reviewsTyped.filter(r => r.status === 'COMPLETED');

  // Enrich watchlist items with metadata
  const watchlist = await enrichWatchlistItems(watchlistRaw);

  // Enrich review items (drafts + published) with metadata
  const reviewItems = reviewsTyped.filter(r => r.status !== 'WATCHLIST');
  const enrichedReviews = await enrichReviews(reviewItems);

  // Pass data to client component
  return (
    <LibraryClient
      initialReviews={enrichedReviews}
      watchlistItems={watchlist}
      watchlistCount={watchlist.length}
      draftsCount={drafts.length}
      publishedCount={published.length}
    />
  );
}