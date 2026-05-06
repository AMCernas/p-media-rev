/**
 * Editor - Create/edit reviews with auto-draft
 * 
 * Routes:
 * - /editor (empty) - Landing page with drafts/completed reviews
 * - /editor/new - New review form
 * - /editor/[reviewId] - Edit existing review
 * 
 * Query params (for new from details):
 * - ?mediaId=X&mediaType=Y
 */

import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';
import { getMovieDetails, getSeriesDetails, getTMDBImageUrl } from '@/lib/tmdb';
import { getBookDetails } from '@/lib/books';
import { EditorClient } from './editor-client';
import { EditorLanding } from './editor-landing';
import type { MediaType } from '@/lib/types';
import type { ReviewStatus, $Enums } from '@prisma/client';

interface EditorPageProps {
  params: Promise<{
    reviewId?: string[];
  }>;
  searchParams: Promise<{
    mediaId?: string;
    mediaType?: string;
  }>;
}

interface ReviewData {
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

async function enrichReviews(reviews: ReviewData[]): Promise<ReviewData[]> {
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

export default async function EditorPage({ params, searchParams }: EditorPageProps) {
  const resolved = await params;
  const resolvedSearch = await searchParams;
  const reviewId = resolved.reviewId?.[0];
  const mediaId = resolvedSearch.mediaId;
  const mediaType = resolvedSearch.mediaType as MediaType | undefined;

  // Check if this is a new review from query params (mediaId present)
  const isNewFromQuery = mediaId && mediaType;

  // No reviewId and no query params means landing page
  if (!reviewId && !isNewFromQuery) {
    const user = await getAuthenticatedUser();

    if (!user) {
      redirect('/login');
    }

    // Fetch user's drafts and completed reviews (limit 6 for landing page)
    const [draftsRaw, completedRaw, draftsCount, completedCount] = await Promise.all([
      prisma.review.findMany({
        where: {
          userId: user.id,
          status: 'DRAFT' as $Enums.ReviewStatus,
        },
        orderBy: { updatedAt: 'desc' },
        take: 6,
      }),
      prisma.review.findMany({
        where: {
          userId: user.id,
          status: 'COMPLETED' as $Enums.ReviewStatus,
        },
        orderBy: { updatedAt: 'desc' },
        take: 6,
      }),
      prisma.review.count({
        where: {
          userId: user.id,
          status: 'DRAFT' as $Enums.ReviewStatus,
        },
      }),
      prisma.review.count({
        where: {
          userId: user.id,
          status: 'COMPLETED' as $Enums.ReviewStatus,
        },
      }),
    ]);

    // Enrich with media metadata
    const [drafts, completed] = await Promise.all([
      enrichReviews(draftsRaw),
      enrichReviews(completedRaw),
    ]);

    return (
      <EditorLanding
        drafts={drafts}
        completed={completed}
        draftsCount={draftsCount}
        completedCount={completedCount}
      />
    );
  }

  // If coming from details with mediaId/mediaType, check if review already exists
  // and redirect to it instead of creating a new one (avoids 409 Conflict)
  if (mediaId && mediaType) {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      // Not authenticated → redirect to login
      redirect('/login');
    }
    
    const existing = await prisma.review.findFirst({
      where: {
        userId: user.id,
        mediaId,
        mediaType: mediaType as any,
      },
    });
    
    if (existing) {
      // Redirect to existing review instead of creating new draft
      redirect(`/editor/${existing.id}`);
    }
  }

  // reviewId exists OR query params for new review (no duplicate found)
  return (
    <EditorClient
      reviewId={reviewId}
      mediaId={mediaId}
      mediaType={mediaType}
    />
  );
}