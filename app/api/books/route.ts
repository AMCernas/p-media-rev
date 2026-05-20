import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Books API key not configured' },
        { status: 500 }
      );
    }

    // Google Books uses startIndex for pagination
    const startIndex = (page - 1) * 20;
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${apiKey}&maxResults=20&startIndex=${startIndex}`
    );

    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform results to include image URLs
    const items = (data.items || []).map((item: any) => ({
      id: item.id,
      volumeInfo: {
        ...item.volumeInfo,
        imageLinks: item.volumeInfo.imageLinks ? {
          thumbnail: item.volumeInfo.imageLinks.thumbnail?.replace('http://', 'https://'),
          smallThumbnail: item.volumeInfo.imageLinks.smallThumbnail?.replace('http://', 'https://'),
        } : undefined,
      },
    }));

    return NextResponse.json({
      items,
      totalItems: data.totalItems || 0,
    });
  } catch (error) {
    console.error('Google Books API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Google Books' },
      { status: 500 }
    );
  }
}