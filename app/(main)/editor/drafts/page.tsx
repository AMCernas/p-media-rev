/**
 * Drafts Page - Show all user drafts (no limit)
 * 
 * Route: /editor/drafts
 */

import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';
import { getMovieDetails, getSeriesDetails, getTMDBImageUrl } from '@/lib/tmdb';
import { getBookDetails } from '@/lib/books';
import { $Enums } from '@prisma/client';
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

async function enrichReviews(reviews: EnrichedReview[]): Promise<EnrichedReview[]> {
  const enriched = await Promise.all(
    reviews.map(async (review) => {
      try {
        if (review.mediaType === 'MOVIE') {
          const details = await getMovieDetails(review.mediaId);
          return {
            ...review,
            title: details.title,
            imageUrl: getTMDBImageUrl(details.poster_path, 'w185'),
            year: details.release_date ? details.release_date.split('-')[0] : undefined,
          };
        } else if (review.mediaType === 'SERIES') {
          const details = await getSeriesDetails(review.mediaId);
          return {
            ...review,
            title: details.name,
            imageUrl: getTMDBImageUrl(details.poster_path, 'w185'),
            year: details.first_air_date ? details.first_air_date.split('-')[0] : undefined,
          };
        } else if (review.mediaType === 'BOOK') {
          const details = await getBookDetails(review.mediaId);
          const imageUrl = details.volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://') || null;
          return {
            ...review,
            title: details.volumeInfo.title,
            imageUrl,
            year: details.volumeInfo.publishedDate?.split('-')[0],
          };
        }
      } catch (error) {
        console.warn(`Failed to enrich ${review.mediaType} ${review.mediaId}:`, error);
      }
      return review;
    })
  );
  return enriched;
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

export default async function DraftsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch all drafts (no limit), ordered by updatedAt desc
  const draftsRaw = await prisma.review.findMany({
    where: {
      userId: user.id,
      status: 'DRAFT' as $Enums.ReviewStatus,
    },
    orderBy: { updatedAt: 'desc' },
  });

  const drafts = await enrichReviews(draftsRaw);

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
          Todos los Borradores
        </h1>
        <p className="text-sm text-[#a1a1aa] mt-1">
          {drafts.length} {drafts.length === 1 ? 'borrador' : 'borradores'}
        </p>
      </div>

      {/* Drafts Grid */}
      {drafts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drafts.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center rounded-xl bg-[#121215] border border-[#27272a]">
          <span className="material-symbols-outlined text-4xl text-[#52525b] mb-3">
            edit_off
          </span>
          <p className="text-[#71717a]">No hay borradores. Empieza una nueva reseña.</p>
        </div>
      )}
    </div>
  );
}