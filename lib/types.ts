/**
 * Shared types for screen_review app
 * These types are used across the application
 */

/**
 * Media types supported by the application
 */
export type MediaType = 'MOVIE' | 'SERIES' | 'BOOK';

/**
 * Review status values
 * Note: Using string literals to match Prisma enum values
 */
export type ReviewStatus = 'DRAFT' | 'COMPLETED' | 'WATCHLIST';

/**
 * Unified search result from TMDB or Google Books
 */
export interface SearchResult {
  id: string;
  mediaType: MediaType;
  title: string;
  subtitle?: string;
  overview?: string;
  imageUrl?: string | null;
  year?: string;
  rating?: number;
  mediaId: string; // External API ID (TMDB or Google Books)
}

/**
 * Search results response combining both APIs
 */
export interface SearchResults {
  movies: SearchResult[];
  series: SearchResult[];
  books: SearchResult[];
  errors: string[]; // Any API errors encountered
}

/**
 * Review from database or enriched review with metadata
 */
export interface Review {
  id: string;
  userId: string;
  mediaId: string;
  mediaType: MediaType;
  status: ReviewStatus;
  rating?: number | null;
  content?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Enriched fields from external APIs (optional, only present after enrichment)
  title?: string;
  imageUrl?: string | null;
  year?: string;
}

/**
 * User from Supabase
 */
export interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
  };
}