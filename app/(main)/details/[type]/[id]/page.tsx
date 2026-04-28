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
import { getMovieDetails, getSeriesDetails, getTMDBImageUrl, getMovieCredits, getSeriesCredits, type TMDbCredits, type TMDbSeason } from '@/lib/tmdb';
import { getBookDetails, getBookCoverUrl } from '@/lib/books';
import { getAuthenticatedUser } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';
import { DetailHero } from '@/components/features/detail-hero';
import { WatchlistButton } from '@/components/features/watchlist-button';
import { SeasonsEpisodes } from '@/components/features/seasons-episodes';
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
  // Additional details
  runtime?: number | null;
  releaseDate?: string;
  status?: string;
  productionCompany?: string;
  originalLanguage?: string;
  firstAirDate?: string;
  lastAirDate?: string;
  episodeRuntime?: number[];
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  credits?: TMDbCredits | null;
  seasons?: TMDbSeason[];
}

/** Get language name from code */
function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    en: 'Inglés',
    es: 'Español',
    ja: 'Japonés',
    ko: 'Coreano',
    fr: 'Francés',
    de: 'Alemán',
    it: 'Italiano',
    pt: 'Portugués',
    zh: 'Chino',
    hi: 'Hindi',
    ru: 'Ruso',
    ar: 'Árabe',
    th: 'Tailandés',
    sv: 'Sueco',
    da: 'Danés',
    no: 'Noruego',
    fi: 'Finés',
    nl: 'Holandés',
    pl: 'Polaco',
    tr: 'Turco',
    el: 'Griego',
    he: 'Hebreo',
    id: 'Indonesio',
    vi: 'Vietnamita',
    cs: 'Checo',
    hu: 'Húngaro',
    ro: 'Rumano',
    uk: 'Ucraniano',
  };
  return languages[code] || code.toUpperCase();
}

/** Get status display text */
function getStatusText(status: string): string {
  const statuses: Record<string, string> = {
    'Released': 'Estrenada',
    'Returning': 'En emisión',
    'Ended': 'Finalizada',
    'Planned': 'Planificada',
    'In Production': 'En producción',
    'Post Production': 'Post-producción',
    'Canceled': 'Cancelada',
    'Pilot': 'Piloto',
  };
  return statuses[status] || status;
}

/** Format date for display */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Fetch media data from TMDB or Google Books based on type */
async function fetchMediaData(type: string, id: string): Promise<MediaData> {
  if (type === 'movie') {
    const [data, credits] = await Promise.all([
      getMovieDetails(id),
      getMovieCredits(id).catch(() => null),
    ]);
    const genres = data.genres.map(g => g.name);
    const productionCompany = data.production_companies[0]?.name || undefined;
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
      runtime: data.runtime,
      releaseDate: data.release_date,
      status: data.status,
      productionCompany,
      originalLanguage: data.original_language,
      credits,
    };
  }
  
  if (type === 'series') {
    const [data, credits] = await Promise.all([
      getSeriesDetails(id),
      getSeriesCredits(id).catch(() => null),
    ]);
    const genres = data.genres.map(g => g.name);
    const productionCompany = data.production_companies[0]?.name || undefined;
    const year = data.first_air_date ? data.first_air_date.split('-')[0] : undefined;
    
    // Get seasons info
    const seasons = data.seasons
      ?.filter((s: TMDbSeason) => s.season_number > 0) // Filter out specials
      .map((s: TMDbSeason) => ({
        id: s.id,
        name: s.name,
        season_number: s.season_number,
        overview: s.overview,
        air_date: s.air_date,
        poster_path: s.poster_path,
        episode_count: s.episode_count,
      })) || [];
    
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
      firstAirDate: data.first_air_date,
      lastAirDate: data.last_air_date,
      episodeRuntime: data.episode_run_time,
      status: data.status,
      numberOfSeasons: data.number_of_seasons,
      numberOfEpisodes: data.number_of_episodes,
      productionCompany,
      originalLanguage: data.original_language,
      credits,
      seasons,
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
      backdropUrl: posterUrl,
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

/** Info Section Component */
function InfoSection({ mediaData }: { mediaData: MediaData }) {
  const isMovie = mediaData.mediaType === 'movie';
  const isSeries = mediaData.mediaType === 'series';
  
  // Determine what info to show
  const infoItems: Array<{ label: string; value: string; icon: string }> = [];
  
  if (isMovie) {
    if (mediaData.runtime) infoItems.push({ label: 'Duración', value: `${mediaData.runtime} min`, icon: 'schedule' });
    if (mediaData.releaseDate) infoItems.push({ label: 'Estreno', value: formatDate(mediaData.releaseDate), icon: 'calendar_month' });
    if (mediaData.status) infoItems.push({ label: 'Estado', value: getStatusText(mediaData.status), icon: 'info' });
    if (mediaData.productionCompany) infoItems.push({ label: 'Productora', value: mediaData.productionCompany, icon: 'business' });
    if (mediaData.originalLanguage) infoItems.push({ label: 'Idioma', value: getLanguageName(mediaData.originalLanguage), icon: 'language' });
  }
  
  if (isSeries) {
    if (mediaData.numberOfSeasons) infoItems.push({ label: 'Temporadas', value: String(mediaData.numberOfSeasons), icon: 'tv' });
    if (mediaData.numberOfEpisodes) infoItems.push({ label: 'Episodios', value: String(mediaData.numberOfEpisodes), icon: 'playlist_play' });
    if (mediaData.episodeRuntime?.[0]) infoItems.push({ label: 'Duración ep.', value: `${mediaData.episodeRuntime[0]} min`, icon: 'schedule' });
    if (mediaData.firstAirDate) infoItems.push({ label: 'Primera emisión', value: formatDate(mediaData.firstAirDate), icon: 'calendar_month' });
    if (mediaData.lastAirDate) infoItems.push({ label: 'Última emisión', value: formatDate(mediaData.lastAirDate), icon: 'event' });
    if (mediaData.status) infoItems.push({ label: 'Estado', value: getStatusText(mediaData.status), icon: 'info' });
    if (mediaData.productionCompany) infoItems.push({ label: 'Productora', value: mediaData.productionCompany, icon: 'business' });
    if (mediaData.originalLanguage) infoItems.push({ label: 'Idioma', value: getLanguageName(mediaData.originalLanguage), icon: 'language' });
  }
  
  if (infoItems.length === 0) return null;
  
  return (
    <div className="mt-12 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold text-[#fafafa] mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-[#a78bfa]">info</span>
        Información
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {infoItems.map((item) => (
          <div key={item.label} className="bg-[#121215] border border-[#27272a] rounded-lg p-3">
            <div className="flex items-center gap-2 text-[#a1a1aa] text-sm mb-1">
              <span className="material-symbols-outlined text-base">{item.icon}</span>
              {item.label}
            </div>
            <div className="text-[#fafafa] font-medium">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Cast Section Component */
function CastSection({ credits }: { credits: TMDbCredits | null | undefined }) {
  if (!credits || !credits.cast || credits.cast.length === 0) return null;
  
  const mainCast = credits.cast.slice(0, 6);
  
  return (
    <div className="mt-12 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold text-[#fafafa] mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-[#a78bfa]">group</span>
        Reparto Principal
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {mainCast.map((actor) => (
          <div key={actor.id} className="flex-shrink-0 w-24">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-[#27272a] mb-2">
              {actor.profile_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                  alt={actor.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#a1a1aa]">
                  <span className="material-symbols-outlined text-3xl">person</span>
                </div>
              )}
            </div>
            <p className="text-[#fafafa] text-sm font-medium text-center truncate">{actor.name}</p>
            <p className="text-[#a1a1aa] text-xs text-center truncate">{actor.character}</p>
          </div>
        ))}
      </div>
    </div>
  );
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
    <div className="min-h-screen bg-[#09090b]">
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
              'inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold',
              'bg-[#a78bfa] text-[#09090b] hover:bg-[#a78bfa]/90',
              'transition-colors'
            )}
          >
            <span className="material-symbols-outlined">edit</span>
            <span>Escribir Reseña</span>
          </Link>
        </div>
        
        {mediaData.overview && (
          <div className="mt-12 max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold text-[#fafafa] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#a78bfa]">description</span>
              Sinopsis
            </h2>
            <p className="text-[#d4d4d8] leading-relaxed whitespace-pre-line">
              {mediaData.overview}
            </p>
          </div>
        )}
        
        {/* Info Section - Additional details */}
        <InfoSection mediaData={mediaData} />
        
        {/* Cast Section - for movies and series */}
        {(mediaData.mediaType === 'movie' || mediaData.mediaType === 'series') && (
          <CastSection credits={mediaData.credits} />
        )}

        {/* Seasons and Episodes - for series only */}
        {mediaData.mediaType === 'series' && mediaData.seasons && mediaData.seasons.length > 0 && (
          <SeasonsEpisodes
            seasons={mediaData.seasons}
            seriesId={id}
            seriesTitle={mediaData.title}
          />
        )}
      </div>
    </div>
  );
}