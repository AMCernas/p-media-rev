import { NextRequest, NextResponse } from 'next/server';
import { searchMulti, searchMovies, searchSeries, getTMDBImageUrl } from '@/lib/tmdb';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const type = searchParams.get('type'); // 'movie', 'tv', 'multi', or undefined for all
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    let data;
    
    if (type === 'movie') {
      data = await searchMovies(query, page);
    } else if (type === 'tv') {
      data = await searchSeries(query, page);
    } else {
      // Multi search (default)
      data = await searchMulti(query, page);
    }

    // Transform results to include image URLs
    const results = (data.results || []).map((item: any) => ({
      ...item,
      poster_path: item.poster_path ? getTMDBImageUrl(item.poster_path, 'w185') : null,
      backdrop_path: item.backdrop_path ? getTMDBImageUrl(item.backdrop_path, 'w500') : null,
    }));

    return NextResponse.json({
      results,
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results,
    });
  } catch (error) {
    console.error('TMDB API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from TMDB' },
      { status: 500 }
    );
  }
}