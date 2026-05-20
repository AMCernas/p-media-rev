/**
 * Completed Reviews Page - Show user completed reviews with pagination (12 items per page)
 * 
 * Route: /editor/completed
 */

import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';
import { enrichReviewItems } from '@/lib/enrich';
import { CompletedClient } from './completed-client';

const LIMIT = 12;

export default async function CompletedPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch initial 12 completed reviews + total count for pagination
  const [reviewsRaw, totalCount] = await Promise.all([
    prisma.review.findMany({
      where: {
        userId: user.id,
        status: 'COMPLETED',
      },
      orderBy: { updatedAt: 'desc' },
      take: LIMIT,
    }),
    prisma.review.count({
      where: {
        userId: user.id,
        status: 'COMPLETED',
      },
    }),
  ]);

  const reviewsTyped = await enrichReviewItems(reviewsRaw);
  const reviews = reviewsTyped as unknown as any[];
  const totalPages = Math.ceil(totalCount / LIMIT);
  const hasMore = totalPages > 1;

  return (
    <CompletedClient
      initialReviews={reviews}
      totalCount={totalCount}
      hasMore={hasMore}
    />
  );
}