"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface EnrichedReview {
  id: string;
  mediaId: string;
  mediaType: string;
  status: string;
  rating?: number | null;
  content?: string | null;
  createdAt: Date;
  updatedAt: Date;
  title?: string | null;
  imageUrl?: string | null;
  year?: string;
}

interface CompletedClientProps {
  initialReviews: EnrichedReview[];
  totalCount: number;
  hasMore: boolean;
}

function formatDate(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function RatingStars({ rating }: { rating: number | null | undefined }) {
  if (rating === null || rating === undefined) {
    return <span className="text-sm text-[#52525b]">Sin rating</span>;
  }

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={cn(
            'text-sm',
            star <= rating ? 'text-yellow-400' : 'text-[#27272a]'
          )}
        >
          ★
        </span>
      ))}
      <span className="ml-1 text-sm text-[#a1a1aa]">{rating}/5</span>
    </div>
  );
}

function MediaTypeBadge({ mediaType }: { mediaType: string }) {
  const labels: Record<string, string> = {
    MOVIE: 'Película',
    SERIES: 'Serie',
    BOOK: 'Libro',
  };

  const colors: Record<string, string> = {
    MOVIE: 'bg-purple-500/10 text-purple-400',
    SERIES: 'bg-pink-500/10 text-pink-400',
    BOOK: 'bg-orange-500/10 text-orange-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        colors[mediaType] || 'bg-gray-500/10 text-gray-400'
      )}
    >
      {labels[mediaType] || mediaType}
    </span>
  );
}

function ReviewCard({ review }: { review: EnrichedReview }) {
  const contentPreview = review.content?.substring(0, 120)?.trim();

  return (
    <a
      href={`/editor/${review.id}`}
      className={cn(
        'block w-full text-left p-4 rounded-xl border bg-[#121215]',
        'hover:bg-[#18181b] hover:border-[#a78bfa]/30',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-[#a78bfa]/50'
      )}
    >
      <div className="flex items-start gap-2 mb-3">
        <MediaTypeBadge mediaType={review.mediaType} />
        {review.title && (
          <span className="font-medium text-[#fafafa] text-sm truncate">
            {review.title}
          </span>
        )}
      </div>

      <div className="flex gap-3 mb-3">
        {review.imageUrl && (
          <img
            src={review.imageUrl}
            alt={review.title || 'Poster'}
            className="w-12 h-18 object-cover rounded-lg flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <RatingStars rating={review.rating} />
          {review.year && (
            <p className="text-xs text-[#52525b] mt-1">{review.year}</p>
          )}
        </div>
      </div>

      {contentPreview && (
        <p className="text-sm text-[#71717a] line-clamp-2 mb-3">
          {contentPreview}...
        </p>
      )}

      <div className="mt-auto pt-3 border-t border-[#27272a]">
        <span className="text-xs text-[#52525b]">
          Editado {formatDate(review.updatedAt)}
        </span>
      </div>
    </a>
  );
}

export function CompletedClient({
  initialReviews,
  totalCount,
  hasMore: initialHasMore,
}: CompletedClientProps) {
  const [reviews, setReviews] = useState<EnrichedReview[]>(initialReviews);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [total, setTotal] = useState(totalCount);

  // Sync with initial data
  useEffect(() => {
    setReviews(initialReviews);
    setHasMore(initialHasMore);
    setTotal(totalCount);
  }, [initialReviews, initialHasMore, totalCount]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    const nextPage = currentPage + 1;

    try {
      const params = new URLSearchParams();
      params.set('page', nextPage.toString());
      params.set('limit', '12');
      params.set('status', 'COMPLETED');

      const response = await fetch(`/api/reviews?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(prev => [...prev, ...data.reviews]);
        setCurrentPage(nextPage);
        setHasMore(data.hasMore);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Error loading more reviews:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, hasMore, isLoading]);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Link
            href="/editor"
            className="text-[#a78bfa] hover:text-[#c4b5fd] flex items-center gap-1 text-sm"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Volver al editor
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-[#fafafa] tracking-tight">
          Todas las Reseñas Completadas
        </h1>
        <p className="text-sm text-[#a1a1aa] mt-1">
          {total} {total === 1 ? 'reseña' : 'reseñas'}
        </p>
      </div>

      {/* Completed Grid */}
      {reviews.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
          {/* Load More Button */}
          {hasMore && (
            <div className="mt-8 text-center">
              <button
                onClick={loadMore}
                disabled={isLoading}
                className={cn(
                  "px-6 py-3 rounded-xl font-medium transition-colors",
                  isLoading
                    ? "bg-[#27272a] text-[#52525b] cursor-not-allowed"
                    : "bg-[#a78bfa]/10 text-[#a78bfa] hover:bg-[#a78bfa]/20 border border-[#a78bfa]/30"
                )}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Cargando...
                  </span>
                ) : (
                  'Cargar más'
                )}
              </button>
            </div>
          )}
          {!hasMore && reviews.length > 0 && (
            <div className="mt-8 text-center text-sm text-[#52525b]">
              Mostrando {reviews.length} de {total} reseñas
            </div>
          )}
        </>
      ) : (
        <div className="py-12 text-center rounded-xl bg-[#121215] border border-[#27272a]">
          <span className="material-symbols-outlined text-4xl text-[#52525b] mb-3">
            check_circle
          </span>
          <p className="text-[#71717a]">No hay reseñas completadas.</p>
        </div>
      )}
    </div>
  );
}