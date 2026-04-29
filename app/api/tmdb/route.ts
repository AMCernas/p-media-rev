import { NextRequest, NextResponse } from 'next/server';
import { searchMulti, getTMDBImageUrl } from '@/lib/tmdb';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const type = searchParams.get('type'); // 'movie', 'tv', 'multi', or undefined for all

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    let data;
    
    if (type === 'movie') {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(query)}`
      );
      data = await response.json();
    } else if (type === 'tv') {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/tv?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(query)}`
      );
      data = await response.json();
    } else {
      // Multi search (default)
      data = await searchMulti(query);
    }

    // Transform results to include image URLs
    const results = (data.results || []).map((item: any) => ({
      ...item,
      poster_path: item.poster_path ? getTMDBImageUrl(item.poster_path, 'w185') : null,
      backdrop_path: item.backdrop_path ? getTMDBImageUrl(item.backdrop_path, 'w500') : null,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('TMDB API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from TMDB' },
      { status: 500 }
    );
  }
}