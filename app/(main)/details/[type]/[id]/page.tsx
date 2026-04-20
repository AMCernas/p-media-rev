/**
 * Media Detail Page
 * 
 * Shows metadata and actions for movies, series, or books.
 * 
 * Requirements from spec (REQ-MD-1 to REQ-MD-4):
 * - REQ-MD-1: Get metadata from TMDB or Google Books API
 * - REQ-MD-2: Display: title, image, description, date, genres
 * - REQ-MD-3: "Agregar a Watchlist" button
 * - REQ-MD-4: "Escribir Reseña" button that redirects to editor
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getMovieDetails, getSeriesDetails, getTMDBImageUrl } from '@/lib/tmdb';
import { getBookDetails, getBookCoverUrl } from '@/lib/books';
import { getAuthenticatedUser } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';
import { DetailHero } from '@/components/features/detail-hero';
import { WatchlistButton } from '@/components/features/watchlist-button';
import { cn } from '@/lib/utils';
import type { MediaType } from '@/lib/types';

interface DetailsPageProps {
  params: Promise<{
    type: string;
    id: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/** Unified media data for rendering */
interface MediaData {
  id: string;
  title: string;
  subtitle?: string;
  overview?: string;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  year?: string;
  rating?: number | null;
  genres: string[];
  mediaType: 'movie' | 'series' | 'book';
  mediaTypeLabel: string;
}

/** Fetch media data from TMDB or Google Books based on type */
async function fetchMediaData(type: string, id: string): Promise<MediaData> {
  if (type === 'movie') {
    const data = await getMovieDetails(id);
    const genres = data.genres.map(g => g.name);
    const year = data.release_date ? data.release_date.split('-')[0] : undefined;
    
    return {
      id: String(data.id),
      title: data.title,
      subtitle: data.tagline || undefined,
      overview: data.overview || undefined,
      posterUrl: getTMDBImageUrl(data.poster_path),
      backdropUrl: getTMDBImageUrl(data.backdrop_path, 'original'),
      year,
      rating: data.vote_average > 0 ? data.vote_average : undefined,
      genres,
      mediaType: 'movie',
      mediaTypeLabel: 'Película',
    };
  }
  
  if (type === 'series') {
    const data = await getSeriesDetails(id);
    const genres = data.genres.map(g => g.name);
    const year = data.first_air_date ? data.first_air_date.split('-')[0] : undefined;
    
    return {
      id: String(data.id),
      title: data.name,
      subtitle: data.tagline || undefined,
      overview: data.overview || undefined,
      posterUrl: getTMDBImageUrl(data.poster_path),
      backdropUrl: getTMDBImageUrl(data.backdrop_path, 'original'),
      year,
      rating: data.vote_average > 0 ? data.vote_average : undefined,
      genres,
      mediaType: 'series',
      mediaTypeLabel: 'Serie',
    };
  }
  
  if (type === 'book') {
    const data = await getBookDetails(id);
    const volumeInfo = data.volumeInfo;
    const genres = volumeInfo.categories || [];
    const year = volumeInfo.publishedDate ? volumeInfo.publishedDate.split('-')[0] : undefined;
    const posterUrl = volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || null;
    
    return {
      id: data.id,
      title: volumeInfo.title,
      subtitle: volumeInfo.subtitle,
      overview: volumeInfo.description?.replace(/<[^>]*>/g, '') || undefined,
      posterUrl,
      backdropUrl: posterUrl, // Use same for backdrop
      year,
      rating: volumeInfo.averageRating || undefined,
      genres,
      mediaType: 'book',
      mediaTypeLabel: 'Libro',
    };
  }
  
  throw new Error(`Unknown type: ${type}`);
}

/** Check if media is in user's watchlist */
async function checkWatchlistStatus(userId: string, mediaId: string, mediaType: MediaType): Promise<boolean> {
  const existing = await prisma.review.findFirst({
    where: {
      userId,
      mediaId,
      mediaType,
      status: 'WATCHLIST',
    },
  });
  
  return !!existing;
}

export default async function DetailsPage({ params, searchParams }: DetailsPageProps) {
  const resolved = await params;
  const { type, id } = resolved;
  
  // Validate type
  if (!['movie', 'series', 'book'].includes(type)) {
    notFound();
  }
  
  // Fetch media data
  let mediaData: MediaData;
  try {
    mediaData = await fetchMediaData(type, id);
  } catch (error) {
    console.error('Error fetching media data:', error);
    notFound();
  }
  
  // Check auth and watchlist status
  let isInWatchlist = false;
  let user: { id: string } | null = null;
  
  try {
    user = await getAuthenticatedUser();
    if (user) {
      const mediaType: MediaType = type === 'movie' ? 'MOVIE' : type === 'series' ? 'SERIES' : 'BOOK';
      isInWatchlist = await checkWatchlistStatus(user.id, id, mediaType);
    }
  } catch (error) {
    // Non-auth users can still view details
    console.error('Auth check error:', error);
  }
  
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <DetailHero
        title={mediaData.title}
        subtitle={mediaData.subtitle}
        backdropUrl={mediaData.backdropUrl}
        posterUrl={mediaData.posterUrl}
        year={mediaData.year}
        rating={mediaData.rating}
        genres={mediaData.genres}
        overview={mediaData.overview}
        mediaTypeLabel={mediaData.mediaTypeLabel}
      />
      
      {/* Actions Section */}
      <div className="container px-4 py-8">
        <div className="flex flex-wrap gap-4 justify-center">
          {/* Watchlist Button - only for authenticated users */}
          {user && (
            <WatchlistButton
              mediaId={id}
              mediaType={type === 'movie' ? 'MOVIE' : type === 'series' ? 'SERIES' : 'BOOK'}
              isInWatchlist={isInWatchlist}
            />
          )}
          
          {/* Write Review Button - for all users */}
          <Link
            href={`/editor?mediaId=${id}&mediaType=${type.toUpperCase()}`}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'transition-colors'
            )}
          >
            <span>✎</span>
            <span>Escribir Reseña</span>
          </Link>
        </div>
        
        {mediaData.overview && (
          <div className="mt-12 max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Sinopsis</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {mediaData.overview}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}