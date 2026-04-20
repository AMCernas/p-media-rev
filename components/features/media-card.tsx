/**
 * MediaCard - Display movie/series info for trending and search results
 * 
 * Used in Dashboard trending section and search results.
 * Shows: poster, title, year, rating
 */

import Link from 'next/link';
import { getTMDBImageUrl, type TMDBSearchResult } from '@/lib/tmdb';
import { cn } from '@/lib/utils';

interface MediaCardProps {
  item: TMDBSearchResult;
  className?: string;
}

export function MediaCard({ item, className }: MediaCardProps) {
  const title = item.title || item.name || 'Unknown';
  const year = item.release_date 
    ? new Date(item.release_date).getFullYear()
    : item.first_air_date 
      ? new Date(item.first_air_date).getFullYear()
      : null;
  const posterUrl = getTMDBImageUrl(item.poster_path ?? null, 'w185');
  const mediaType = item.media_type === 'tv' ? 'series' : 'movie';
  
  return (
    <Link 
      href={`/details/${mediaType}/${item.id}`}
      className={cn(
        'group block rounded-lg border border-border bg-card overflow-hidden',
        'transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10',
        className
      )}
    >
      {/* Poster */}
      <div className="aspect-[2/3] relative bg-muted overflow-hidden">
        {posterUrl ? (
          <img 
            src={posterUrl} 
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <span className="text-xs">No Image</span>
          </div>
        )}
        
        {/* Rating Badge */}
        {item.vote_average && item.vote_average > 0 && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-background/90 text-xs font-medium text-foreground">
            ★ {item.vote_average.toFixed(1)}
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-2 text-foreground">
          {title}
        </h3>
        {year && (
          <p className="text-xs text-muted-foreground mt-1">
            {year}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1 capitalize">
          {mediaType === 'series' ? 'Serie' : 'Película'}
        </p>
      </div>
    </Link>
  );
}