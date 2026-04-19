import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MediaType, ReviewStatus } from '@prisma/client';

interface ReviewCreateBody {
  userId: string;
  mediaId: string;
  mediaType: 'MOVIE' | 'SERIES' | 'BOOK';
  status: 'DRAFT' | 'PUBLISHED' | 'WATCHLIST';
  rating?: number;
  content?: string;
}

function isValidMediaType(value: string): value is MediaType {
  return ['MOVIE', 'SERIES', 'BOOK'].includes(value);
}

function isValidReviewStatus(value: string): value is ReviewStatus {
  return ['DRAFT', 'PUBLISHED', 'WATCHLIST'].includes(value);
}

function isValidRating(rating: number | undefined): boolean {
  if (rating === undefined) return true;
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    
    if (userId) {
      where.userId = userId;
    }
    
    if (status && isValidReviewStatus(status)) {
      where.status = status;
    }

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(reviews);

  } catch (error) {
    console.error('GET reviews error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ReviewCreateBody = await request.json();

    // Validate required fields
    if (!body.userId || !body.mediaId || !body.mediaType || !body.status) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, mediaId, mediaType, status' },
        { status: 400 }
      );
    }

    // Validate mediaType
    if (!isValidMediaType(body.mediaType)) {
      return NextResponse.json(
        { error: 'Invalid mediaType. Must be MOVIE, SERIES, or BOOK' },
        { status: 400 }
      );
    }

    // Validate status
    if (!isValidReviewStatus(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be DRAFT, PUBLISHED, or WATCHLIST' },
        { status: 400 }
      );
    }

    // Validate rating (1-5 if provided)
    if (!isValidRating(body.rating)) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Watchlist items cannot have rating
    if (body.status === 'WATCHLIST' && body.rating !== undefined && body.rating !== null) {
      return NextResponse.json(
        { error: 'Watchlist items cannot have a rating' },
        { status: 400 }
      );
    }

    const review = await prisma.review.create({
      data: {
        userId: body.userId,
        mediaId: body.mediaId,
        mediaType: body.mediaType,
        status: body.status,
        rating: body.rating ?? null,
        content: body.content ?? null,
      },
    });

    return NextResponse.json(review, { status: 201 });

  } catch (error) {
    console.error('POST review error:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}