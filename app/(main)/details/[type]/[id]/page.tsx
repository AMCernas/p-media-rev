/**
 * Media Detail - Shows metadata and actions (watchlist, review)
 * 
 * Requirements from spec (REQ-MD-1 to REQ-MD-4):
 * - Get metadata from API (TMDB or Google Books)
 * - Display: title, image, description, date, genres
 * - "Agregar a Watchlist" button
 * - "Escribir Reseña" button that redirects to editor
 */

interface DetailsPageProps {
  params: Promise<{
    type: string;
    id: string;
  }>;
}

export default async function DetailsPage({ params }: DetailsPageProps) {
  const resolved = await params;
  const { type, id } = resolved;

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">
        {type}: {id}
      </h1>
      <p className="text-muted-foreground">
        Media detail functionality coming in future phases.
      </p>
    </div>
  );
}