import { NextRequest, NextResponse } from 'next/server';

const BOOKS_BASE_URL = 'https://www.googleapis.com/books/v1';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GOOGLE_BOOKS_API_KEY not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json(
        { error: 'Missing query parameter' },
        { status: 400 }
      );
    }

    const endpoint = `${BOOKS_BASE_URL}/volumes`;
    const url = new URL(endpoint);
    url.searchParams.set('q', query);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json(
        { error: `Google Books API error: ${response.status}`, details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Books proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}