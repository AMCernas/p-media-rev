"use client";

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { MediaType } from '@/lib/types';

/**
 * EditorLanding - Landing page for editor
 * Shows drafts and completed reviews organized in sections
 */

interface EnrichedReview {
  id: string;
  mediaId: string;
  mediaType: string;
  status: string;
  rating?: number | null;
  content?: string | null;
  createdAt: Date;
  updatedAt: Date;
  title?: string;
  imageUrl?: string | null;
  year?: string;
}

interface EditorLandingProps {
  drafts: EnrichedReview[];
  completed: EnrichedReview[];
  draftsCount: number;
  completedCount: number;
}

/**
 * Format date for display
 */
function formatDate(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Render rating as star display
 */
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

/**
 * Get media type badge
 */
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

/**
 * Review card for editor landing
 */
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
      {/* Header: Type and Title */}
      <div className="flex items-start gap-2 mb-3">
        <MediaTypeBadge mediaType={review.mediaType} />
        {review.title && (
          <span className="font-medium text-[#fafafa] text-sm truncate">
            {review.title}
          </span>
        )}
      </div>

      {/* Poster + Rating */}
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

      {/* Content Preview */}
      {contentPreview && (
        <p className="text-sm text-[#71717a] line-clamp-2 mb-3">
          {contentPreview}...
        </p>
      )}

      {/* Footer: Date */}
      <div className="mt-auto pt-3 border-t border-[#27272a]">
        <span className="text-xs text-[#52525b]">
          Editado {formatDate(review.updatedAt)}
        </span>
      </div>
    </a>
  );
}

/**
 * Section header with count badge
 */
function SectionHeader({
  title,
  icon,
  count,
}: {
  title: string;
  icon: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-[#fafafa] flex items-center gap-2">
        <span className="material-symbols-outlined text-[#a78bfa]">{icon}</span>
        {title}
      </h2>
      <span className="text-sm px-3 py-1 rounded-full bg-[#121215] border border-[#27272a] text-[#a1a1aa]">
        {count} {count === 1 ? 'ítem' : 'ítems'}
      </span>
    </div>
  );
}

/**
 * Empty state for section
 */
function EmptySection({ message, icon }: { message: string; icon: string }) {
  return (
    <div className="py-12 text-center rounded-xl bg-[#121215] border border-[#27272a]">
      <span className="material-symbols-outlined text-4xl text-[#52525b] mb-3">
        {icon}
      </span>
      <p className="text-[#71717a]">{message}</p>
    </div>
  );
}

export function EditorLanding({
  drafts,
  completed,
  draftsCount,
  completedCount,
}: EditorLandingProps) {
  const router = useRouter();

  const handleNewReview = () => {
    router.push('/editor/new');
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#fafafa] tracking-tight">
            Editor de Reseñas
          </h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Continúa escribiendo o comienza una nueva reseña
          </p>
        </div>
        <button
          onClick={handleNewReview}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#a78bfa] text-[#09090b] font-medium text-sm hover:bg-[#a78bfa]/90 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Nueva Reseña
        </button>
      </div>

      {/* Drafts Section */}
      <section className="mb-10">
        <SectionHeader
          title="Borradores"
          icon="draft"
          count={draftsCount}
        />
        {drafts.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {drafts.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <EmptySection
            message="No hay borradores. Empieza una nueva reseña."
            icon="edit_off"
          />
        )}
      </section>

      {/* Completed Section */}
      <section>
        <SectionHeader
          title="Completadas"
          icon="task_alt"
          count={completedCount}
        />
        {completed.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completed.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <EmptySection
            message="No hay reseñas completadas."
            icon="check_circle"
          />
        )}
      </section>
    </div>
  );
}