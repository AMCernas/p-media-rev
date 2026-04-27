/**
 * Dashboard - Protected page showing trending content and user activity
 * 
 * Requirements from spec (REQ-DB-1 to REQ-DB-4):
 * - Show "Trending" section from TMDB
 * - Show "Vistos Recientemente" from DB
 * - Show stats: total watchlist, total reviews, published reviews
 * - Server Component (fetching on server)
 * 
 * Must be dynamically rendered because Prisma needs runtime to connect to DB
 */
export const dynamic = 'force-dynamic';

import { getAuthenticatedUser } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';
import { getTrending, getMovieDetails, getSeriesDetails, getTMDBImageUrl, type TMDBSearchResult } from '@/lib/tmdb';
import { getBookDetails } from '@/lib/books';
import type { ReviewStatus, MediaType } from '@/lib/types';
import Link from "next/link";
import { MediaCard } from '@/components/features/media-card';
import { SearchBox } from '@/components/features/search-box';

/**
 * Fetch user statistics from database
 */
async function getUserStats(userId: string) {
  const [watchlistCount, reviewsCount, publishedCount] = await Promise.all([
    // Total watchlist items
    prisma.review.count({
      where: { 
        userId,
        status: 'WATCHLIST',
      },
    }),
    // Total reviews (all statuses)
    prisma.review.count({
      where: { userId },
    }),
    // Published reviews (now called COMPLETED)
    prisma.review.count({
      where: { 
        userId,
        status: 'COMPLETED' as const,
      },
    }),
  ]);

  return { watchlistCount, reviewsCount, publishedCount };
}

/**
 * Fetch recent activity (last 5 items updated)
 */
async function getRecentActivity(userId: string) {
  return prisma.review.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  });
}

/**
 * Enrich recent activity items with metadata from external APIs
 */
async function enrichRecentActivity(
  items: Array<{ id: string; mediaId: string; mediaType: string; status: string; rating: number | null; updatedAt: Date }>
): Promise<Array<{ id: string; mediaId: string; mediaType: string; status: string; rating: number | null; updatedAt: Date; title?: string; imageUrl?: string | null }>> {
  const enriched = await Promise.all(
    items.map(async (item) => {
      try {
        if (item.mediaType === 'MOVIE') {
          const details = await getMovieDetails(item.mediaId);
          return {
            ...item,
            title: details.title,
            imageUrl: getTMDBImageUrl(details.poster_path, 'w185'),
          };
        } else if (item.mediaType === 'SERIES') {
          const details = await getSeriesDetails(item.mediaId);
          return {
            ...item,
            title: details.name,
            imageUrl: getTMDBImageUrl(details.poster_path, 'w185'),
          };
        } else if (item.mediaType === 'BOOK') {
          const details = await getBookDetails(item.mediaId);
          const imageUrl = details.volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://') || null;
          return {
            ...item,
            title: details.volumeInfo.title,
            imageUrl,
          };
        }
      } catch (error) {
        console.warn(`Failed to enrich ${item.mediaType} ${item.mediaId}:`, error);
      }
      return { ...item };
    })
  );
  return enriched;
}

/**
 * Get media title from mediaId (simplified - just store in activity)
 * For full details, we'd need to query TMDB/Books
 */
function getMediaTypeLabel(type: string) {
  switch (type) {
    case 'MOVIE': return 'Película';
    case 'SERIES': return 'Serie';
    case 'BOOK': return 'Libro';
    default: return type;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'WATCHLIST': return 'Watchlist';
    case 'DRAFT': return 'Borrador';
    case 'COMPLETED': return 'Completada';
    default: return status;
  }
}

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    return (
      <div className="container py-8">
        <p className="text-[#a1a1aa]">Debes iniciar sesión para ver el dashboard.</p>
      </div>
    );
  }

  // Fetch data in parallel
  const [trendingData, stats, recentActivityRaw] = await Promise.all([
    // 7.2: Fetch Trending from TMDB
    getTrending(1).catch((error) => {
      console.error('Failed to fetch trending:', error);
      return { results: [] as TMDBSearchResult[], total_results: 0 };
    }),
    // 7.4: Get User Statistics
    getUserStats(user.id),
    // 7.3: Fetch Activity from DB
    getRecentActivity(user.id).catch((error) => {
      console.error('Failed to fetch recent activity:', error);
      return [];
    }),
  ]);

  const enrichedActivity = await enrichRecentActivity(recentActivityRaw as Array<{ id: string; mediaId: string; mediaType: string; status: string; rating: number | null; updatedAt: Date }>);

  const trending = trendingData.results.slice(0, 6); // Limit to 6 items
  const recentActivity = enrichedActivity;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#fafafa]">Dashboard</h1>
          <p className="text-[#a1a1aa] mt-1">
            Bienvenido de nuevo, {user.email?.split('@')[0] || 'Usuario'}
          </p>
        </div>
        <div className="hidden md:block flex-1 max-w-sm">
          <SearchBox
            placeholder="Buscar películas, series, libros..."
            closeOnBlur={false}
          />
        </div>
      </div>

      {/* 7.4: Stats Bento - Bento Grid Layout */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-4">
          {/* Hero Card - Watchlist */}
          <div className="col-span-2 lg:col-span-6 lg:row-span-2 rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] p-6 flex flex-col justify-between min-h-[180px]">
            <div>
              <p className="text-white/80 text-sm font-medium">En tu Watchlist</p>
              <p className="text-5xl font-bold text-white mt-2">{stats.watchlistCount}</p>
            </div>
            <Link href="/library?tab=watchlist" className="text-white/90 text-sm font-medium hover:text-white transition-colors">
              Ver Biblioteca →
            </Link>
          </div>

          {/* Reviews Card */}
          <div className="col-span-1 lg:col-span-3 rounded-xl bg-[#121215] border border-[#27272a] p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="material-symbols-outlined text-[#34d399] text-xl">edit_note</span>
            </div>
            <p className="text-3xl font-bold text-[#fafafa]">{stats.reviewsCount}</p>
            <p className="text-sm text-[#a1a1aa] mt-1">Total Reseñas</p>
          </div>

          {/* Published Card */}
          <div className="col-span-1 lg:col-span-3 rounded-xl bg-[#121215] border border-[#27272a] p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="material-symbols-outlined text-[#a78bfa] text-xl">publish</span>
            </div>
            <p className="text-3xl font-bold text-[#fafafa]">{stats.publishedCount}</p>
            <p className="text-sm text-[#a1a1aa] mt-1">Publicadas</p>
          </div>

          {/* Drafts Card */}
          <div className="col-span-2 lg:col-span-6 rounded-xl bg-[#121215] border border-[#27272a] p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="material-symbols-outlined text-[#fb923c] text-xl">draft</span>
            </div>
            <p className="text-3xl font-bold text-[#fafafa]">{stats.reviewsCount - stats.publishedCount}</p>
            <p className="text-sm text-[#a1a1aa] mt-1">Borradores</p>
          </div>
        </div>
      </section>

      {/* 7.1: Trending Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#fafafa]">Trending Esta Semana</h2>
          <Link href="/dashboard" className="text-sm text-[#a1a1aa] hover:text-[#a78bfa] transition-colors">
            Ver más
          </Link>
        </div>
        {trending.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {trending.map((item) => (
              <MediaCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-[#121215] border border-[#27272a] p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-[#a1a1aa] mb-3">movie_filter</span>
            <p className="text-[#a1a1aa]">No hay contenido trending disponible.</p>
          </div>
        )}
      </section>

      {/* 7.3: Recent Activity Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#fafafa]">Actividad Reciente</h2>
        </div>
        {recentActivity.length > 0 ? (
          <div className="rounded-xl bg-[#121215] border border-[#27272a] divide-y divide-[#27272a]">
            {recentActivity.map((item) => (
              <div 
                key={item.id}
                className="flex items-center justify-between p-4 hover:bg-[#18181b] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#fafafa] truncate">
                    {item.title || item.mediaId}
                  </p>
                  <p className="text-xs text-[#a1a1aa] mt-1">
                    {getMediaTypeLabel(item.mediaType)}
                    {item.rating && ` • ★ ${item.rating}/5`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-3 py-1 rounded-full bg-[#18181b] text-[#a1a1aa] border border-[#27272a]">
                    {getStatusLabel(item.status)}
                  </span>
                  <span className="text-xs text-[#a1a1aa]">
                    {item.updatedAt.toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-[#121215] border border-[#27272a] p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-[#a1a1aa] mb-3">history</span>
            <p className="text-[#a1a1aa]">No tienes actividad reciente.</p>
            <p className="text-sm text-[#a1a1aa] mt-1">¡Explora contenido para añadir a tu lista!</p>
          </div>
        )}
      </section>
    </div>
  );
}