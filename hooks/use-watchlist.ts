"use client";

import { useState, useCallback } from 'react';
import type { MediaType } from '@/lib/types';

/**
 * useWatchlist - Hook for managing watchlist items
 * 
 * Requirements from spec (REQ-WL-1 to REQ-WL-4):
 * - Add to watchlist without rating
 * - Save with status WATCHLIST
 * - Prevent duplicates
 * - Show in Library page
 */

interface UseWatchlistState {
  isLoading: boolean;
  error: string | null;
}

/**
 * Add item to watchlist (no rating required)
 * POST /api/reviews with status: WATCHLIST
 */
async function addToWatchlist(mediaId: string, mediaType: MediaType): Promise<{ success: boolean; error?: string; existingId?: string }> {
  const response = await fetch('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mediaId,
      mediaType,
      status: 'WATCHLIST',
    }),
  });

  const data = await response.json().catch(() => ({ error: 'Failed to add' }));

  if (!response.ok) {
    if (response.status === 409) {
      return { success: false, error: 'Already in your library', existingId: data.existingId };
    }
    return { success: false, error: data.error || 'Failed to add to watchlist' };
  }

  return { success: true };
}

/**
 * Remove item from watchlist
 * DELETE /api/reviews with mediaId and mediaType
 */
async function removeFromWatchlist(mediaId: string, mediaType: MediaType): Promise<{ success: boolean; error?: string }> {
  const response = await fetch('/api/reviews', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaId, mediaType }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Failed to remove' }));
    return { success: false, error: data.error || 'Failed to remove from watchlist' };
  }

  return { success: true };
}

/**
 * Check if item is in watchlist
 * GET /api/reviews with type and status filters
 */
async function isInWatchlist(mediaId: string, mediaType: MediaType): Promise<boolean> {
  const url = new URL('/api/reviews', window.location.origin);
  url.searchParams.set('type', mediaType);
  url.searchParams.set('status', 'WATCHLIST');

  const response = await fetch(url.toString());

  if (!response.ok) {
    return false;
  }

  const reviews = await response.json();
  return reviews.some((r: { mediaId: string }) => r.mediaId === mediaId);
}

export function useWatchlist() {
  const [state, setState] = useState<UseWatchlistState>({
    isLoading: false,
    error: null,
  });

  /**
   * Add item to watchlist with loading state
   */
  const addToWatchlistFn = useCallback(async (mediaId: string, mediaType: MediaType) => {
    setState({ isLoading: true, error: null });

    const result = await addToWatchlist(mediaId, mediaType);

    if (!result.success) {
      setState({ isLoading: false, error: result.error || 'Failed to add' });
      return { success: false, error: result.error };
    }

    setState({ isLoading: false, error: null });
    return { success: true };
  }, []);

  /**
   * Remove item from watchlist with loading state
   */
  const removeFromWatchlistFn = useCallback(async (mediaId: string, mediaType: MediaType) => {
    setState({ isLoading: true, error: null });

    const result = await removeFromWatchlist(mediaId, mediaType);

    if (!result.success) {
      setState({ isLoading: false, error: result.error || 'Failed to remove' });
      return { success: false, error: result.error };
    }

    setState({ isLoading: false, error: null });
    return { success: true };
  }, []);

  /**
   * Check if item is in watchlist
   */
  const isInWatchlistFn = useCallback(async (mediaId: string, mediaType: MediaType) => {
    return isInWatchlist(mediaId, mediaType);
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    addToWatchlist: addToWatchlistFn,
    removeFromWatchlist: removeFromWatchlistFn,
    isInWatchlist: isInWatchlistFn,
    clearError,
  };
}