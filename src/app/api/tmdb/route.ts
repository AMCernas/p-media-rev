import { NextRequest, NextResponse } from 'next/server';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.TMDB_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'TMDB_API_KEY not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const type = searchParams.get('type') || 'multi';

    let endpoint = TMDB_BASE_URL;

    if (type === 'trending') {
      endpoint += '/trending/all/week';
    } else if (query) {
      if (type === 'movie') {
        endpoint += '/search/movie';
      } else if (type === 'series') {
        endpoint += '/search/tv';
      } else {
        endpoint += '/search/multi';
      }
    } else {
      return NextResponse.json(
        { error: 'Missing query parameter or invalid type' },
        { status: 400 }
      );
    }

    const url = new URL(endpoint);
    if (query) {
      url.searchParams.set('query', query);
    }
    url.searchParams.set('include_adult', 'false');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json(
        { error: `TMDB API error: ${response.status}`, details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('TMDB proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}