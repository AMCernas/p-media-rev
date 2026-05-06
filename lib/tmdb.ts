/**
 * TMDB API Client
 * Base URL: https://api.themoviedb.org/3
 * Authentication: Bearer token via TMDB_API_KEY
 */

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY;

// Warn but don't throw - allows to build without API key
if (!TMDB_API_KEY) {
  console.warn('TMDB_API_KEY environment variable not set - TMDB features will be disabled');
}

interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TMDBSearchResult {
  id: number;
  title?: string;
  name?: string;
  media_type: 'movie' | 'tv' | 'person';
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  adult?: boolean;
  original_language?: string;
  genre_ids?: number[];
}

export interface TMDbMovieDetails {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
  genres: Array<{ id: number; name: string }>;
  status: string;
  tagline: string | null;
  budget: number;
  revenue: number;
  production_companies: Array<{ id: number; name: string; logo_path: string | null }>;
  original_language: string;
}

export interface TMDbSeriesDetails {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date: string;
  episode_run_time: number[];
  vote_average: number;
  vote_count: number;
  genres: Array<{ id: number; name: string }>;
  status: string;
  tagline: string | null;
  number_of_seasons: number;
  number_of_episodes: number;
  production_companies: Array<{ id: number; name: string; logo_path: string | null }>;
  original_language: string;
  seasons?: TMDbSeason[];
}

// Cast/Crew types
export interface TMDB_cast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TMDB_crew {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TMDbCredits {
  id: number;
  cast: TMDB_cast[];
  crew: TMDB_crew[];
}

// Season and Episode types
export interface TMDbEpisode {
  id: number;
  name: string;
  overview: string | null;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
  vote_average: number;
}

export interface TMDbSeason {
  id: number;
  name: string;
  season_number: number;
  overview: string | null;
  air_date: string | null;
  poster_path: string | null;
  episode_count: number;
}

export interface TMDbSeasonDetails {
  id: number;
  name: string;
  season_number: number;
  overview: string | null;
  episodes: TMDbEpisode[];
  poster_path: string | null;
}

interface TrendingResponse {
  page: number;
  results: TMDBSearchResult[];
  total_pages: number;
  total_results: number;
}

async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB_API_KEY not configured');
  }
  
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', TMDB_API_KEY as string);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${TMDB_API_KEY}`,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Search for movies by query
 */
export async function searchMovies(query: string, page: number = 1): Promise<TMDBResponse<TMDBSearchResult>> {
  return tmdbFetch<TMDBResponse<TMDBSearchResult>>('/search/movie', {
    query,
    page: String(page),
  });
}

/**
 * Search for TV series by query
 */
export async function searchSeries(query: string, page: number = 1): Promise<TMDBResponse<TMDBSearchResult>> {
  return tmdbFetch<TMDBResponse<TMDBSearchResult>>('/search/tv', {
    query,
    page: String(page),
  });
}

/**
 * Search for both movies and TV series
 */
export async function searchMulti(query: string, page: number = 1): Promise<TMDBResponse<TMDBSearchResult>> {
  return tmdbFetch<TMDBResponse<TMDBSearchResult>>('/search/multi', {
    query,
    page: String(page),
  });
}

/**
 * Get trending content for the week
 */
export async function getTrending(page: number = 1): Promise<TrendingResponse> {
  return tmdbFetch<TrendingResponse>('/trending/all/week', {
    page: String(page),
  });
}

/**
 * Get movie details by ID
 */
export async function getMovieDetails(id: string): Promise<TMDbMovieDetails> {
  return tmdbFetch<TMDbMovieDetails>(`/movie/${id}`);
}

/**
 * Get TV series details by ID
 */
export async function getSeriesDetails(id: string): Promise<TMDbSeriesDetails> {
  return tmdbFetch<TMDbSeriesDetails>(`/tv/${id}`);
}

/**
 * Get image base URL for TMDB images
 */
export function getTMDBImageUrl(path: string | null, size: 'w185' | 'w500' | 'original' = 'w500'): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

/**
 * Get movie credits (cast)
 */
export async function getMovieCredits(id: string): Promise<TMDbCredits> {
  return tmdbFetch<TMDbCredits>(`/movie/${id}/credits`);
}

/**
 * Get TV series credits (cast)
 */
export async function getSeriesCredits(id: string): Promise<TMDbCredits> {
  return tmdbFetch<TMDbCredits>(`/tv/${id}/credits`);
}

/**
 * Get TV series seasons list
 */
export async function getSeriesSeasons(id: string): Promise<{ seasons: TMDbSeason[] }> {
  return tmdbFetch<{ seasons: TMDbSeason[] }>(`/tv/${id}`);
}

/**
 * Get specific season details with episodes
 */
export async function getSeasonDetails(seriesId: string, seasonNumber: number): Promise<TMDbSeasonDetails> {
  return tmdbFetch<TMDbSeasonDetails>(`/tv/${seriesId}/season/${seasonNumber}`);
}

/**
 * Get popular movies from TMDB
 */
export async function getPopularMovies(
  page: number = 1,
  language: string = 'es-ES'
): Promise<TMDBResponse<TMDBSearchResult>> {
  return tmdbFetch<TMDBResponse<TMDBSearchResult>>('/movie/popular', {
    page: String(page),
    language,
  });
}

/**
 * Get popular TV series from TMDB
 */
export async function getPopularTV(
  page: number = 1,
  language: string = 'es-ES'
): Promise<TMDBResponse<TMDBSearchResult>> {
  return tmdbFetch<TMDBResponse<TMDBSearchResult>>('/tv/popular', {
    page: String(page),
    language,
  });
}
