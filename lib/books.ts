/**
 * Google Books API Client
 * Base URL: https://www.googleapis.com/books/v1
 * Authentication: API key via query parameter
 */

const BOOKS_BASE_URL = 'https://www.googleapis.com/books/v1';
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

// Warn but don't throw - allows build without API key
if (!GOOGLE_BOOKS_API_KEY) {
  console.warn('GOOGLE_BOOKS_API_KEY environment variable not set - Books features will be disabled');
}

export interface GoogleBookVolume {
  id: string;
  volumeInfo: {
    title: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    pageCount?: number;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    imageLinks?: {
      thumbnail: string;
      smallThumbnail: string;
    };
    language?: string;
    previewLink?: string;
    infoLink?: string;
    canonicalVolumeLink?: string;
  };
}

interface BooksSearchResponse {
  kind: string;
  totalItems: number;
  items?: GoogleBookVolume[];
}

interface BookDetailsResponse {
  kind: string;
  id: string;
  volumeInfo: GoogleBookVolume['volumeInfo'];
}

async function booksFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  if (!GOOGLE_BOOKS_API_KEY) {
    throw new Error('GOOGLE_BOOKS_API_KEY not configured');
  }
  
  const url = new URL(`${BOOKS_BASE_URL}${endpoint}`);
  url.searchParams.set('key', GOOGLE_BOOKS_API_KEY as string);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
    },
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    throw new Error(`Google Books API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Search for books by query
 */
export async function searchBooks(
  query: string,
  startIndex: number = 0,
  maxResults: number = 20
): Promise<BooksSearchResponse> {
  return booksFetch<BooksSearchResponse>('/volumes', {
    q: query,
    startIndex: String(startIndex),
    maxResults: String(maxResults),
  });
}

/**
 * Get book details by ID (Volume ID)
 */
export async function getBookDetails(id: string): Promise<BookDetailsResponse> {
  return booksFetch<BookDetailsResponse>(`/volumes/${id}`);
}

/**
 * Get image URL for book cover
 */
export function getBookCoverUrl(
  volume: GoogleBookVolume,
  size: 'thumbnail' | 'smallThumbnail' = 'thumbnail'
): string | null {
  const imageLinks = volume.volumeInfo.imageLinks;
  if (!imageLinks) return null;
  
  return imageLinks[size] || imageLinks.thumbnail || null;
}

/**
 * Extract ISBN from book volume
 */
export function getISBN(volume: GoogleBookVolume): string | null {
  const identifiers = volume.volumeInfo.industryIdentifiers;
  if (!identifiers) return null;
  
  const isbn13 = identifiers.find(id => id.type === 'ISBN_13');
  if (isbn13) return isbn13.identifier;
  
  const isbn10 = identifiers.find(id => id.type === 'ISBN_10');
  if (isbn10) return isbn10.identifier;
  
  return null;
}
