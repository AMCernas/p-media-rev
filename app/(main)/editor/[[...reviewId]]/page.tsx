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
import { enrichReviewItems } from '@/lib/enrich';
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

// Wrapper que usa enrichReviewItems de lib/enrich
async function enrichReviews(reviews: ReviewData[]): Promise<ReviewData[]> {
  return enrichReviewItems(reviews as any) as any;
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

  // Get media info for header (enrich review with title/imageUrl/year)
  let mediaTitle: string | undefined;
  let mediaImageUrl: string | undefined;
  let mediaYear: string | undefined;

  // Case 1: Editing existing review (has reviewId)
  if (reviewId) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (review) {
      const enriched = await enrichReviews([{
        id: review.id,
        mediaId: review.mediaId,
        mediaType: review.mediaType,
        status: review.status,
        rating: review.rating,
        content: review.content,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      }]);
      if (enriched[0]) {
        mediaTitle = enriched[0].title || undefined;
        mediaImageUrl = enriched[0].imageUrl || undefined;
        mediaYear = enriched[0].year;
      }
    }
  } 
  // Case 2: Creating new review from details (has mediaId + mediaType)
  else if (mediaId && mediaType) {
    const enriched = await enrichReviews([{
      id: '',
      mediaId,
      mediaType: mediaType as any,
      status: 'DRAFT',
      rating: null,
      content: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);
    if (enriched[0]) {
      mediaTitle = enriched[0].title || undefined;
      mediaImageUrl = enriched[0].imageUrl || undefined;
      mediaYear = enriched[0].year;
    }
  }

  // reviewId exists OR query params for new review (no duplicate found)
  return (
    <EditorClient
      reviewId={reviewId}
      mediaId={mediaId}
      mediaType={mediaType}
      mediaTitle={mediaTitle}
      mediaImageUrl={mediaImageUrl}
      mediaYear={mediaYear}
    />
  );
}