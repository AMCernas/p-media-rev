/**
 * Library - User's watchlist and published reviews
 * 
 * Requirements from spec (REQ-UL-1 to REQ-UL-5):
 * - List all user items (watchlist + reviews)
 * - Filter by type (MOVIE, SERIES, BOOK)
 * - Filter by status (DRAFT, PUBLISHED, WATCHLIST)
 * - Combined filters
 * - Show rating for published reviews
 */

export default function LibraryPage() {
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Library</h1>
      <p className="text-muted-foreground">
        Your library functionality coming in future phases.
      </p>
    </div>
  );
}