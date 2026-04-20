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
 */

interface EditorPageProps {
  params: Promise<{
    reviewId?: string[];
  }>;
}

export default async function EditorPage({ params }: EditorPageProps) {
  const resolved = await params;
  const reviewId = resolved.reviewId?.[0];

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">
        {reviewId ? "Edit Review" : "New Review"}
      </h1>
      <p className="text-muted-foreground">
        Editor functionality coming in future phases.
      </p>
    </div>
  );
}