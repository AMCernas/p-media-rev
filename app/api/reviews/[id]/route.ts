/**
 * Single Review API Route
 * 
 * Handles GET, PATCH, DELETE for a specific review by ID.
 * 
 * Endpoints:
 * - GET /api/reviews/[id] - Get single review
 * - PATCH /api/reviews/[id] - Update review (alias to main route)
 * - DELETE /api/reviews/[id] - Delete review
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/reviews/[id] - Get single review by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    
    const review = await prisma.review.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });
    
    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(review);
  } catch (error) {
    console.error('GET /api/reviews/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/reviews/[id] - Update review
 * 
 * Body: { rating?, content?, status? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    const body = await request.json();
    const { rating, content, status } = body;
    
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

    // Validate content (max 10000 chars)
    if (content !== undefined && content.length > 10000) {
      return NextResponse.json(
        { error: 'Content must be at most 10000 characters' },
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
    console.error('PATCH /api/reviews/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reviews/[id] - Delete review
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    
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
    
    await prisma.review.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/reviews/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}