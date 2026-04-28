"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Review, MediaType } from '@/lib/types';

/**
 * WatchlistSection - Display watchlist items with remove functionality
 * 
 * Requirements from spec (REQ-WL-4):
 * - Show watchlist items in Library page
 * - Allow removing items from watchlist
 */

interface WatchlistItem extends Pick<Review, 'id' | 'mediaId' | 'mediaType'> {
  // Media metadata (would need to be fetched or passed in)
  title?: string;
  imageUrl?: string | null;
  year?: string;
}

interface WatchlistSectionProps {
  /** Watchlist items to display */
  items: WatchlistItem[];
  /** Callback when item is removed */
  onRemove: (mediaId: string, mediaType: MediaType) => Promise<{ success: boolean; error?: string }>;
  /** Loading state */
  isLoading?: boolean;
  className?: string;
}

/**
 * Get media type label
 */
function getMediaTypeLabel(mediaType: MediaType): string {
  const labels = {
    MOVIE: 'Película',
    SERIES: 'Serie',
    BOOK: 'Libro',
  };
  return labels[mediaType];
}

/**
 * Get media type badge color
 */
function getMediaTypeColor(mediaType: MediaType): string {
  const colors = {
    MOVIE: 'bg-purple-500/10 text-purple-500',
    SERIES: 'bg-pink-500/10 text-pink-500',
    BOOK: 'bg-orange-500/10 text-orange-500',
  };
  return colors[mediaType];
}

export function WatchlistSection({
  items,
  onRemove,
  isLoading = false,
  className,
}: WatchlistSectionProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (item: WatchlistItem) => {
    if (removingId) return; // Prevent multiple simultaneous removals

    setRemovingId(item.id);

    try {
      await onRemove(item.mediaId, item.mediaType);
    } finally {
      setRemovingId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className={cn('py-8 text-center', className)}>
        <p className="text-muted-foreground">
          Tu watchlist está vacía
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Agrega películas, series o libros para verlos después
        </p>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-3', className)}>
      {items.map((item) => (
        <div
          key={`${item.mediaType}-${item.mediaId}`}
          className={cn(
            'flex items-center gap-4 p-3 rounded-lg border bg-card',
            'transition-colors duration-150 group'
          )}
        >
          {/* Poster/Image - Clickable */}
          <Link
            href={`/details/${item.mediaType.toLowerCase()}/${item.mediaId}`}
            className="w-12 h-16 flex-shrink-0 rounded overflow-hidden bg-muted hover:opacity-80 transition-opacity"
          >
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.title || 'Poster'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                {getMediaTypeLabel(item.mediaType)[0]}
              </div>
            )}
          </Link>

          {/* Info - Clickable link to details */}
          <Link
            href={`/details/${item.mediaType.toLowerCase()}/${item.mediaId}`}
            className="flex-1 min-w-0 hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
                  getMediaTypeColor(item.mediaType)
                )}
              >
                {getMediaTypeLabel(item.mediaType)}
              </span>
              {item.year && (
                <span className="text-xs text-muted-foreground">{item.year}</span>
              )}
            </div>
            <h3 className="font-medium text-sm truncate">
              {item.title || item.mediaId}
            </h3>
          </Link>

          {/* Remove button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleRemove(item);
            }}
            disabled={removingId === item.id || isLoading}
            className={cn(
              'flex-shrink-0 p-2 rounded-lg border',
              'text-muted-foreground hover:text-destructive hover:border-destructive/50',
              'focus:outline-none focus:ring-2 focus:ring-destructive/50',
              'transition-colors duration-150',
              (removingId === item.id || isLoading) && 'opacity-50 cursor-not-allowed'
            )}
            title="Quitar de Watchlist"
          >
            {removingId === item.id ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            )}
          </button>
        </div>
      ))}
    </div>
  );
}