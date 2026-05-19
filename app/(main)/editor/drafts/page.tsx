/**
 * Drafts Page - Show user drafts with pagination (12 items per page)
 * 
 * Route: /editor/drafts
 */

import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';
import { enrichReviewItems } from '@/lib/enrich';
import { DraftsClient } from './drafts-client';

const LIMIT = 12;

export default async function DraftsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch initial 12 drafts + total count for pagination
  const [draftsRaw, totalCount] = await Promise.all([
    prisma.review.findMany({
      where: {
        userId: user.id,
        status: 'DRAFT',
      },
      orderBy: { updatedAt: 'desc' },
      take: LIMIT,
    }),
    prisma.review.count({
      where: {
        userId: user.id,
        status: 'DRAFT',
      },
    }),
  ]);

  const draftsTyped = await enrichReviewItems(draftsRaw);
  const drafts = draftsTyped as unknown as any[];
  const totalPages = Math.ceil(totalCount / LIMIT);
  const hasMore = totalPages > 1;

  return (
    <DraftsClient
      initialDrafts={drafts}
      totalCount={totalCount}
      hasMore={hasMore}
    />
  );
}