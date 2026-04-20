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
