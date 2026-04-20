/**
 * Reviews API Route
 * 
 * Handles CRUD operations for reviews and watchlist items.
 * 
 * Endpoints:
 * - POST /api/reviews - Create new review or watchlist item
 * - GET /api/reviews - List user's reviews (with filters)
 * - PATCH /api/reviews - Update review/draft
 * - DELETE /api/reviews - Remove from watchlist
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';
import type { MediaType, ReviewStatus } from '@/lib/types';

interface CreateReviewBody {
  mediaId: string;
  mediaType: MediaType;
  status: ReviewStatus;
  rating?: number;
  content?: string;
}

interface UpdateReviewBody {
  id?: string;
  mediaId?: string;
  mediaType?: MediaType;
  status?: ReviewStatus;
  rating?: number;
  content?: string;
}

interface DeleteReviewBody {
  mediaId: string;
  mediaType: MediaType;
}

/**
 * POST /api/reviews - Create new review or watchlist item
 * 
 * Body: { mediaId, mediaType, status, rating?, content? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body: CreateReviewBody = await request.json();
    const { mediaId, mediaType, status, rating, content } = body;
    
    // Validate required fields
    if (!mediaId || !mediaType || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: mediaId, mediaType, status' },
        { status: 400 }
      );
    }
    
    // Validate mediaType
    if (!['MOVIE', 'SERIES', 'BOOK'].includes(mediaType)) {
      return NextResponse.json(
        { error: 'Invalid mediaType. Must be MOVIE, SERIES, or BOOK' },
        { status: 400 }
      );
    }
    
    // Validate status
    if (!['DRAFT', 'PUBLISHED', 'WATCHLIST'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be DRAFT, PUBLISHED, or WATCHLIST' },
        { status: 400 }
      );
    }
    
    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }
    
    // Check for duplicate (same user, mediaId, mediaType)
    const existing = await prisma.review.findFirst({
      where: {
        userId: user.id,
        mediaId,
        mediaType: mediaType as any,
      },
    });
    
    if (existing) {
      return NextResponse.json(
        { error: 'Already in your library', existingId: existing.id },
        { status: 409 }
      );
    }
    
    // Create the review/watchlist item
    const review = await prisma.review.create({
      data: {
        userId: user.id,
        mediaId,
        mediaType: mediaType as any,
        status: status as any,
        rating: rating ?? null,
        content: content ?? null,
      },
    });
    
    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('POST /api/reviews error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reviews - List user's reviews
 * 
 * Query params: type?, status?
 * - type: filter by mediaType (MOVIE, SERIES, BOOK)
 * - status: filter by status (DRAFT, PUBLISHED, WATCHLIST)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type')?.toUpperCase();
    const status = searchParams.get('status')?.toUpperCase();
    
    // Build where clause
    const where: any = { userId: user.id };
    
    if (type && ['MOVIE', 'SERIES', 'BOOK'].includes(type)) {
      where.mediaType = type;
    }
    
    if (status && ['DRAFT', 'PUBLISHED', 'WATCHLIST'].includes(status)) {
      where.status = status;
    }
    
    const reviews = await prisma.review.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    
    return NextResponse.json(reviews);
  } catch (error) {
    console.error('GET /api/reviews error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/reviews - Update review
 * 
 * Body: { id, rating?, content?, status? }
 * OR query params: ?id=xxx&rating=4&content=...&status=PUBLISHED
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body: UpdateReviewBody = await request.json();
    const { id, rating, content, status } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }
    
    // Verify ownership
    const existing = await prisma.review.findFirst({
      where: { id, userId: user.id },
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }
    
    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }
    
    // Validate status if provided
    if (status && !['DRAFT', 'PUBLISHED', 'WATCHLIST'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }
    
    // Build update data
    const updateData: any = {};
    if (rating !== undefined) updateData.rating = rating;
    if (content !== undefined) updateData.content = content;
    if (status !== undefined) updateData.status = status;
    
    const updated = await prisma.review.update({
      where: { id },
      data: updateData,
    });
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/reviews error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reviews - Remove from watchlist
 * 
 * Body: { mediaId, mediaType }
 * Removes the item from user's library
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body: DeleteReviewBody = await request.json();
    const { mediaId, mediaType } = body;
    
    if (!mediaId || !mediaType) {
      return NextResponse.json(
        { error: 'Missing required fields: mediaId, mediaType' },
        { status: 400 }
      );
    }
    
    // Find and delete (only if WATCHLIST or DRAFT)
    const existing = await prisma.review.findFirst({
      where: {
        userId: user.id,
        mediaId,
        mediaType: mediaType as any,
      },
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: 'Not found in your library' },
        { status: 404 }
      );
    }
    
    await prisma.review.delete({
      where: { id: existing.id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/reviews error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}