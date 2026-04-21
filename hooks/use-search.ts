"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import type { SearchResult, SearchResults, MediaType } from '@/lib/types';

/**
 * useSearch - Unified search hook combining TMDB and Google Books APIs
 * 
 * Requirements from spec:
 * - REQ-ES-1: Accept search query from user
 * - REQ-ES-2: Query TMDB API for movies/series
 * - REQ-ES-3: Query Google Books API for books
 * - REQ-ES-4: Return combined results
 * - REQ-ES-5: Handle rate limit and API errors
 */

interface UseSearchOptions {
  /** Debounce delay in milliseconds (default: 400ms) */
  debounceMs?: number;
}

interface UseSearchState {
  query: string;
  results: SearchResults;
  isLoading: boolean;
  error: string | null;
}

/**
 * Transform TMDB search result to unified SearchResult
 */
function transformTMDBResult(
  item: {
    id: number;
    title?: string;
    name?: string;
    overview?: string;
    poster_path?: string;
    backdrop_path?: string;
    release_date?: string;
    first_air_date?: string;
    vote_average?: number;
    media_type?: string;
  },
  mediaType: 'movie' | 'tv'
): SearchResult {
  const imageBaseUrl = 'https://image.tmdb.org/t/p';
  
  return {
    id: String(item.id),
    mediaType: mediaType === 'movie' ? 'MOVIE' : 'SERIES',
    title: item.title || item.name || 'Unknown',
    overview: item.overview,
    imageUrl: item.poster_path 
      ? `${imageBaseUrl}/w185${item.poster_path}` 
      : item.backdrop_path
        ? `${imageBaseUrl}/w500${item.backdrop_path}`
        : null,
    year: (item.release_date || item.first_air_date || '').split('-')[0],
    rating: item.vote_average,
    mediaId: String(item.id),
  };
}

/**
 * Transform Google Books volume to unified SearchResult
 */
function transformBookResult(
  volume: {
    id: string;
    volumeInfo: {
      title: string;
      subtitle?: string;
      publishedDate?: string;
      description?: string;
      imageLinks?: {
        thumbnail?: string;
        smallThumbnail?: string;
      };
      averageRating?: number;
    };
  }
): SearchResult {
  return {
    id: volume.id,
    mediaType: 'BOOK' as MediaType,
    title: volume.volumeInfo.title,
    subtitle: volume.volumeInfo.subtitle,
    overview: volume.volumeInfo.description,
    imageUrl: volume.volumeInfo.imageLinks?.thumbnail 
      || volume.volumeInfo.imageLinks?.smallThumbnail 
      || null,
    year: (volume.volumeInfo.publishedDate || '').split('-')[0],
    rating: volume.volumeInfo.averageRating,
    mediaId: volume.id,
  };
}

/**
 * Hook for unified search across TMDB and Google Books
 * Fetches from both APIs in parallel and combines results
 */
export function useSearch(options: UseSearchOptions = {}) {
  const { debounceMs = 400 } = options;
  
  const [state, setState] = useState<UseSearchState>({
    query: '',
    results: { movies: [], series: [], books: [], errors: [] },
    isLoading: false,
    error: null,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * Execute search query
   */
  const search = useCallback(async (query: string) => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Cancel debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Trim and validate query
    const trimmedQuery = query.trim();
    
    if (!trimmedQuery) {
      setState({
        query: '',
        results: { movies: [], series: [], books: [], errors: [] },
        isLoading: false,
        error: null,
      });
      return;
    }
    
    // Debounce the search
    const executeSearch = async () => {
      setState(prev => ({ ...prev, query: trimmedQuery, isLoading: true, error: null }));
      
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      
      const errors: string[] = [];
      
      try {
        // Fetch from both APIs in parallel
        const [tmdbResponse, booksResponse] = await Promise.allSettled([
          fetch(`/api/tmdb?query=${encodeURIComponent(trimmedQuery)}&type=multi`, {
            signal: abortController.signal,
          }),
          fetch(`/api/books?query=${encodeURIComponent(trimmedQuery)}`, {
            signal: abortController.signal,
          }),
        ]);
        
        const movies: SearchResult[] = [];
        const series: SearchResult[] = [];
        const books: SearchResult[] = [];
        
        // Process TMDB response
        if (tmdbResponse.status === 'fulfilled') {
          if (!tmdbResponse.value.ok) {
            if (tmdbResponse.value.status === 429) {
              errors.push('TMDB rate limit exceeded - try again later');
            } else {
              errors.push(`TMDB error: ${tmdbResponse.value.status}`);
            }
          } else {
            try {
              const data = await tmdbResponse.value.json();
              const results = data.results || [];
              
              for (const item of results) {
                // Skip person type
                if (item.media_type === 'person') continue;
                
                if (item.media_type === 'movie') {
                  movies.push(transformTMDBResult(item, 'movie'));
                } else if (item.media_type === 'tv') {
                  series.push(transformTMDBResult(item, 'tv'));
                }
              }
            } catch {
              errors.push('Failed to parse TMDB response');
            }
          }
        } else if (tmdbResponse.status === 'rejected') {
          if (tmdbResponse.reason?.name !== 'AbortError') {
            errors.push('TMDB unavailable');
          }
        }
        
        // Process Books response
        if (booksResponse.status === 'fulfilled') {
          if (!booksResponse.value.ok) {
            if (booksResponse.value.status === 429) {
              errors.push('Google Books rate limit exceeded');
            } else {
              errors.push(`Google Books error: ${booksResponse.value.status}`);
            }
          } else {
            try {
              const data = await booksResponse.value.json();
              const items = data.items || [];
              
              for (const item of items) {
                books.push(transformBookResult(item));
              }
            } catch {
              errors.push('Failed to parse Books response');
            }
          }
        } else if (booksResponse.status === 'rejected') {
          if (booksResponse.reason?.name !== 'AbortError') {
            errors.push('Google Books unavailable');
          }
        }
        
        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }
        
        setState({
          query: trimmedQuery,
          results: { movies, series, books, errors },
          isLoading: false,
          error: errors.length > 0 ? errors.join('; ') : null,
        });
      } catch (err) {
        const error = err as { name?: string };
        if (error.name !== 'AbortError') {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Search failed',
          }));
        }
      }
    };
    
    // Schedule the search with debounce
    debounceTimeoutRef.current = setTimeout(executeSearch, debounceMs);
  }, [debounceMs]);
  
  /**
   * Clear search results
   */
  const clearSearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    setState({
      query: '',
      results: { movies: [], series: [], books: [], errors: [] },
      isLoading: false,
      error: null,
    });
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);
  
  return {
    ...state,
    search,
    clearSearch,
  };
}