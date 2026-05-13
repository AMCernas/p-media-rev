/**
 * Enriquecimiento de reviews con metadata de APIs externas
 * 
 * Centraliza la lógica de enriquecimiento para evitar duplicación.
 * Usa TMDB para movies/series y Google Books para books.
 */

import { getMovieDetails, getSeriesDetails, getTMDBImageUrl } from '@/lib/tmdb';
import { getBookDetails } from '@/lib/books';
import type { MediaType } from '@/lib/types';

export interface ReviewItem {
  id: string;
  mediaId: string;
  mediaType: MediaType | string;
  status?: string;
  rating?: number | null;
  content?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EnrichedReviewItem extends ReviewItem {
  title?: string | null;
  imageUrl?: string | null;
  year?: string;
}

/**
 * Enriquecer un solo item con metadata de APIs externas
 */
export async function enrichReviewItem(item: ReviewItem): Promise<EnrichedReviewItem> {
  try {
    if (item.mediaType === 'MOVIE') {
      const details = await getMovieDetails(item.mediaId);
      return {
        ...item,
        title: details.title,
        imageUrl: getTMDBImageUrl(details.poster_path, 'w185'),
        year: details.release_date ? details.release_date.split('-')[0] : undefined,
      };
    } else if (item.mediaType === 'SERIES') {
      const details = await getSeriesDetails(item.mediaId);
      return {
        ...item,
        title: details.name,
        imageUrl: getTMDBImageUrl(details.poster_path, 'w185'),
        year: details.first_air_date ? details.first_air_date.split('-')[0] : undefined,
      };
    } else if (item.mediaType === 'BOOK') {
      const details = await getBookDetails(item.mediaId);
      const imageUrl = details.volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://') || null;
      return {
        ...item,
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
    ...item,
    title: undefined,
    imageUrl: undefined,
    year: undefined,
  };
}

/**
 * Enriquecer múltiples items en paralelo
 */
export async function enrichReviewItems(items: ReviewItem[]): Promise<EnrichedReviewItem[]> {
  return Promise.all(items.map(enrichReviewItem));
}

/**
 * Enriquecer solo watchlist items (sin status, rating, content)
 */
export async function enrichWatchlistItems(
  items: Array<{ id: string; mediaId: string; mediaType: MediaType | string }>
): Promise<Array<{ id: string; mediaId: string; mediaType: string; title?: string; imageUrl?: string | null; year?: string }>> {
  return Promise.all(
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
      return {
        id: item.id,
        mediaId: item.mediaId,
        mediaType: item.mediaType,
      };
    })
  );
}