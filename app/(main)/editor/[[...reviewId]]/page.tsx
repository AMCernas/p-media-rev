/**
 * Editor - Create/edit reviews with auto-draft
 * 
 * Requirements from spec:
 * - REQ-RM-1 to REQ-RM-5: Review management (CRUD, rating validation)
 * - REQ-AD-1 to REQ-AD-4: Auto-draft (1.5s debounce, visual feedback, recovery)
 * 
 * Routes:
 * - /editor - new review
 * - /editor/[reviewId] - edit existing
 * Query params (for new from details):
 * - ?mediaId=X&mediaType=Y
 */

import { EditorClient } from './editor-client';

interface EditorPageProps {
  params: Promise<{
    reviewId?: string[];
  }>;
  searchParams: Promise<{
    mediaId?: string;
    mediaType?: string;
  }>;
}

export default async function EditorPage({ params, searchParams }: EditorPageProps) {
  const resolved = await params;
  const resolvedSearch = await searchParams;
  const reviewId = resolved.reviewId?.[0];
  const mediaId = resolvedSearch.mediaId;
  const mediaType = resolvedSearch.mediaType;

  return (
    <EditorClient
      reviewId={reviewId}
      mediaId={mediaId}
      mediaType={mediaType as 'MOVIE' | 'SERIES' | 'BOOK' | undefined}
    />
  );
}