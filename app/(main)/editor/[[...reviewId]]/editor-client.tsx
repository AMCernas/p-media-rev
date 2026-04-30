"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { MediaType, Review } from '@/lib/types';

interface EditorClientProps {
  reviewId?: string;
  mediaId?: string;
  mediaType?: MediaType;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function EditorClient({ reviewId, mediaId, mediaType }: EditorClientProps) {
  const router = useRouter();
  
  // Form state
  const [rating, setRating] = useState<number | null>(null);
  const [content, setContent] = useState<string>('');
  const [currentReviewId, setCurrentReviewId] = useState<string | undefined>(reviewId);
  const [mediaInfo, setMediaInfo] = useState<{ title: string; imageUrl?: string } | null>(null);
  
  // Save state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  
  // Auto-save refs
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>('');
  const lastSavedRatingRef = useRef<number | null>(null);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch existing review or create new one
  useEffect(() => {
    async function initializeEditor() {
      setIsLoading(true);
      
      try {
        if (reviewId) {
          // Load existing review
          const response = await fetch(`/api/reviews/${reviewId}`);
          
          if (!response.ok) {
            console.error('Failed to load review');
            setIsLoading(false);
            return;
          }
          
          const review: Review = await response.json();
          setRating(review.rating ?? null);
          setContent(review.content ?? '');
          lastSavedContentRef.current = review.content ?? '';
          lastSavedRatingRef.current = review.rating ?? null;
        } else if (mediaId && mediaType) {
          // Create new draft from details page
          const response = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mediaId,
              mediaType,
              status: 'DRAFT',
            }),
          });
          
          if (!response.ok) {
            console.error('Failed to create draft');
            setIsLoading(false);
            return;
          }
          
          const newReview: Review = await response.json();
          setCurrentReviewId(newReview.id);
        } else {
          // Empty new review without preloaded media
          setRating(null);
          setContent('');
        }
      } catch (error) {
        console.error('Error initializing editor:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    initializeEditor();
  }, [reviewId, mediaId, mediaType]);
  
  // Check if content changed
  const hasChanges = useCallback(() => {
    return content !== lastSavedContentRef.current || rating !== lastSavedRatingRef.current;
  }, [content, rating]);
  
  // Save function
  const doSave = useCallback(async (showFeedback = true) => {
    console.log('[Editor] doSave called', { currentReviewId, hasChanges: hasChanges(), contentLength: content?.length, rating });
    
    if (!currentReviewId) {
      console.log('[Editor] No currentReviewId, skipping save');
      return;
    }
    
    if (!hasChanges()) {
      console.log('[Editor] No changes detected, skipping save');
      return;
    }
    
    if (showFeedback) {
      setSaveStatus('saving');
    }
    
    try {
      console.log('[Editor] Sending PATCH request...');
      const response = await fetch(`/api/reviews/${currentReviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: rating ?? null,
          content: content || null,
        }),
      });
      
      console.log('[Editor] Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Editor] Save failed:', errorData);
        throw new Error('Save failed');
      }
      
      const updated: Review = await response.json();
      console.log('[Editor] Save successful:', updated);
      
      // Update refs
      lastSavedContentRef.current = content;
      lastSavedRatingRef.current = rating;
      
      setSaveStatus('saved');
      setLastSaved(new Date());
      
      // Clear retry timeout if exists
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      // Reset to idle after 2 seconds
      setTimeout(() => {
        setSaveStatus(prev => prev === 'saved' ? 'idle' : prev);
      }, 2000);
      
    } catch (error) {
      console.error('[Editor] Auto-save error:', error);
      setSaveStatus('error');
      
      // Retry after 3 seconds
      retryTimeoutRef.current = setTimeout(() => {
        doSave(false);
      }, 3000);
    }
  }, [currentReviewId, content, rating, hasChanges]);
  
  // Debounced save trigger - faster (800ms)
  const triggerAutoSave = useCallback(() => {
    if (!currentReviewId) return;
    
    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Start new debounce timer
    saveTimeoutRef.current = setTimeout(() => {
      doSave(true);
    }, 800);
  }, [currentReviewId, doSave]);

  // Save on unmount - critical for preserving drafts
  useEffect(() => {
    return () => {
      // Save any unsaved changes when component unmounts
      if (currentReviewId && hasChanges()) {
        doSave(false);
      }
    };
  }, [currentReviewId, hasChanges, doSave]);
  
  // Handle content change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    triggerAutoSave();
};
   
  // Handle rating change
  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
    triggerAutoSave();
  };

  // Complete review
  const handleComplete = async () => {
    if (!currentReviewId || isPublishing) return;
    
    setIsPublishing(true);
    
    try {
      // Save first if there are changes
      if (hasChanges()) {
        await doSave(false);
      }
      
      const response = await fetch(`/api/reviews/${currentReviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to complete');
      }
      
      const updated: Review = await response.json();
      
      // Redirect to library
      router.push('/library');
    } catch (error) {
      console.error('Complete error:', error);
      setSaveStatus('error');
      
      // Retry publish after 3 seconds
      retryTimeoutRef.current = setTimeout(() => {
        handleComplete();
      }, 3000);
    } finally {
      setIsPublishing(false);
    }
  };
  
  // Cancel/go back
  const handleCancel = () => {
    router.back();
  };
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#a78bfa] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#a1a1aa]">Cargando editor...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#fafafa] tracking-tight">
            {reviewId ? 'Editar Reseña' : 'Nueva Reseña'}
          </h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Escribe tu opinión sobre esta obra
          </p>
        </div>
        
        {/* Save status indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#121215] border border-[#27272a]">
          {saveStatus === 'saving' && (
            <>
              <div className="w-3 h-3 border-2 border-[#a78bfa] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[#a1a1aa]">Guardando...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <span className="material-symbols-outlined text-sm text-[#34d399]">check_circle</span>
              <span className="text-xs text-[#34d399]">Guardado</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <span className="material-symbols-outlined text-sm text-[#ef4444]">error</span>
              <span className="text-xs text-[#ef4444]">Error</span>
            </>
          )}
          {saveStatus === 'idle' && lastSaved && (
            <>
              <span className="material-symbols-outlined text-sm text-[#a1a1aa]">schedule</span>
              <span className="text-xs text-[#a1a1aa]">
                {lastSaved.toLocaleTimeString('es-AR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </>
          )}
        </div>
      </div>
      
      {/* Media info card */}
      {mediaInfo && (
        <div className="flex items-center gap-4 mb-8 p-4 rounded-xl bg-[#121215] border border-[#27272a]">
          {mediaInfo.imageUrl && (
            <img 
              src={mediaInfo.imageUrl} 
              alt={mediaInfo.title}
              className="w-16 h-24 object-cover rounded-lg"
            />
          )}
          <div>
            <h2 className="font-semibold text-[#fafafa]">{mediaInfo.title}</h2>
            <p className="text-sm text-[#a1a1aa] capitalize">{mediaType?.toLowerCase()}</p>
          </div>
        </div>
      )}
      
      {/* Rating section */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-[#a1a1aa] mb-3">
          Tu calificación
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleRatingChange(star)}
              className="p-2 rounded-lg transition-all duration-150 hover:bg-[#121215] focus:outline-none focus:ring-2 focus:ring-[#a78bfa]/50"
              aria-label={`Calificar ${star} estrellas`}
            >
              <svg
                className={`w-10 h-10 transition-all duration-150 ${
                  rating !== null && star <= rating
                    ? 'text-yellow-400 fill-yellow-400 scale-110'
                    : 'text-[#27272a] hover:text-[#52525b]'
                }`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={rating !== null && star <= rating ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
          ))}
        </div>
        <p className="text-xs text-[#a1a1aa] mt-2">
          {rating ? `Seleccionaste ${rating} de 5 estrellas` : 'Haz clic para calificar'}
        </p>
      </div>
      
      {/* Content textarea */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-[#a1a1aa] mb-3">
          Tu reseña
        </label>
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="Escribe tu reseña aquí... Cuéntanos qué te gustó, qué no, y a quién se la recomendarías."
          className="w-full min-h-[320px] p-5 rounded-xl border border-[#27272a] bg-[#0c0c0f] text-[#fafafa] text-sm leading-relaxed resize-y focus:outline-none focus:border-[#a78bfa] focus:ring-2 focus:ring-[#a78bfa]/20 transition-all duration-200 placeholder:text-[#52525b]"
        />
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-[#52525b]">
            Los cambios se guardan automáticamente
          </p>
          <p className={`text-xs ${content.length > 9000 ? 'text-[#fb923c]' : 'text-[#52525b]'}`}>
            {content.length}/10,000
          </p>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-3 justify-end pt-4 border-t border-[#27272a]">
        <button
          onClick={handleCancel}
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#121215] transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleComplete}
          disabled={isPublishing}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-[#a78bfa] text-[#09090b] hover:bg-[#a78bfa]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isPublishing ? (
            <>
              <div className="w-4 h-4 border-2 border-[#09090b] border-t-transparent rounded-full animate-spin" />
              Completando...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-lg">task_alt</span>
              Completar Reseña
            </>
          )}
        </button>
      </div>
    </div>
  );
}