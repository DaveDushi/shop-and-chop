// Image preloader utility for better caching and performance

interface PreloadOptions {
  priority?: 'high' | 'low';
  timeout?: number;
}

interface PreloadResult {
  success: boolean;
  url: string;
  error?: string;
}

class ImagePreloader {
  private cache = new Map<string, Promise<PreloadResult>>();
  private loadedImages = new Set<string>();

  /**
   * Preload a single image
   */
  async preloadImage(url: string, options: PreloadOptions = {}): Promise<PreloadResult> {
    const { priority = 'low', timeout = 10000 } = options;

    // Return cached result if available
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    // Create preload promise
    const preloadPromise = new Promise<PreloadResult>((resolve) => {
      const img = new Image();
      let timeoutId: NodeJS.Timeout;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        img.onload = null;
        img.onerror = null;
      };

      img.onload = () => {
        cleanup();
        this.loadedImages.add(url);
        resolve({ success: true, url });
      };

      img.onerror = () => {
        cleanup();
        resolve({ 
          success: false, 
          url, 
          error: 'Failed to load image' 
        });
      };

      // Set timeout
      timeoutId = setTimeout(() => {
        cleanup();
        resolve({ 
          success: false, 
          url, 
          error: 'Image load timeout' 
        });
      }, timeout);

      // Set priority hint if supported
      if ('fetchPriority' in img) {
        (img as any).fetchPriority = priority;
      }

      // Start loading
      img.src = url;
    });

    // Cache the promise
    this.cache.set(url, preloadPromise);
    return preloadPromise;
  }

  /**
   * Preload multiple images
   */
  async preloadImages(urls: string[], options: PreloadOptions = {}): Promise<PreloadResult[]> {
    const promises = urls.map(url => this.preloadImage(url, options));
    return Promise.all(promises);
  }

  /**
   * Preload images with concurrency limit
   */
  async preloadImagesWithLimit(
    urls: string[], 
    concurrency: number = 3, 
    options: PreloadOptions = {}
  ): Promise<PreloadResult[]> {
    const results: PreloadResult[] = [];
    const executing: Promise<void>[] = [];

    for (const url of urls) {
      const promise = this.preloadImage(url, options).then(result => {
        results.push(result);
      });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Check if image is already loaded
   */
  isImageLoaded(url: string): boolean {
    return this.loadedImages.has(url);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.loadedImages.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Remove specific image from cache
   */
  removeFromCache(url: string): void {
    this.cache.delete(url);
    this.loadedImages.delete(url);
  }
}

// Create singleton instance
export const imagePreloader = new ImagePreloader();

/**
 * Hook for preloading images in React components
 */
export const useImagePreloader = () => {
  return {
    preloadImage: imagePreloader.preloadImage.bind(imagePreloader),
    preloadImages: imagePreloader.preloadImages.bind(imagePreloader),
    preloadImagesWithLimit: imagePreloader.preloadImagesWithLimit.bind(imagePreloader),
    isImageLoaded: imagePreloader.isImageLoaded.bind(imagePreloader),
    clearCache: imagePreloader.clearCache.bind(imagePreloader),
  };
};

/**
 * Utility to generate responsive image URLs
 */
export const generateResponsiveImageUrl = (
  baseUrl: string,
  width: number,
  quality: number = 75
): string => {
  if (!baseUrl || baseUrl.startsWith('data:') || baseUrl.startsWith('blob:')) {
    return baseUrl;
  }

  // If it's already a full URL with parameters, return as is
  if (baseUrl.includes('?')) {
    return baseUrl;
  }

  const params = new URLSearchParams();
  params.set('w', width.toString());
  params.set('q', quality.toString());
  params.set('f', 'webp'); // Prefer WebP format for better compression

  return `${baseUrl}?${params.toString()}`;
};

/**
 * Generate multiple sizes for responsive images
 */
export const generateResponsiveImageSizes = (
  baseUrl: string,
  sizes: number[] = [320, 640, 960, 1280],
  quality: number = 75
): Array<{ url: string; width: number }> => {
  return sizes.map(width => ({
    url: generateResponsiveImageUrl(baseUrl, width, quality),
    width,
  }));
};

/**
 * Preload images for a recipe list
 */
export const preloadRecipeImages = async (
  recipes: Array<{ imageUrl?: string }>,
  options: PreloadOptions = {}
): Promise<void> => {
  const imageUrls = recipes
    .map(recipe => recipe.imageUrl)
    .filter((url): url is string => Boolean(url));

  if (imageUrls.length === 0) return;

  try {
    await imagePreloader.preloadImagesWithLimit(imageUrls, 3, {
      priority: 'low',
      timeout: 8000,
      ...options,
    });
  } catch (error) {
    console.warn('Failed to preload some recipe images:', error);
  }
};

/**
 * Create a blob URL for local images with caching
 */
export const createCachedBlobUrl = (file: File): string => {
  const url = URL.createObjectURL(file);
  
  // Clean up blob URL after a delay to prevent memory leaks
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60000); // 1 minute

  return url;
};