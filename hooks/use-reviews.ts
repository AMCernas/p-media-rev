"use client";

import { useState, useCallback } from 'react';
import type { MediaType, ReviewStatus, Review } from '@/lib/types';

/**
 * useReviews - Hook for managing reviews (CRUD + publish)
 * 
 * Requirements from spec (REQ-RM-1 to REQ-RM-5):
 * - Create review with rating (1-5) and content
 * - Edit existing review
 * - Publish review (status PUBLISHED)
 * - Validate rating 1-5
 * - Validate content max 10000 chars
 */

interface UseReviewsState {
  isLoading: boolean;
  error: string | null;
}

interface ReviewFilters {
  type?: MediaType;
  status?: ReviewStatus;
}

interface CreateReviewData {
  mediaId: string;
  mediaType: MediaType;
  rating?: number;
  content?: string;
}

interface UpdateReviewData {
  rating?: number;
  content?: string;
  status?: ReviewStatus;
}

/**
 * Validate rating is between 1 and 5 (integer)
 */
function isValidRating(rating: number | undefined): boolean {
  if (rating === undefined) return true;
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

/**
 * Validate content length is at most 10000 characters
 */
function isValidContent(content: string | undefined): boolean {
  if (content === undefined) return true;
  return content.length <= 10000;
}

/**
 * Create a new review
 * POST /api/reviews with status: DRAFT
 */
async function createReviewApi(data: CreateReviewData): Promise<{ success: boolean; review?: Review; error?: string }> {
  // Validate rating (1-5)
  if (!isValidRating(data.rating)) {
    return { success: false, error: 'Rating must be between 1 and 5' };
  }

  // Validate content (max 10000 chars)
  if (!isValidContent(data.content)) {
    return { success: false, error: 'Content must be at most 10000 characters' };
  }

  const response = await fetch('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mediaId: data.mediaId,
      mediaType: data.mediaType,
      status: 'DRAFT',
      rating: data.rating,
      content: data.content,
    }),
  });

  const result = await response.json().catch(() => ({ error: 'Failed to create review' }));

  if (!response.ok) {
    return { success: false, error: result.error || 'Failed to create review' };
  }

  return { success: true, review: result };
}

/**
 * Update an existing review
 * PATCH /api/reviews
 */
async function updateReviewApi(id: string, data: UpdateReviewData): Promise<{ success: boolean; review?: Review; error?: string }> {
  // Validate rating (1-5)
  if (!isValidRating(data.rating)) {
    return { success: false, error: 'Rating must be between 1 and 5' };
  }

  // Validate content (max 10000 chars)
  if (!isValidContent(data.content)) {
    return { success: false, error: 'Content must be at most 10000 characters' };
  }

  const response = await fetch('/api/reviews', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      ...data,
    }),
  });

  const result = await response.json().catch(() => ({ error: 'Failed to update review' }));

  if (!response.ok) {
    return { success: false, error: result.error || 'Failed to update review' };
  }

  return { success: true, review: result };
}

/**
 * Delete a review
 * DELETE /api/reviews (by mediaId/mediaType) or DELETE /api/reviews/[id]
 */
async function deleteReviewApi(id: string): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`/api/reviews/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({ error: 'Failed to delete review' }));
    return { success: false, error: result.error || 'Failed to delete review' };
  }

  return { success: true };
}

/**
 * Publish a review (change status to PUBLISHED)
 * PATCH /api/reviews with status: PUBLISHED
 */
async function publishReviewApi(id: string): Promise<{ success: boolean; review?: Review; error?: string }> {
  const response = await fetch('/api/reviews', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      status: 'PUBLISHED',
    }),
  });

  const result = await response.json().catch(() => ({ error: 'Failed to publish review' }));

  if (!response.ok) {
    return { success: false, error: result.error || 'Failed to publish review' };
  }

  return { success: true, review: result };
}

/**
 * Get user's reviews with optional filters
 * GET /api/reviews?type=...&status=...
 */
async function getUserReviewsApi(filters?: ReviewFilters): Promise<{ success: boolean; reviews?: Review[]; error?: string }> {
  const url = new URL('/api/reviews', window.location.origin);

  if (filters?.type) {
    url.searchParams.set('type', filters.type);
  }
  if (filters?.status) {
    url.searchParams.set('status', filters.status);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const result = await response.json().catch(() => ({ error: 'Failed to fetch reviews' }));
    return { success: false, error: result.error || 'Failed to fetch reviews' };
  }

  const reviews = await response.json();
  return { success: true, reviews };
}

export function useReviews() {
  const [state, setState] = useState<UseReviewsState>({
    isLoading: false,
    error: null,
  });

  /**
   * Create a new review with validation
   */
  const createReview = useCallback(async (data: CreateReviewData) => {
    setState({ isLoading: true, error: null });

    const result = await createReviewApi(data);

    if (!result.success) {
      setState({ isLoading: false, error: result.error || 'Failed to create' });
      return { success: false, error: result.error };
    }

    setState({ isLoading: false, error: null });
    return { success: true, review: result.review };
  }, []);

  /**
   * Update an existing review with validation
   */
  const updateReview = useCallback(async (id: string, data: UpdateReviewData) => {
    setState({ isLoading: true, error: null });

    const result = await updateReviewApi(id, data);

    if (!result.success) {
      setState({ isLoading: false, error: result.error || 'Failed to update' });
      return { success: false, error: result.error };
    }

    setState({ isLoading: false, error: null });
    return { success: true, review: result.review };
  }, []);

  /**
   * Delete a review
   */
  const deleteReview = useCallback(async (id: string) => {
    setState({ isLoading: true, error: null });

    const result = await deleteReviewApi(id);

    if (!result.success) {
      setState({ isLoading: false, error: result.error || 'Failed to delete' });
      return { success: false, error: result.error };
    }

    setState({ isLoading: false, error: null });
    return { success: true };
  }, []);

  /**
   * Publish a review (change status to PUBLISHED)
   */
  const publishReview = useCallback(async (id: string) => {
    setState({ isLoading: true, error: null });

    const result = await publishReviewApi(id);

    if (!result.success) {
      setState({ isLoading: false, error: result.error || 'Failed to publish' });
      return { success: false, error: result.error };
    }

    setState({ isLoading: false, error: null });
    return { success: true, review: result.review };
  }, []);

  /**
   * Get user's reviews with optional filters
   */
  const getUserReviews = useCallback(async (filters?: ReviewFilters) => {
    setState({ isLoading: true, error: null });

    const result = await getUserReviewsApi(filters);

    if (!result.success) {
      setState({ isLoading: false, error: result.error || 'Failed to fetch' });
      return { success: false, reviews: [], error: result.error };
    }

    setState({ isLoading: false, error: null });
    return { success: true, reviews: result.reviews || [] };
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    createReview,
    updateReview,
    deleteReview,
    publishReview,
    getUserReviews,
    clearError,
  };
}