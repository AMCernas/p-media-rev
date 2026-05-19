"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { SearchResult, SearchResults, MediaType } from '@/lib/types';

/**
 * useSearch - Optimized unified search hook with pagination support
 * 
 * Features:
 * - Remove trimming before search (allows spaces)
 * - Use Promise.race for faster response
 * - Optimize debounce
 * - Pagination support for movies, series, and books independently
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

// Pagination state per type
interface PaginationState {
  page: number;
  totalPages: number;
  totalResults: number;
  hasMore: boolean;
}

interface PaginationStateMap {
  movies: PaginationState;
  series: PaginationState;
  books: PaginationState;
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

const initialPagination: PaginationState = {
  page: 1,
  totalPages: 1,
  totalResults: 0,
  hasMore: false,
};

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

  // Pagination state
  const [pagination, setPagination] = useState<PaginationStateMap>({
    movies: initialPagination,
    series: initialPagination,
    books: initialPagination,
  });

  const searchRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isSearchRef = useRef<boolean>(false);

  // Execute initial search
  const executeSearch = useCallback(async (searchQuery: string) => {
    isSearchRef.current = true;
    
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
      setPagination({
        movies: initialPagination,
        series: initialPagination,
        books: initialPagination,
      });
      return;
    }

    const abortController = new AbortController();
    abortRef.current = abortController;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch movies, series, and books in parallel
      const [tmdbRes, booksRes] = await Promise.all([
        fetch(`/api/tmdb?query=${encodeURIComponent(searchQuery)}&type=multi&page=1`, {
          signal: abortController.signal,
        }).catch(() => ({ ok: false, status: 500 } as Response)),
        
        fetch(`/api/books?query=${encodeURIComponent(searchQuery)}&page=1`, {
          signal: abortController.signal,
        }).catch(() => ({ ok: false, status: 500 } as Response)),
      ]);

      const movies: SearchResult[] = [];
      const series: SearchResult[] = [];
      const books: SearchResult[] = [];
      const errors: string[] = [];

      // Process TMDB
      if (tmdbRes.ok) {
        try {
          const data = await tmdbRes.json();
          const results = data.results || [];
          
          // Update pagination state for movies and series
          setPagination(prev => ({
            ...prev,
            movies: {
              page: data.page || 1,
              totalPages: data.total_pages || 1,
              totalResults: data.total_results || 0,
              hasMore: (data.page || 1) < (data.total_pages || 1),
            },
            series: {
              page: data.page || 1,
              totalPages: data.total_pages || 1,
              totalResults: data.total_results || 0,
              hasMore: (data.page || 1) < (data.total_pages || 1),
            },
          }));

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
          
          // Update books pagination
          setPagination(prev => ({
            ...prev,
            books: {
              page: 1,
              totalPages: Math.ceil((data.totalItems || 0) / 20),
              totalResults: data.totalItems || 0,
              hasMore: (data.totalItems || 0) > 20,
            },
          }));

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

  // Load more function for a specific type
  const loadMore = useCallback(async (type: 'movies' | 'series' | 'books') => {
    if (state.isLoading || !pagination[type].hasMore || !searchRef.current) return;

    const nextPage = pagination[type].page + 1;

    try {
      let newResults: SearchResult[] = [];

      if (type === 'movies') {
        // Use searchMovies endpoint for pagination
        const res = await fetch(
          `/api/tmdb?query=${encodeURIComponent(searchRef.current)}&type=movie&page=${nextPage}`
        );
        
        if (res.ok) {
          const data = await res.json();
          
          newResults = (data.results || [])
            .filter((item: any) => item.media_type === 'movie')
            .map((item: any) => transformTMDBResult(item, 'movie'));

          setPagination(prev => ({
            ...prev,
            movies: {
              page: data.page || nextPage,
              totalPages: data.total_pages || 1,
              totalResults: data.total_results || 0,
              hasMore: (data.page || nextPage) < (data.total_pages || 1),
            },
          }));
        }
      } else if (type === 'series') {
        // Use searchSeries endpoint for pagination
        const res = await fetch(
          `/api/tmdb?query=${encodeURIComponent(searchRef.current)}&type=tv&page=${nextPage}`
        );
        
        if (res.ok) {
          const data = await res.json();
          
          newResults = (data.results || [])
            .filter((item: any) => item.media_type === 'tv')
            .map((item: any) => transformTMDBResult(item, 'tv'));

          setPagination(prev => ({
            ...prev,
            series: {
              page: data.page || nextPage,
              totalPages: data.total_pages || 1,
              totalResults: data.total_results || 0,
              hasMore: (data.page || nextPage) < (data.total_pages || 1),
            },
          }));
        }
      } else if (type === 'books') {
        const res = await fetch(
          `/api/books?query=${encodeURIComponent(searchRef.current)}&page=${nextPage}`
        );
        
        if (res.ok) {
          const data = await res.json();
          newResults = (data.items || []).map(transformBookResult);

          setPagination(prev => ({
            ...prev,
            books: {
              page: nextPage,
              totalPages: Math.ceil((data.totalItems || 0) / 20),
              totalResults: data.totalItems || 0,
              hasMore: (nextPage * 20) < (data.totalItems || 0),
            },
          }));
        }
      }

      // Append new results
      setState(prev => ({
        ...prev,
        results: {
          ...prev.results,
          [type]: [...prev.results[type], ...newResults],
        },
      }));
    } catch (error) {
      console.error(`Error loading more ${type}:`, error);
    }
  }, [state.isLoading, pagination]);

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
      setPagination({
        movies: initialPagination,
        series: initialPagination,
        books: initialPagination,
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
    setPagination({
      movies: initialPagination,
      series: initialPagination,
      books: initialPagination,
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
    pagination,
    search,
    loadMore,
    clearSearch,
  };
}