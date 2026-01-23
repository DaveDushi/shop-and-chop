import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface OptimizedImageProps {
  src?: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  fallbackSrc?: string;
  placeholder?: React.ReactNode;
  lazy?: boolean;
  quality?: 'low' | 'medium' | 'high';
  onLoad?: () => void;
  onError?: () => void;
}

// Image cache to store loaded images
const imageCache = new Map<string, boolean>();

// Default fallback image (base64 encoded placeholder)
const DEFAULT_FALLBACK = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NS4zMzMzIDY2LjY2NjdDODUuMzMzMyA3My4yNzA4IDc5LjkzNzUgNzguNjY2NyA3My4zMzMzIDc4LjY2NjdDNjYuNzI5MiA3OC42NjY3IDYxLjMzMzMgNzMuMjcwOCA2MS4zMzMzIDY2LjY2NjdDNjEuMzMzMyA2MC4wNjI1IDY2LjcyOTIgNTQuNjY2NyA3My4zMzMzIDU0LjY2NjdDNzkuOTM3NSA1NC42NjY3IDg1LjMzMzMgNjAuMDYyNSA4NS4zMzMzIDY2LjY2NjdaIiBmaWxsPSIjRDFENUQ5Ii8+CjxwYXRoIGQ9Ik0xNjYuNjY3IDEwMEwxNDAgODZMMTEzLjMzMyAxMDBMMTAwIDg2LjY2NjdMNzMuMzMzMyAxMDBMMzMuMzMzMyAxMDBWMTMzLjMzM0gxNjYuNjY3VjEwMFoiIGZpbGw9IiNEMUQ1RDkiLz4KPC9zdmc+';

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  fallbackSrc,
  placeholder,
  lazy = true,
  quality = 'medium',
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(undefined);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Generate optimized image URL based on quality setting
  const getOptimizedSrc = useCallback((originalSrc: string) => {
    if (!originalSrc || originalSrc.startsWith('data:') || originalSrc.startsWith('blob:')) {
      return originalSrc;
    }

    // If it's already a full URL, return as is
    if (originalSrc.startsWith('http')) {
      return originalSrc;
    }

    // For relative URLs, we could add query parameters for optimization
    // This would work with a backend that supports image optimization
    const params = new URLSearchParams();
    
    if (width) params.set('w', width.toString());
    if (height) params.set('h', height.toString());
    
    switch (quality) {
      case 'low':
        params.set('q', '60');
        break;
      case 'high':
        params.set('q', '90');
        break;
      default:
        params.set('q', '75');
    }

    const queryString = params.toString();
    return queryString ? `${originalSrc}?${queryString}` : originalSrc;
  }, [width, height, quality]);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before the image comes into view
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [lazy, isInView]);

  // Update current src when src changes or comes into view
  useEffect(() => {
    if (src && isInView) {
      const optimizedSrc = getOptimizedSrc(src);
      
      // Check if image is already cached
      if (imageCache.has(optimizedSrc)) {
        setCurrentSrc(optimizedSrc);
        setIsLoaded(true);
        setHasError(false);
        return;
      }

      setCurrentSrc(optimizedSrc);
      setIsLoaded(false);
      setHasError(false);
    }
  }, [src, isInView, getOptimizedSrc]);

  // Handle image load
  const handleLoad = useCallback(() => {
    if (currentSrc) {
      imageCache.set(currentSrc, true);
    }
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  }, [currentSrc, onLoad]);

  // Handle image error
  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(false);
    onError?.();
    
    // Try fallback image if available and not already using it
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setHasError(false);
    }
  }, [fallbackSrc, currentSrc, onError]);

  // Determine what to show
  const showPlaceholder = !isInView || (!isLoaded && !hasError);
  const showFallback = hasError && !fallbackSrc;
  const finalSrc = hasError && !fallbackSrc ? DEFAULT_FALLBACK : currentSrc;

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      {/* Placeholder */}
      {showPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
          {placeholder || (
            <div className="text-gray-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Fallback for broken images */}
      {showFallback && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
          <div className="text-center">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-xs">Image unavailable</span>
          </div>
        </div>
      )}

      {/* Actual image */}
      {isInView && finalSrc && (
        <img
          ref={imgRef}
          src={finalSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
          style={{
            width: width || '100%',
            height: height || '100%',
          }}
        />
      )}

      {/* Loading indicator */}
      {isInView && currentSrc && !isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
        </div>
      )}
    </div>
  );
};