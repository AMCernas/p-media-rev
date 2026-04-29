"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from '@/hooks/use-search';
import { SearchResult, MediaType } from '@/lib/types';
import { getTMDBImageUrl } from '@/lib/tmdb';
import { cn } from '@/lib/utils';

/**
 * SearchBox - Unified search input with results dropdown
 * 
 * Tasks 8.2-8.4:
 * - Input with search icon
 * - Debounced onChange
 * - Loading state while fetching
 * - Display results dropdown
 * - Handle errors
 * 
 * Requirements from spec (REQ-ES-1 to REQ-ES-5):
 * - Accept query from user
 * - Return combined results
 * - Handle rate limit and API errors
 */

interface SearchBoxProps {
  /** CSS className for custom styling */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Close dropdown when clicking outside */
  closeOnBlur?: boolean;
}

export function SearchBox({
  className,
  placeholder = 'Search movies, shows, books...',
  autoFocus = false,
  closeOnBlur = true,
}: SearchBoxProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
const {
    query, // Keep to sync with inputValue
    results,
    isLoading,
    error,
    search,
    clearSearch,
    totalResults,
  } = useSearch({ debounceMs: 250, minLength: 2 });
  
  // LOCAL state for input - separate from hook to avoid re-render conflicts
  const [inputValue, setInputValue] = useState('');
  
  // Sync inputValue when query is cleared externally
  useEffect(() => {
    if (!query && inputValue) {
      setInputValue('');
    }
  }, [query]);
  
  const MAX_DROPDOWN_RESULTS = 4;
  
  // Handle input change - uses LOCAL state, NOT query from hook
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value); // Update local state immediately
    setIsOpen(value.length > 0);
    if (value.length >= 2) {
      search(value);
    } else if (value.length === 0) {
      clearSearch();
    }
  };
  
  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() || query) {
      // Navigate to search results page - always works regardless of results
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };
  
  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    const typeRoute = result.mediaType === 'MOVIE' ? 'movie' : result.mediaType === 'SERIES' ? 'series' : 'book';
    router.push(`/details/${typeRoute}/${result.id}`);
    setIsOpen(false);
    clearSearch();
  };
  
  // Close on blur
  useEffect(() => {
    if (!closeOnBlur) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeOnBlur]);
  
  // Handle key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      clearSearch();
    }
  };
  
  return (
    <div
      ref={containerRef}
      className={cn('relative w-full max-w-md', className)}
      onKeyDown={handleKeyDown}
    >
      <form onSubmit={handleSubmit}>
        <div className="relative">
          {/* Search Icon */}
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              className="h-4 w-4 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          
          {/* Input */}
          <input
            type="text"
            inputMode="search"
            value={inputValue}
            onChange={handleInputChange}
            onKeyUp={(e) => {
              // Force search on any key press
              if (e.key === ' ' && query.trim() === '') {
                search(' ');
              }
            }}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={cn(
              'flex h-9 w-full rounded-md border border-input bg-background pl-10 pr-10 py-1 text-sm',
              'ring-offset-background',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-destructive focus-visible:ring-destructive'
            )}
          />
          
          {/* Loading spinner or clear button */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {isLoading ? (
              <svg
                className="h-4 w-4 animate-spin text-muted-foreground"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : query ? (
              <button
                type="button"
                onClick={() => {
                  clearSearch();
                  setIsOpen(false);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg
                  className="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            ) : null}
          </div>
        </div>
      </form>
      
      {/* Results Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg',
            'max-h-[70vh] overflow-y-auto'
          )}
        >
          {/* Error messages */}
          {error && results.errors.length > 0 && totalResults === 0 && (
            <div className="p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          
          {/* Partial error warning */}
          {error && totalResults > 0 && (
            <div className="border-b border-border bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
          
          {/* No results */}
          {!isLoading && !error && query && totalResults === 0 && (
            <div className="p-3 text-sm text-muted-foreground">
              No se encontraron resultados para "{query}"
            </div>
          )}
          
          {/* Movies section */}
          {results.movies.length > 0 && (
            <div className="border-b border-border">
              <div className="sticky top-0 bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                Movies ({results.movies.length})
              </div>
              {results.movies.slice(0, MAX_DROPDOWN_RESULTS).map((result) => (
                <ResultItem
                  key={`movie-${result.id}`}
                  result={result}
                  onClick={() => handleResultClick(result)}
                />
              ))}
            </div>
          )}
          
          {/* Series section */}
          {results.series.length > 0 && (
            <div className="border-b border-border">
              <div className="sticky top-0 bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                TV Series ({results.series.length})
              </div>
              {results.series.slice(0, MAX_DROPDOWN_RESULTS).map((result) => (
                <ResultItem
                  key={`series-${result.id}`}
                  result={result}
                  onClick={() => handleResultClick(result)}
                />
              ))}
            </div>
          )}
          
          {/* Books section */}
          {results.books.length > 0 && (
            <div>
              <div className="sticky top-0 bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                Books ({results.books.length})
              </div>
              {results.books.slice(0, MAX_DROPDOWN_RESULTS).map((result) => (
                <ResultItem
                  key={`book-${result.id}`}
                  result={result}
                  onClick={() => handleResultClick(result)}
                />
              ))}
            </div>
          )}
          
          {/* Show more results link */}
          {totalResults > 5 && (
            <button
              onClick={() => {
                router.push(`/search?q=${encodeURIComponent(query)}`);
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-center text-sm font-medium text-primary hover:bg-muted"
            >
              Ver todos los resultados ({totalResults})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Individual result item in dropdown
 */
interface ResultItemProps {
  result: SearchResult;
  onClick: () => void;
}

function ResultItem({ result, onClick }: ResultItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted"
    >
      {/* Thumbnail */}
      {result.imageUrl && (
        <div className="h-12 w-8 shrink-0 overflow-hidden rounded bg-muted">
          <img
            src={result.imageUrl}
            alt={result.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-medium">
          {result.title}
        </div>
        {result.overview && (
          <div className="truncate text-xs text-muted-foreground">
            {result.overview}
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {result.year && <span>{result.year}</span>}
          {result.rating && (
            <span className="flex items-center gap-0.5">
              <svg
                className="h-3 w-3 text-yellow-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {result.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default SearchBox;