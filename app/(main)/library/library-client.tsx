"use client";

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ReviewCard } from '@/components/features/review-card';
import { WatchlistSection } from '@/components/features/watchlist-section';
import type { Review, MediaType, ReviewStatus } from '@/lib/types';

/**
 * Client component for Library page
 * Handles filtering and interactive functionality
 */

interface LibraryClientProps {
  initialReviews: Review[];
  watchlistCount: number;
  draftsCount: number;
  publishedCount: number;
}

type FilterType = MediaType | 'ALL';
type FilterStatus = ReviewStatus | 'ALL';

interface WatchlistItem {
  id: string;
  mediaId: string;
  mediaType: MediaType;
  title?: string;
  imageUrl?: string | null;
  year?: string;
}

export function LibraryClient({
  initialReviews,
  watchlistCount,
  draftsCount,
  publishedCount,
}: LibraryClientProps) {
  const router = useRouter();

  // Filter state
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [activeTab, setActiveTab] = useState<'all' | 'watchlist' | 'reviews'>('all');

  // Refresh trigger for re-fetching data
  const [refreshKey, setRefreshKey] = useState(0);

  // Separate items by type
  const watchlistItems: WatchlistItem[] = useMemo(() => {
    return initialReviews
      .filter(r => r.status === 'WATCHLIST')
      .map(r => ({
        id: r.id,
        mediaId: r.mediaId,
        mediaType: r.mediaType,
      }));
  }, [initialReviews]);

  const reviewItems = useMemo(() => {
    return initialReviews.filter(r => r.status !== 'WATCHLIST');
  }, [initialReviews]);

  // Filtered items based on current filters
  const filteredReviews = useMemo(() => {
    let items = reviewItems;

    // Filter by type
    if (filterType !== 'ALL') {
      items = items.filter(r => r.mediaType === filterType);
    }

    // Filter by status
    if (filterStatus !== 'ALL') {
      items = items.filter(r => r.status === filterStatus);
    }

    return items;
  }, [reviewItems, filterType, filterStatus]);

  // Handle removing from watchlist
  const handleRemoveFromWatchlist = useCallback(async (mediaId: string, mediaType: MediaType) => {
    const response = await fetch('/api/reviews', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaId, mediaType }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to remove' }));
      return { success: false, error: error.error };
    }

    // Trigger refresh
    setRefreshKey(k => k + 1);
    router.refresh();

    return { success: true };
  }, [router]);

  // Tab configuration
  const tabs = [
    { id: 'all' as const, label: 'Todo', count: initialReviews.length },
    { id: 'watchlist' as const, label: 'Watchlist', count: watchlistCount },
    { id: 'reviews' as const, label: 'Reseñas', count: draftsCount + publishedCount },
  ];

  // Type filter options
  const typeOptions: { value: FilterType; label: string }[] = [
    { value: 'ALL', label: 'Todos' },
    { value: 'MOVIE', label: 'Películas' },
    { value: 'SERIES', label: 'Series' },
    { value: 'BOOK', label: 'Libros' },
  ];

  // Status filter options
  const statusOptions: { value: FilterStatus; label: string }[] = [
    { value: 'ALL', label: 'Todos' },
    { value: 'DRAFT', label: 'Borradores' },
    { value: 'PUBLISHED', label: 'Publicadas' },
  ];

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Mi Biblioteca</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-lg border bg-card">
          <div className="text-2xl font-bold">{watchlistCount}</div>
          <div className="text-sm text-muted-foreground">En Watchlist</div>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="text-2xl font-bold">{draftsCount}</div>
          <div className="text-sm text-muted-foreground">Borradores</div>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="text-2xl font-bold">{publishedCount}</div>
          <div className="text-sm text-muted-foreground">Publicadas</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg bg-muted/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            <span className="ml-2 text-xs opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Filters - Only show for reviews tab */}
      {activeTab === 'reviews' && (
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Type filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Tipo:</label>
            <div className="flex gap-1">
              {typeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilterType(option.value)}
                  className={cn(
                    'px-3 py-1 text-sm rounded-md transition-colors',
                    filterType === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Estado:</label>
            <div className="flex gap-1">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilterStatus(option.value)}
                  className={cn(
                    'px-3 py-1 text-sm rounded-md transition-colors',
                    filterStatus === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div key={refreshKey}>
        {activeTab === 'watchlist' && (
          <WatchlistSection
            items={watchlistItems}
            onRemove={handleRemoveFromWatchlist}
          />
        )}

        {activeTab === 'reviews' && (
          filteredReviews.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">
                No hay reseñas que coincidan con los filtros
              </p>
            </div>
          )
        )}

        {activeTab === 'all' && (
          <>
            {/* Watchlist section */}
            {watchlistItems.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Watchlist</h2>
                <WatchlistSection
                  items={watchlistItems}
                  onRemove={handleRemoveFromWatchlist}
                />
              </div>
            )}

            {/* Reviews section */}
            {reviewItems.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Reseñas</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {reviewItems.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                    />
                  ))}
                </div>
              </div>
            )}

            {watchlistItems.length === 0 && reviewItems.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">
                  Tu biblioteca está vacía
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Busca películas, series o libros para agregar a tu lista
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}