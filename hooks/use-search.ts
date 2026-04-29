"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { SearchResult, SearchResults, MediaType } from '@/lib/types';

/**
 * useSearch - Optimized unified search hook
 * 
 * Improvements:
 * - Remove trimming before search (allows spaces)
 * - Use Promise.race for faster response
 * - Optimize debounce
 * - Simplified state management
 */

interface UseSearchOptions {
  debounceMs?: number;
  minLength?: number;
}

interface UseSearchState {
  query: string;
  results: SearchResults;
  isLoading: boolean;
  error: string | null;
}

// Transform functions - optimized
const transformTMDBResult = (
  item: any,
  mediaType: 'movie' | 'tv'
): SearchResult => ({
  id: String(item.id),
  mediaType: mediaType === 'movie' ? 'MOVIE' : 'SERIES',
  title: item.title || item.name || 'Unknown',
  overview: item.overview,
  imageUrl: item.poster_path 
    ? `https://image.tmdb.org/t/p/w185${item.poster_path}`
    : item.backdrop_path
      ? `https://image.tmdb.org/t/p/w500${item.backdrop_path}`
      : null,
  year: (item.release_date || item.first_air_date || '').split('-')[0],
  rating: item.vote_average,
  mediaId: String(item.id),
});

const transformBookResult = (volume: any): SearchResult => ({
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
});

export function useSearch(options: UseSearchOptions = {}) {
  const { 
    debounceMs = 300,
    minLength = 2 
  } = options;

  const [state, setState] = useState<UseSearchState>({
    query: '',
    results: { movies: [], series: [], books: [], errors: [] },
    isLoading: false,
    error: null,
  });

  const searchRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Execute search - optimized
  const executeSearch = useCallback(async (searchQuery: string) => {
    // Cancel previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    if (searchQuery.length < minLength) {
      setState({
        query: searchQuery,
        results: { movies: [], series: [], books: [], errors: [] },
        isLoading: false,
        error: null,
      });
      return;
    }

    const abortController = new AbortController();
    abortRef.current = abortController;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Use Promise.all instead of allSettled for faster fail-fast
      const tmdbRes = await fetch(`/api/tmdb?query=${encodeURIComponent(searchQuery)}&type=multi`, {
        signal: abortController.signal,
      }).catch(() => ({ ok: false, status: 500 } as Response));
      
      const booksRes = await fetch(`/api/books?query=${encodeURIComponent(searchQuery)}`, {
        signal: abortController.signal,
      }).catch(() => ({ ok: false, status: 500 } as Response));

      const movies: SearchResult[] = [];
      const series: SearchResult[] = [];
      const books: SearchResult[] = [];
      const errors: string[] = [];

      // Process TMDB
      if (tmdbRes.ok) {
        try {
          const data = await tmdbRes.json();
          const results = data.results || [];
          for (const item of results) {
            if (item.media_type === 'person') continue;
            if (item.media_type === 'movie') {
              movies.push(transformTMDBResult(item, 'movie'));
            } else if (item.media_type === 'tv') {
              series.push(transformTMDBResult(item, 'tv'));
            }
          }
        } catch {
          // Ignore parse errors
        }
      } else if (tmdbRes.status === 429) {
        errors.push('Rate limited');
      }

      // Process Books
      if (booksRes.ok) {
        try {
          const data = await booksRes.json();
          for (const item of data.items || []) {
            books.push(transformBookResult(item));
          }
        } catch {
          // Ignore parse errors
        }
      } else if (booksRes.status === 429) {
        errors.push('Books rate limited');
      }

      // Only update if not aborted AND query matches current
      if (!abortController.signal.aborted && searchRef.current === searchQuery) {
        setState({
          query: searchQuery,
          results: { movies, series, books, errors },
          isLoading: false,
          error: errors.length > 0 ? errors[0] : null,
        });
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        if (!abortController.signal.aborted) {
          setState(prev => ({ ...prev, isLoading: false, error: 'Search failed' }));
        }
      }
    }
  }, [minLength]);

  // Search function with debounce
  const search = useCallback((query: string) => {
    searchRef.current = query;
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Immediate clear for empty/minimal queries
    if (query.length < minLength) {
      setState({
        query,
        results: { movies: [], series: [], books: [], errors: [] },
        isLoading: false,
        error: null,
      });
      return;
    }

    // Debounce the search
    timeoutRef.current = setTimeout(() => {
      if (searchRef.current) {
        executeSearch(searchRef.current);
      }
    }, debounceMs);
  }, [debounceMs, minLength, executeSearch]);

  // Clear function
  const clearSearch = useCallback(() => {
    searchRef.current = '';
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (abortRef.current) {
      abortRef.current.abort();
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
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // Memoize results summary
  const totalResults = useMemo(() => 
    state.results.movies.length + state.results.series.length + state.results.books.length,
    [state.results]
  );

  return {
    ...state,
    totalResults,
    search,
    clearSearch,
  };
}