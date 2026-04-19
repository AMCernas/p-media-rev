import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ReviewStatus } from '@prisma/client';

interface ReviewPatchBody {
  status?: 'DRAFT' | 'PUBLISHED' | 'WATCHLIST';
  rating?: number;
  content?: string;
}

function isValidReviewStatus(value: string): value is ReviewStatus {
  return ['DRAFT', 'PUBLISHED', 'WATCHLIST'].includes(value);
}

function isValidRating(rating: number | undefined): boolean {
  if (rating === undefined) return true;
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(review);

  } catch (error) {
    console.error('GET review error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: ReviewPatchBody = await request.json();

    // Check if review exists
    const existing = await prisma.review.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Validate status if provided
    if (body.status && !isValidReviewStatus(body.status)) {
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

    // If changing to WATCHLIST, clear rating
    const updateData: Record<string, unknown | null> = {};
    
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === 'WATCHLIST') {
        updateData.rating = null;
      }
    }
    if (body.rating !== undefined) {
      updateData.rating = body.rating === null ? null : body.rating;
    }
    if (body.content !== undefined) {
      updateData.content = body.content;
    }

    const review = await prisma.review.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(review);

  } catch (error) {
    console.error('PATCH review error:', error);
    return NextResponse.json(
      { error: 'Failed to update review' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if review exists
    const existing = await prisma.review.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    await prisma.review.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('DELETE review error:', error);
    return NextResponse.json(
      { error: 'Failed to delete review' },
      { status: 500 }
    );
  }
}