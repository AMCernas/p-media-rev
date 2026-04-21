"use client";

import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Review, MediaType } from '@/lib/types';

/**
 * ReviewCard - Display review with rating, content preview, and status badge
 * 
 * Requirements from spec:
 * - Display rating stars (1-5)
 * - Display content preview (truncated)
 * - Display status badge (DRAFT, PUBLISHED, WATCHLIST)
 * - Click to navigate to editor
 */

interface ReviewCardProps {
  /** Review data to display */
  review: Review;
  /** Optional title/media name (fetched separately or passed in) */
  mediaTitle?: string;
  /** Click handler override (if not using Link) */
  onClick?: () => void;
  className?: string;
}

/**
 * Render rating as star display
 */
function RatingStars({ rating }: { rating: number | null | undefined }) {
  if (rating === null || rating === undefined) {
    return <span className="text-muted-foreground text-sm">Sin rating</span>;
  }

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={cn(
            'text-sm',
            star <= rating ? 'text-yellow-500' : 'text-muted-foreground/30'
          )}
        >
          ★
        </span>
      ))}
      <span className="ml-1 text-sm text-muted-foreground">{rating}/5</span>
    </div>
  );
}

/**
 * Get status badge styles
 */
function StatusBadge({ status }: { status: Review['status'] }) {
  const styles = {
    DRAFT: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    PUBLISHED: 'bg-green-500/10 text-green-500 border-green-500/20',
    WATCHLIST: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  };

  const labels = {
    DRAFT: 'Borrador',
    PUBLISHED: 'Publicada',
    WATCHLIST: 'Watchlist',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        styles[status]
      )}
    >
      {labels[status]}
    </span>
  );
}

/**
 * Get media type badge
 */
function MediaTypeBadge({ mediaType }: { mediaType: MediaType }) {
  const labels = {
    MOVIE: 'Película',
    SERIES: 'Serie',
    BOOK: 'Libro',
  };

  const colors = {
    MOVIE: 'bg-purple-500/10 text-purple-500',
    SERIES: 'bg-pink-500/10 text-pink-500',
    BOOK: 'bg-orange-500/10 text-orange-500',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        colors[mediaType]
      )}
    >
      {labels[mediaType]}
    </span>
  );
}

/**
 * Format date for display
 */
function formatDate(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Truncate content for preview
 */
function truncateContent(content: string | null | undefined, maxLength: number = 150) {
  if (!content) return null;
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength).trim() + '...';
}

export function ReviewCard({
  review,
  mediaTitle,
  onClick,
  className,
}: ReviewCardProps) {
  const href = `/editor/${review.id}`;
  const contentPreview = truncateContent(review.content);

  // If onClick is provided, render as button; otherwise as Link
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'block w-full text-left p-4 rounded-lg border bg-card hover:bg-accent/50',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-primary/50',
          className
        )}
      >
        {/* Header: Type, Title, Status */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <MediaTypeBadge mediaType={review.mediaType} />
            {mediaTitle && (
              <span className="font-medium text-foreground">{mediaTitle}</span>
            )}
          </div>
          <StatusBadge status={review.status} />
        </div>

        {/* Rating */}
        <div className="mb-2">
          <RatingStars rating={review.rating} />
        </div>

        {/* Content Preview */}
        {contentPreview && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {contentPreview}
          </p>
        )}

        {/* Footer: Date */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            Actualizado {formatDate(review.updatedAt)}
          </span>
        </div>
      </button>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        'block w-full text-left p-4 rounded-lg border bg-card hover:bg-accent/50',
        'transition-colors duration-150',
        'focus:outline-none focus:ring-2 focus:ring-primary/50',
        className
      )}
    >
      {/* Header: Type, Title, Status */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <MediaTypeBadge mediaType={review.mediaType} />
          {mediaTitle && (
            <span className="font-medium text-foreground">{mediaTitle}</span>
          )}
        </div>
        <StatusBadge status={review.status} />
      </div>

      {/* Rating */}
      <div className="mb-2">
        <RatingStars rating={review.rating} />
      </div>

      {/* Content Preview */}
      {contentPreview && (
        <p className="text-sm text-muted-foreground line-clamp-3">
          {contentPreview}
        </p>
      )}

      {/* Footer: Date */}
      <div className="mt-3 pt-3 border-t border-border/50">
        <span className="text-xs text-muted-foreground">
          Actualizado {formatDate(review.updatedAt)}
        </span>
      </div>
    </Link>
  );
}