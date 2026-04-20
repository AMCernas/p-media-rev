"use client";

/**
 * WatchlistButton - Add/remove item from watchlist
 * 
 * Requirements from spec (REQ-MD-3, REQ-WL-1 to REQ-WL-3):
 * - Show current status (in watchlist or not)
 * - Loading state during API calls
 * - Success/error feedback
 * - Prevent duplicates
 */

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { MediaType } from '@/lib/types';

interface WatchlistButtonProps {
  /** External media ID (TMDB ID or Google Books volume ID) */
  mediaId: string;
  /** Media type */
  mediaType: MediaType;
  /** Current watchlist status (if already in watchlist) */
  isInWatchlist?: boolean;
  className?: string;
}

type ButtonState = 'idle' | 'loading' | 'success' | 'error';

export function WatchlistButton({
  mediaId,
  mediaType,
  isInWatchlist = false,
  className,
}: WatchlistButtonProps) {
  const [isInList, setIsInList] = useState(isInWatchlist);
  const [state, setState] = useState<ButtonState>('idle');

  const handleToggle = useCallback(async () => {
    if (state === 'loading') return;
    
    setState('loading');
    
    try {
      if (isInList) {
        // Remove from watchlist - call DELETE /api/reviews
        const response = await fetch('/api/reviews', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mediaId, mediaType }),
        });
        
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Failed to remove' }));
          throw new Error(error.error || 'Failed to remove');
        }
        
        setIsInList(false);
        setState('success');
      } else {
        // Add to watchlist - call POST /api/reviews
        const response = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mediaId,
            mediaType,
            status: 'WATCHLIST',
          }),
        });
        
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Failed to add' }));
          throw new Error(error.error || 'Failed to add');
        }
        
        setIsInList(true);
        setState('success');
      }
      
      // Reset to idle after feedback
      setTimeout(() => setState('idle'), 2000);
    } catch (err) {
      console.error('Watchlist error:', err);
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  }, [mediaId, mediaType, isInList, state]);

  return (
    <button
      onClick={handleToggle}
      disabled={state === 'loading'}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
        'focus:outline-none focus:ring-2 focus:ring-primary/50',
        isInList
          ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          : 'bg-primary text-primary-foreground hover:bg-primary/90',
        state === 'loading' && 'opacity-70 cursor-wait',
        state === 'error' && 'bg-destructive text-destructive-foreground',
        className
      )}
    >
      {state === 'loading' ? (
        <>
          <span className="animate-spin">⏳</span>
          <span>{isInList ? 'Quitando...' : 'Agregando...'}</span>
        </>
      ) : state === 'success' ? (
        <>
          <span>✓</span>
          <span>{isInList ? '¡Eliminado de Watchlist!' : '¡Agregado a Watchlist!'}</span>
        </>
      ) : state === 'error' ? (
        <>
          <span>✕</span>
          <span>Error. Intenta de nuevo</span>
        </>
      ) : isInList ? (
        <>
          <span>✓</span>
          <span>En tu Watchlist</span>
        </>
      ) : (
        <>
          <span>+</span>
          <span>Agregar a Watchlist</span>
        </>
      )}
    </button>
  );
}