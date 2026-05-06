"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ReviewCard } from '@/components/features/review-card';
import { WatchlistSection } from '@/components/features/watchlist-section';
import type { Review, MediaType, ReviewStatus } from '@/lib/types';

/**
 * Client component for Library page
 * Handles filtering, search, and pagination
 */

interface LibraryClientProps {
  initialReviews: Review[];
  watchlistItems: Array<{
    id: string;
    mediaId: string;
    mediaType: MediaType;
    title?: string;
    imageUrl?: string | null;
    year?: string;
  }>;
  watchlistCount: number;
  draftsCount: number;
  publishedCount: number;
  // New pagination props
  initialPage?: number;
  initialSearch?: string;
  totalReviews?: number;
  hasMore?: boolean;
}

type FilterType = MediaType | 'ALL';
type FilterStatus = ReviewStatus | 'ALL';

export function LibraryClient({
  initialReviews,
  watchlistItems,
  watchlistCount,
  draftsCount,
  publishedCount,
  initialPage = 1,
  initialSearch = '',
  totalReviews: initialTotalReviews = 0,
  hasMore: initialHasMore = false,
}: LibraryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter state
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [activeTab, setActiveTab] = useState<'all' | 'watchlist' | 'reviews'>('all');

  // Refresh trigger for re-fetching data
  const [refreshKey, setRefreshKey] = useState(0);

  // Pagination & Search state
  const [allLoadedReviews, setAllLoadedReviews] = useState<Review[]>(initialReviews);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [totalReviews, setTotalReviews] = useState(initialTotalReviews);

  // Debounce ref for search
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with initial data when page changes
  useEffect(() => {
    setAllLoadedReviews(initialReviews);
    setCurrentPage(initialPage);
    setTotalReviews(initialTotalReviews);
    setHasMore(initialHasMore);
  }, [initialReviews, initialPage, initialTotalReviews, initialHasMore]);

  // Sync searchQuery with URL search params
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    setSearchQuery(urlSearch);
  }, [searchParams]);

  // Handle search with debounce
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    
    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Set new timeout
    debounceRef.current = setTimeout(() => {
      // Reset to page 1 when searching
      const params = new URLSearchParams();
      if (value) params.set('search', value);
      params.set('page', '1');
      router.push(`/library?${params.toString()}`);
    }, 300);
  }, [router]);

  // Load more function
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    const nextPage = currentPage + 1;
    
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      params.set('page', nextPage.toString());
      params.set('limit', '12');
      
      const response = await fetch(`/api/reviews?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setAllLoadedReviews(prev => [...prev, ...data.reviews]);
        setCurrentPage(nextPage);
        setHasMore(data.hasMore);
        setTotalReviews(data.total);
      }
    } catch (error) {
      console.error('Error loading more:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, hasMore, isLoading, searchQuery]);

  // Separate items by type
  const reviewItems = useMemo(() => {
    return allLoadedReviews.filter(r => r.status !== 'WATCHLIST');
  }, [allLoadedReviews]);

  // Filtered items based on current filters (client-side)
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
    { id: 'all' as const, label: 'Todo', count: watchlistCount + totalReviews },
    { id: 'watchlist' as const, label: 'Watchlist', count: watchlistCount },
    { id: 'reviews' as const, label: 'Reseñas', count: totalReviews || allLoadedReviews.length },
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
    { value: 'COMPLETED', label: 'Completadas' },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-[#fafafa] mb-6">Mi Biblioteca</h1>

      {/* Hero Stats - Bento Grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl bg-gradient-to-br from-[#a78bfa]/20 to-[#a78bfa]/5 border border-[#a78bfa]/20 p-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-[#a78bfa]">bookmark</span>
          </div>
          <div className="text-3xl font-bold text-[#fafafa]">{watchlistCount}</div>
          <div className="text-sm text-[#a1a1aa]">En Watchlist</div>
        </div>
        <div className="rounded-xl bg-[#121215] border border-[#27272a] p-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-[#fb923c]">draft</span>
          </div>
          <div className="text-3xl font-bold text-[#fafafa]">{draftsCount}</div>
          <div className="text-sm text-[#a1a1aa]">Borradores</div>
        </div>
        <div className="rounded-xl bg-[#121215] border border-[#27272a] p-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-[#34d399]">publish</span>
          </div>
          <div className="text-3xl font-bold text-[#fafafa]">{publishedCount}</div>
          <div className="text-sm text-[#a1a1aa]">Publicadas</div>
        </div>
      </div>

      {/* Tabs - with aria-pressed for accessibility */}
      <div className="flex gap-2 mb-4 p-1 rounded-xl bg-[#121215] border border-[#27272a]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            aria-pressed={activeTab === tab.id}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-[#a78bfa] text-[#09090b]"
                : "text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b]"
            )}
          >
            {tab.label}
            <span className="text-xs opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Search Bar - Only show for reviews tab */}
      {activeTab === 'reviews' && (
        <div className="mb-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#52525b]">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar por título..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className={cn(
                "w-full pl-10 pr-4 py-2.5 rounded-xl",
                "bg-[#121215] border border-[#27272a]",
                "text-[#fafafa] placeholder-[#52525b]",
                "focus:outline-none focus:border-[#a78bfa] focus:ring-1 focus:ring-[#a78bfa]/50",
                "transition-colors"
              )}
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#fafafa]"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filters - Only show for reviews tab */}
      {activeTab === 'reviews' && (
        <div className="flex flex-wrap gap-4 mb-6 p-4 rounded-xl bg-[#121215] border border-[#27272a]">
          {/* Type filter */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-[#a1a1aa]">Tipo:</label>
            <div className="flex gap-2">
              {typeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilterType(option.value)}
                  aria-pressed={filterType === option.value}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-lg transition-colors",
                    filterType === option.value
                      ? "bg-[#a78bfa] text-[#09090b]"
                      : "bg-[#18181b] text-[#a1a1aa] hover:text-[#fafafa]"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-[#a1a1aa]">Estado:</label>
            <div className="flex gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilterStatus(option.value)}
                  aria-pressed={filterStatus === option.value}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-lg transition-colors",
                    filterStatus === option.value
                      ? "bg-[#a78bfa] text-[#09090b]"
                      : "bg-[#18181b] text-[#a1a1aa] hover:text-[#fafafa]"
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
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    mediaTitle={review.title}
                  />
                ))}
              </div>
              {/* Load More Button */}
              {hasMore && (
                <div className="mt-8 text-center">
                  <button
                    onClick={loadMore}
                    disabled={isLoading}
                    className={cn(
                      "px-6 py-3 rounded-xl font-medium transition-colors",
                      isLoading
                        ? "bg-[#27272a] text-[#52525b] cursor-not-allowed"
                        : "bg-[#a78bfa]/10 text-[#a78bfa] hover:bg-[#a78bfa]/20 border border-[#a78bfa]/30"
                    )}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⏳</span>
                        Cargando...
                      </span>
                    ) : (
                      'Cargar más'
                    )}
                  </button>
                </div>
              )}
              {!hasMore && filteredReviews.length > 0 && (
                <div className="mt-8 text-center text-sm text-[#52525b]">
                  {totalReviews > 0 ? `Mostrando ${filteredReviews.length} de ${totalReviews} reseñas` : 'No hay más reseñas'}
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center rounded-xl bg-[#121215] border border-[#27272a]">
              <span className="material-symbols-outlined text-4xl text-[#a1a1aa] mb-3">search_off</span>
              <p className="text-[#a1a1aa]">
                {searchQuery ? `No hay reseñas que coincidan con "${searchQuery}"` : 'No hay reseñas que coincidan con los filtros'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="mt-4 text-sm text-[#a78bfa] hover:underline"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          )
        )}

        {activeTab === 'all' && (
          <>
            {/* Watchlist section */}
            {watchlistItems.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-[#fafafa] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#a78bfa]">bookmark</span>
                  Watchlist
                </h2>
                <WatchlistSection
                  items={watchlistItems}
                  onRemove={handleRemoveFromWatchlist}
                />
              </div>
            )}

            {/* Reviews section - paginated */}
            {reviewItems.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-[#fafafa] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#34d399]">edit_note</span>
                  Reseñas
                  <span className="text-sm text-[#52525b] font-normal">
                    ({totalReviews || reviewItems.length})
                  </span>
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {reviewItems.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      mediaTitle={review.title}
                    />
                  ))}
                </div>
                {/* Load More for "all" tab */}
                {hasMore && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={loadMore}
                      disabled={isLoading}
                      className={cn(
                        "px-6 py-3 rounded-xl font-medium transition-colors",
                        isLoading
                          ? "bg-[#27272a] text-[#52525b] cursor-not-allowed"
                          : "bg-[#a78bfa]/10 text-[#a78bfa] hover:bg-[#a78bfa]/20 border border-[#a78bfa]/30"
                      )}
                    >
                      {isLoading ? 'Cargando...' : 'Cargar más'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {watchlistItems.length === 0 && reviewItems.length === 0 && (
              <div className="py-12 text-center rounded-xl bg-[#121215] border border-[#27272a]">
                <span className="material-symbols-outlined text-4xl text-[#a1a1aa] mb-3">library_books</span>
                <p className="text-[#fafafa] font-medium">
                  Tu biblioteca está vacía
                </p>
                <p className="text-sm text-[#a1a1aa] mt-2">
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