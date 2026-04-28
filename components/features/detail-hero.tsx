/**
 * DetailHero - Large hero section for media detail page
 * 
 * Shows: backdrop image, poster, title, year, rating, genres
 * Used in /details/[type]/[id] pages
 */

import { getTMDBImageUrl } from '@/lib/tmdb';
import { cn } from '@/lib/utils';

interface DetailHeroProps {
  title: string;
  subtitle?: string | null;
  backdropUrl?: string | null;
  posterUrl?: string | null;
  year?: string;
  rating?: number | null;
  genres?: string[];
  overview?: string | null;
  mediaTypeLabel: string;
  className?: string;
}

export function DetailHero({
  title,
  subtitle,
  backdropUrl,
  posterUrl,
  year,
  rating,
  genres = [],
  overview: _overview,
  mediaTypeLabel,
  className,
}: DetailHeroProps) {
  return (
    <div className={cn('relative w-full', className)}>
      {/* Backdrop */}
      {backdropUrl && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
          <img
            src={backdropUrl}
            alt=""
            className="w-full h-full object-cover blur-sm scale-105"
          />
        </div>
      )}
      
      <div className="relative z-10 container px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          {/* Poster */}
          <div className="flex-shrink-0 w-48 mx-auto md:mx-0">
            <div className="aspect-[2/3] relative rounded-lg overflow-hidden shadow-2xl bg-card border border-border">
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <span className="text-sm">No Image</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Info */}
          <div className="flex-1 text-center md:text-left md:self-center">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
              <span className="px-2.5 py-1 rounded-md bg-[#27272a]/80 text-[#e4e4e7] text-xs font-medium border border-white/5">
                {mediaTypeLabel}
              </span>
              {year && (
                <span className="px-2.5 py-1 rounded-md bg-[#27272a]/80 text-[#e4e4e7] text-xs font-medium border border-white/5">
                  {year}
                </span>
              )}
            </div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#fafafa] mb-2">
              {title}
            </h1>
            
            {subtitle && (
              <p className="text-xl text-[#d4d4d8] italic mb-4">
                {subtitle}
              </p>
            )}
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              {rating !== undefined && rating !== null && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#09090b]/70 text-[#fbbf24] font-bold backdrop-blur-sm border border-white/10">
                  <span>★</span>
                  <span>{rating.toFixed(1)}</span>
                </div>
              )}
              
              {genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {genres.slice(0, 4).map((genre) => (
                    <span
                      key={genre}
                      className="px-3 py-1.5 rounded-full bg-[#27272a]/80 text-[#e4e4e7] text-sm border border-white/5 backdrop-blur-sm"
                    >
                      {genre}
                    </span>
                  ))}
                  {genres.length > 4 && (
                    <span className="px-3 py-1.5 rounded-full bg-[#27272a]/80 text-[#e4e4e7] text-sm border border-white/5 backdrop-blur-sm">
                      +{genres.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}