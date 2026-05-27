"use client";

import { useState, useCallback } from 'react';
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
  title?: string | null;
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
    return <span className="text-sm text-muted-3">Sin rating</span>;
  }

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={cn(
            'text-sm',
            star <= rating ? 'text-yellow-400' : 'text-muted-3'
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
function ReviewCard({ review, onDelete }: { review: EnrichedReview; onDelete?: (id: string) => void }) {
  const contentPreview = review.content?.substring(0, 120)?.trim();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Confirm dialog
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar esta ${review.status === 'DRAFT' ? 'borrador' : 'reseña'}?`
    );
    
    if (!confirmed) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/reviews/${review.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok && onDelete) {
        onDelete(review.id);
      } else {
        alert('Error al eliminar');
      }
    } catch (error) {
      alert('Error al eliminar');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <a
      href={`/editor/${review.id}`}
      className={cn(
        'block w-full text-left p-4 rounded-xl border bg-card',
        'hover:bg-accent hover:border-primary/30',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary/50',
        isDeleting && 'opacity-50 pointer-events-none'
      )}
    >
      {/* Header: Type and Title + Delete button */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <MediaTypeBadge mediaType={review.mediaType} />
          {review.title && (
            <span className="font-medium text-foreground text-sm truncate">
              {review.title}
            </span>
          )}
        </div>
        <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className={cn(
              'flex-shrink-0 p-2 rounded-lg border',
              'text-muted-3 hover:text-destructive hover:border-destructive/50',
              'focus:outline-none focus:ring-2 focus:ring-destructive/50',
              'transition-colors duration-150',
              isDeleting && 'opacity-50 cursor-not-allowed'
            )}
            title="Eliminar"
          >
            {isDeleting ? (
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
            <p className="text-xs text-muted-3 mt-1">{review.year}</p>
          )}
        </div>
      </div>

      {/* Content Preview */}
      {contentPreview && (
        <p className="text-sm text-muted-2 line-clamp-2 mb-3">
          {contentPreview}...
        </p>
      )}

      {/* Footer: Date */}
      <div className="mt-auto pt-3 border-t border-border">
        <span className="text-xs text-muted-3">
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
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">{icon}</span>
        {title}
      </h2>
      <span className="text-sm px-3 py-1 rounded-full bg-card border border-border text-muted-foreground">
        {count} {count === 1 ? 'ítem' : 'ítems'}
      </span>
    </div>
  );
}

/**
 * Button to view all items in a section
 */
function ViewAllButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className={cn(
        'inline-flex items-center gap-1 px-4 py-2 rounded-lg',
        'text-sm font-medium text-primary',
        'bg-primary/10 border border-primary/30',
        'hover:bg-primary/20 hover:border-primary/50',
        'transition-all duration-200'
      )}
    >
      {label}
      <span className="material-symbols-outlined text-sm">arrow_forward</span>
    </a>
  );
}

/**
 * Empty state for section
 */
function EmptySection({ message, icon }: { message: string; icon: string }) {
  return (
    <div className="py-12 text-center rounded-xl bg-card border border-border">
      <span className="material-symbols-outlined text-4xl text-muted-3 mb-3">
        {icon}
      </span>
      <p className="text-muted-2">{message}</p>
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
  
  const handleDelete = useCallback((id: string) => {
    // Filter out the deleted item locally for immediate feedback
    // The page will fully refresh via router.refresh() below
    router.refresh();
  }, [router]);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Editor de Reseñas
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Continúa escribiendo tus reseñas desde la página de detalles
        </p>
      </div>

      {/* Drafts Section */}
      <section className="mb-10">
        <SectionHeader
          title="Borradores"
          icon="draft"
          count={draftsCount}
        />
        {drafts.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {drafts.map((review) => (
                <ReviewCard key={review.id} review={review} onDelete={handleDelete} />
              ))}
            </div>
            {draftsCount > 6 && (
              <div className="mt-6 text-center">
                <ViewAllButton href="/editor/drafts" label="Ver todos los borradores" />
              </div>
            )}
          </>
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
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {completed.map((review) => (
                <ReviewCard key={review.id} review={review} onDelete={handleDelete} />
              ))}
            </div>
            {completedCount > 6 && (
              <div className="mt-6 text-center">
                <ViewAllButton href="/editor/completed" label="Ver todas las reseñas" />
              </div>
            )}
          </>
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