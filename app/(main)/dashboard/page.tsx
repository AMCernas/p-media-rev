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
import { getTrending, type TMDBSearchResult } from '@/lib/tmdb';
import { MediaCard } from '@/components/features/media-card';
import { StatsBento } from '@/components/features/stats-bento';

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
    // Published reviews
    prisma.review.count({
      where: { 
        userId,
        status: 'PUBLISHED',
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
    select: {
      id: true,
      mediaId: true,
      mediaType: true,
      status: true,
      rating: true,
      updatedAt: true,
    },
  });
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
    case 'PUBLISHED': return 'Publicada';
    default: return status;
  }
}

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    return (
      <div className="container py-8">
        <p className="text-muted-foreground">Debes iniciar sesión para ver el dashboard.</p>
      </div>
    );
  }

  // Fetch data in parallel
  const [trendingData, stats, recentActivity] = await Promise.all([
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

  const trending = trendingData.results.slice(0, 6); // Limit to 6 items

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Bienvenido de nuevo, {user.email?.split('@')[0] || 'Usuario'}
        </p>
      </div>

      {/* 7.4: Stats Bento */}
      <section>
        <StatsBento 
          watchlistCount={stats.watchlistCount}
          reviewsCount={stats.reviewsCount}
          publishedCount={stats.publishedCount}
        />
      </section>

      {/* 7.1: Trending Section */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Trending</h2>
        {trending.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {trending.map((item) => (
              <MediaCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No hay contenido trending disponible.</p>
        )}
      </section>

      {/* 7.3: Recent Activity Section */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Vistos Recientemente</h2>
        {recentActivity.length > 0 ? (
          <div className="rounded-lg border border-border divide-y divide-border">
            {recentActivity.map((item) => (
              <div 
                key={item.id}
                className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    ID: {item.mediaId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getMediaTypeLabel(item.mediaType)}
                    {item.rating && ` • ★ ${item.rating}/5`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    {getStatusLabel(item.status)}
                  </span>
                  <span className="text-xs text-muted-foreground">
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
          <p className="text-muted-foreground p-4 rounded-lg border border-border">
            No tienes actividad reciente. ¡Explora contenido para añadir a tu lista!
          </p>
        )}
      </section>
    </div>
  );
}