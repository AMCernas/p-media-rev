/**
 * MediaRow - Reusable horizontal row component for media cards
 * 
 * Server Component that renders a horizontal grid of MediaCards.
 * Used in Dashboard for trending, popular movies, popular series, and popular books.
 */

import Link from 'next/link';
import { getTMDBImageUrl, type TMDBSearchResult } from '@/lib/tmdb';
import { getBookCoverUrl, type GoogleBookVolume } from '@/lib/books';
import { cn } from '@/lib/utils';

interface MediaRowProps {
  title: string;
  items: (TMDBSearchResult | GoogleBookVolume)[];
  mediaType: 'movie' | 'series' | 'book';
}

/**
 * Check if item is a Google Book Volume
 */
function isBook(item: TMDBSearchResult | GoogleBookVolume): item is GoogleBookVolume {
  return 'volumeInfo' in item;
}

/**
 * Get title from item based on type
 */
function getItemTitle(item: TMDBSearchResult | GoogleBookVolume): string {
  if (isBook(item)) {
    return item.volumeInfo.title || 'Unknown';
  }
  return item.title || item.name || 'Unknown';
}

/**
 * Get year from item based on type
 */
function getItemYear(item: TMDBSearchResult | GoogleBookVolume): number | null {
  if (isBook(item)) {
    const date = item.volumeInfo.publishedDate;
    return date ? new Date(date).getFullYear() : null;
  }
  if (item.release_date) {
    return new Date(item.release_date).getFullYear();
  }
  if (item.first_air_date) {
    return new Date(item.first_air_date).getFullYear();
  }
  return null;
}

/**
 * Get poster URL from item based on type
 */
function getItemPosterUrl(item: TMDBSearchResult | GoogleBookVolume): string | null {
  if (isBook(item)) {
    return getBookCoverUrl(item, 'thumbnail');
  }
  return getTMDBImageUrl(item.poster_path ?? null, 'w185');
}

/**
 * Get rating from item based on type
 */
function getItemRating(item: TMDBSearchResult | GoogleBookVolume): number | null {
  if (isBook(item)) {
    return item.volumeInfo.averageRating ?? null;
  }
  return item.vote_average && item.vote_average > 0 ? item.vote_average : null;
}

export function MediaRow({ title, items, mediaType }: MediaRowProps) {
  const displayItems = items.slice(0, 6);
  
  const typeLabel = mediaType === 'series' ? 'Serie' : mediaType === 'book' ? 'Libro' : 'Película';

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#fafafa]">{title}</h2>
      </div>
      {displayItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {displayItems.map((item) => {
            const itemTitle = getItemTitle(item);
            const itemYear = getItemYear(item);
            const posterUrl = getItemPosterUrl(item);
            const rating = getItemRating(item);
            
            // For books, use the book id; for TMDB, use the numeric id
            const itemId = isBook(item) ? item.id : String(item.id);
            const href = mediaType === 'book' 
              ? `/details/book/${itemId}` 
              : `/details/${mediaType}/${itemId}`;

            return (
              <Link 
                key={item.id}
                href={href}
                className={cn(
                  'group block rounded-lg border border-border bg-card overflow-hidden',
                  'transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10'
                )}
              >
                {/* Poster */}
                <div className="aspect-[2/3] relative bg-muted overflow-hidden">
                  {posterUrl ? (
                    <img 
                      src={posterUrl} 
                      alt={itemTitle}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <span className="text-xs">No Image</span>
                    </div>
                  )}
                  
                  {/* Rating Badge */}
                  {rating && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-background/90 text-xs font-medium text-foreground">
                      ★ {rating.toFixed(1)}
                    </div>
                  )}
                </div>
                
                {/* Info */}
                <div className="p-3">
                  <h3 className="font-medium text-sm line-clamp-2 text-foreground">
                    {itemTitle}
                  </h3>
                  {itemYear && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {itemYear}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 capitalize">
                    {typeLabel}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl bg-[#121215] border border-[#27272a] p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-[#a1a1aa] mb-3">
            {mediaType === 'movie' ? 'movie' : mediaType === 'series' ? 'tv' : 'menu_book'}
          </span>
          <p className="text-[#a1a1aa]">No hay {typeLabel.toLowerCase()}s populares disponibles.</p>
        </div>
      )}
    </section>
  );
}