/**
 * DetailHero - Large hero section for media detail page
 * 
 * Shows: backdrop image, poster, title, year, rating, genres
 * Used in /details/[type]/[id] pages
 */

import Image from 'next/image';
import { getTMDBImageUrl } from '@/lib/tmdb';
import { cn } from '@/lib/utils';

interface DetailHeroProps {
  /** Media title */
  title: string;
  /** Original title or subtitle */
  subtitle?: string | null;
  /** Backdrop image path (TMDB) or cover URL (Books) */
  backdropUrl?: string | null;
  /** Poster image path (TMDB) or cover URL (Books) */
  posterUrl?: string | null;
  /** Release/production year */
  year?: string;
  /** Vote average (TMDB) or average rating (Books) */
  rating?: number | null;
  /** Genre names or categories */
  genres?: string[];
  /** Short description or synopsis */
  overview?: string | null;
  /** Media type label */
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
  overview,
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
      
      {/* Content */}
      <div className="relative z-10 container px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
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
          <div className="flex-1 text-center md:text-left">
            {/* Type and Year */}
            <div className="flex items-center justify-center md:justify-start gap-3 text-sm text-muted-foreground mb-2">
              <span className="capitalize">{mediaTypeLabel}</span>
              {year && (
                <>
                  <span>•</span>
                  <span>{year}</span>
                </>
              )}
            </div>
            
            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-2">
              {title}
            </h1>
            
            {/* Subtitle */}
            {subtitle && (
              <p className="text-xl text-muted-foreground mb-4">
                {subtitle}
              </p>
            )}
            
            {/* Rating and Genres */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-4">
              {rating !== undefined && rating !== null && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">
                  <span>★</span>
                  <span>{rating.toFixed(1)}</span>
                </div>
              )}
              
              {genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {genres.slice(0, 4).map((genre) => (
                    <span
                      key={genre}
                      className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm"
                    >
                      {genre}
                    </span>
                  ))}
                  {genres.length > 4 && (
                    <span className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm">
                      +{genres.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* Overview */}
            {overview && (
              <p className="text-muted-foreground max-w-2xl leading-relaxed">
                {overview.length > 300 ? `${overview.slice(0, 300)}...` : overview}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}