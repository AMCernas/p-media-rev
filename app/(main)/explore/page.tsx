/**
 * Explore Page - Browse content by type and section
 * 
 * Route: /explore?type=movie|series|book|trending&section=popular|trending&page=1
 */

import Link from 'next/link';
import { getTrending, getPopularMovies, getPopularTV, type TMDBSearchResult } from '@/lib/tmdb';
import { searchBooks, getBookCoverUrl, type GoogleBookVolume } from '@/lib/books';
import { cn } from '@/lib/utils';

interface ExplorePageProps {
  searchParams: Promise<{
    type?: string;
    section?: string;
    page?: string;
  }>;
}

type MediaItem = TMDBSearchResult | (GoogleBookVolume & { media_type: 'book' });

const PAGE_SIZE = 12;
const MAX_PAGES = 5;

const SECTION_TITLES: Record<string, string> = {
  trending: 'Contenido en Tendencia',
  popular_movie: 'Películas Populares',
  popular_series: 'Series Populares',
  popular_book: 'Libros Populares',
};

const EXPLORE_URLS: Record<string, string> = {
  trending: '/explore?type=trending&section=trending&page=1',
  popular_movie: '/explore?type=movie&section=popular&page=1',
  popular_series: '/explore?type=series&section=popular&page=1',
  popular_book: '/explore?type=book&section=popular&page=1',
};

/**
 * Fetch content based on type and section
 */
async function fetchContent(
  type: string,
  section: string,
  page: number
): Promise<{ items: MediaItem[]; totalPages: number }> {
  switch (type) {
    case 'trending':
      const trending = await getTrending(page);
      return {
        items: trending.results,
        totalPages: Math.min(trending.total_pages, MAX_PAGES),
      };

    case 'movie':
      const movies = await getPopularMovies(page, 'es-ES');
      return {
        items: movies.results,
        totalPages: Math.min(movies.total_pages, MAX_PAGES),
      };

    case 'series':
      const series = await getPopularTV(page, 'es-ES');
      return {
        items: series.results,
        totalPages: Math.min(series.total_pages, MAX_PAGES),
      };

    case 'book':
      const books = await searchBooks('subject:fiction', (page - 1) * PAGE_SIZE, PAGE_SIZE);
      return {
        items: (books.items || []).map(item => ({ ...item, media_type: 'book' as const })),
        totalPages: Math.min(Math.ceil((books.totalItems || 0) / PAGE_SIZE), MAX_PAGES),
      };

    default:
      return { items: [], totalPages: 1 };
  }
}

/**
 * TMDB Media Card
 */
function TMDBCard({ item }: { item: TMDBSearchResult }) {
  const title = item.title || item.name || 'Unknown';
  const year = item.release_date
    ? new Date(item.release_date).getFullYear()
    : item.first_air_date
      ? new Date(item.first_air_date).getFullYear()
      : null;
  const posterUrl = item.poster_path
    ? `https://image.tmdb.org/t/p/w185${item.poster_path}`
    : null;
  const mediaType = item.media_type === 'tv' ? 'series' : 'movie';

  return (
    <Link
      href={`/details/${mediaType}/${item.id}`}
      className={cn(
        'group block rounded-lg border border-[#27272a] bg-[#121215] overflow-hidden',
        'transition-all hover:border-[#a78bfa]/50 hover:shadow-lg',
        'hover:shadow-[#a78bfa]/10'
      )}
    >
      <div className="aspect-[2/3] relative bg-[#18181b] overflow-hidden">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#52525b]">
            <span className="material-symbols-outlined text-3xl">movie</span>
          </div>
        )}
        {item.vote_average && item.vote_average > 0 && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-[#09090b]/80 text-xs text-[#fafafa] flex items-center gap-1">
            <span className="text-yellow-400">★</span>
            {item.vote_average.toFixed(1)}
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-[#fafafa] text-sm truncate">{title}</h3>
        {year && <p className="text-xs text-[#52525b] mt-1">{year}</p>}
        <p className="text-xs text-[#71717a] mt-2 line-clamp-2">{item.overview}</p>
      </div>
    </Link>
  );
}

/**
 * Book Card
 */
function BookCard({ item }: { item: GoogleBookVolume }) {
  const title = item.volumeInfo.title || 'Unknown';
  const year = item.volumeInfo.publishedDate
    ? new Date(item.volumeInfo.publishedDate).getFullYear()
    : null;
  const authors = item.volumeInfo.authors?.join(', ');
  const coverUrl = getBookCoverUrl(item, 'thumbnail');

  return (
    <Link
      href={`/details/book/${item.id}`}
      className={cn(
        'group block rounded-lg border border-[#27272a] bg-[#121215] overflow-hidden',
        'transition-all hover:border-[#a78bfa]/50 hover:shadow-lg',
        'hover:shadow-[#a78bfa]/10'
      )}
    >
      <div className="aspect-[2/3] relative bg-[#18181b] overflow-hidden flex items-center justify-center">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#52525b]">
            <span className="material-symbols-outlined text-3xl">menu_book</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-[#fafafa] text-sm truncate">{title}</h3>
        {authors && <p className="text-xs text-[#71717a] mt-1 truncate">{authors}</p>}
        {year && <p className="text-xs text-[#52525b] mt-1">{year}</p>}
        {item.volumeInfo.description && (
          <p className="text-xs text-[#71717a] mt-2 line-clamp-2">
            {item.volumeInfo.description}
          </p>
        )}
      </div>
    </Link>
  );
}

/**
 * Media Item Card (polymorphic)
 */
function ExploreCard({ item }: { item: MediaItem }) {
  if (item.media_type === 'book') {
    return <BookCard item={item as GoogleBookVolume} />;
  }
  return <TMDBCard item={item as TMDBSearchResult} />;
}

/**
 * Pagination Component
 */
function Pagination({
  currentPage,
  totalPages,
  href,
}: {
  currentPage: number;
  totalPages: number;
  href: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-2 mt-12">
      {currentPage > 1 && (
        <Link
          href={href(currentPage - 1)}
          className={cn(
            'px-4 py-2 rounded-lg border border-[#27272a] text-[#a1a1aa]',
            'hover:border-[#a78bfa]/50 hover:text-[#a78bfa]',
            'transition-colors'
          )}
        >
          <span className="material-symbols-outlined text-sm">chevron_left</span>
          Anterior
        </Link>
      )}

      <div className="flex gap-1">
        {pages.map((page) => (
          <Link
            key={page}
            href={href(page)}
            className={cn(
              'w-10 h-10 flex items-center justify-center rounded-lg text-sm',
              page === currentPage
                ? 'bg-[#a78bfa] text-[#09090b] font-medium'
                : 'border border-[#27272a] text-[#a1a1aa] hover:border-[#a78bfa]/50 hover:text-[#a78bfa]',
              'transition-colors'
            )}
          >
            {page}
          </Link>
        ))}
      </div>

      {currentPage < totalPages && (
        <Link
          href={href(currentPage + 1)}
          className={cn(
            'px-4 py-2 rounded-lg border border-[#27272a] text-[#a1a1aa]',
            'hover:border-[#a78bfa]/50 hover:text-[#a78bfa]',
            'transition-colors'
          )}
        >
          Siguiente
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </Link>
      )}
    </div>
  );
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const params = await searchParams;
  const type = params.type || 'trending';
  const section = params.section || 'trending';
  const page = Math.max(1, parseInt(params.page || '1', 10));

  const { items, totalPages } = await fetchContent(type, section, page);

  const sectionKey = `${section}_${type}`;
  const title = SECTION_TITLES[sectionKey] || SECTION_TITLES[type] || 'Explorar';

  const buildPaginationHref = (newPage: number) =>
    `/explore?type=${type}&section=${section}&page=${newPage}`;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-[#a78bfa] hover:text-[#c4b5fd] mb-4"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Volver al dashboard
        </Link>
        <h1 className="text-2xl font-bold text-[#fafafa] tracking-tight">{title}</h1>
        <p className="text-sm text-[#a1a1aa] mt-1">
          Explora contenido{' '}
          {type === 'trending' ? 'en tendencia' : type === 'movie' ? 'popular' : type === 'series' ? 'popular' : 'popular'}
        </p>
      </div>

      {/* Section Navigation */}
      <div className="flex gap-2 mb-8 p-1 overflow-x-auto">
        {Object.entries(EXPLORE_URLS).map(([key, url]) => {
          const isActive = key === `${section}_${type}`;
          return (
            <Link
              key={key}
              href={url}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap',
                isActive
                  ? 'bg-[#a78bfa] text-[#09090b]'
                  : 'text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b]',
                'transition-colors'
              )}
            >
              {SECTION_TITLES[key] || key}
            </Link>
          );
        })}
      </div>

      {/* Content Grid */}
      {items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((item, index) => (
            <ExploreCard key={`${item.media_type}-${'id' in item ? item.id : index}`} item={item} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center rounded-xl bg-[#121215] border border-[#27272a]">
          <span className="material-symbols-outlined text-4xl text-[#52525b] mb-3">search_off</span>
          <p className="text-[#71717a]">No se encontró contenido</p>
        </div>
      )}

      {/* Pagination */}
      <Pagination currentPage={page} totalPages={totalPages} href={buildPaginationHref} />
    </div>
  );
}