"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { MediaType, Review, ReviewStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';

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
    if (!currentReviewId || !hasChanges()) {
      return;
    }
    
    if (showFeedback) {
      setSaveStatus('saving');
    }
    
    try {
      const response = await fetch(`/api/reviews/${currentReviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: rating ?? null,
          content: content || null,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Save failed');
      }
      
      const updated: Review = await response.json();
      
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
      console.error('Auto-save error:', error);
      setSaveStatus('error');
      
      // Retry after 3 seconds (REQ-AD-4)
      retryTimeoutRef.current = setTimeout(() => {
        doSave(false);
      }, 3000);
    }
  }, [currentReviewId, content, rating, hasChanges]);
  
  // Debounced save trigger (1.5s - REQ-AD-1)
  const triggerAutoSave = useCallback(() => {
    if (!currentReviewId) return;
    
    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Start new debounce timer
    saveTimeoutRef.current = setTimeout(() => {
      doSave(true);
    }, 1500);
  }, [currentReviewId, doSave]);
  
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
  
  // Publish review
  const handlePublish = async () => {
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
          status: 'PUBLISHED',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to publish');
      }
      
      const updated: Review = await response.json();
      
      // Redirect to library
      router.push('/library');
    } catch (error) {
      console.error('Publish error:', error);
      setSaveStatus('error');
      
      // Retry publish after 3 seconds
      retryTimeoutRef.current = setTimeout(() => {
        handlePublish();
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
      <div className="container py-8 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }
  
  return (
    <div className="container py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {reviewId ? 'Editar Reseña' : 'Nueva Reseña'}
        </h1>
        
        {/* Save status indicator */}
        <div className="flex items-center gap-2 text-sm">
          {saveStatus === 'saving' && (
            <span className="text-muted-foreground animate-pulse">Guardando...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-green-500">Guardado</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-destructive">Error al guardar</span>
          )}
          {saveStatus === 'idle' && lastSaved && (
            <span className="text-muted-foreground">
              Guardado a las {lastSaved.toLocaleTimeString('es-AR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          )}
        </div>
      </div>
      
      {/* Media info (if preloaded) */}
      {mediaInfo && (
        <div className="flex gap-4 mb-6 p-4 bg-muted rounded-lg">
          {mediaInfo.imageUrl && (
            <img 
              src={mediaInfo.imageUrl} 
              alt={mediaInfo.title}
              className="w-16 h-24 object-cover rounded"
            />
          )}
          <div>
            <h2 className="font-semibold">{mediaInfo.title}</h2>
            <p className="text-sm text-muted-foreground">{mediaType}</p>
          </div>
        </div>
      )}
      
      {/* Rating selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Tu calificación
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleRatingChange(star)}
              className="p-1 transition-transform hover:scale-110 focus:outline-none"
              aria-label={`Calificar ${star} estrellas`}
            >
              <svg
                className={`w-8 h-8 ${
                  rating !== null && star <= rating
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-muted-foreground'
                }`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={rating !== null && star <= rating ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
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
      </div>
      
      {/* Content textarea */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Tu reseña
        </label>
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="Escribe tu reseña aquí..."
          className="w-full min-h-[300px] p-4 rounded-lg border border-input bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {content.length}/10000 caracteres
        </p>
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={handleCancel}
        >
          Cancelar
        </Button>
        <Button
          onClick={handlePublish}
          disabled={isPublishing}
        >
          {isPublishing ? 'Publicando...' : 'Publicar'}
        </Button>
      </div>
    </div>
  );
}