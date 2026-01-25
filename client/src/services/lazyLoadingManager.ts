/**
 * Lazy Loading Manager for Offline Components
 * Implements intelligent lazy loading with offline support and performance optimization
 */

interface LazyLoadConfig {
  rootMargin: string;
  threshold: number;
  enableIntersectionObserver: boolean;
  enablePrefetch: boolean;
  prefetchDelay: number;
  maxConcurrentLoads: number;
  retryAttempts: number;
  retryDelay: number;
}

interface LazyLoadItem {
  id: string;
  element: HTMLElement;
  src?: string;
  component?: () => Promise<any>;
  priority: 'high' | 'medium' | 'low';
  loaded: boolean;
  loading: boolean;
  error: boolean;
  retryCount: number;
  loadTime?: number;
}

interface LoadingStats {
  totalItems: number;
  loadedItems: number;
  failedItems: number;
  averageLoadTime: number;
  cacheHitRate: number;
}

class LazyLoadingManager {
  private observer: IntersectionObserver | null = null;
  private config: LazyLoadConfig = {
    rootMargin: '50px',
    threshold: 0.1,
    enableIntersectionObserver: true,
    enablePrefetch: true,
    prefetchDelay: 2000,
    maxConcurrentLoads: 3,
    retryAttempts: 3,
    retryDelay: 1000
  };
  
  private lazyItems: Map<string, LazyLoadItem> = new Map();
  private loadingQueue: LazyLoadItem[] = [];
  private currentLoads: Set<string> = new Set();
  private loadingStats: LoadingStats = {
    totalItems: 0,
    loadedItems: 0,
    failedItems: 0,
    averageLoadTime: 0,
    cacheHitRate: 0
  };
  
  private cacheHits: number = 0;
  private totalLoads: number = 0;
  private loadTimes: number[] = [];

  /**
   * Initialize lazy loading manager
   */
  initialize(config?: Partial<LazyLoadConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    console.log('[Lazy Loading] Initializing lazy loading manager');

    try {
      if (this.config.enableIntersectionObserver && 'IntersectionObserver' in window) {
        this.setupIntersectionObserver();
      } else {
        this.setupScrollListener();
      }

      // Set up prefetch timer
      if (this.config.enablePrefetch) {
        this.setupPrefetchTimer();
      }

      // Process loading queue periodically
      this.setupQueueProcessor();

      console.log('[Lazy Loading] Lazy loading manager initialized');
    } catch (error) {
      console.error('[Lazy Loading] Failed to initialize:', error);
    }
  }

  /**
   * Set up intersection observer
   */
  private setupIntersectionObserver(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const itemId = entry.target.getAttribute('data-lazy-id');
            if (itemId) {
              this.loadItem(itemId, 'viewport');
            }
          }
        });
      },
      {
        rootMargin: this.config.rootMargin,
        threshold: this.config.threshold
      }
    );

    console.log('[Lazy Loading] Intersection observer set up');
  }

  /**
   * Set up scroll listener fallback
   */
  private setupScrollListener(): void {
    let ticking = false;

    const checkVisibility = () => {
      this.lazyItems.forEach((item) => {
        if (!item.loaded && !item.loading && this.isElementInViewport(item.element)) {
          this.loadItem(item.id, 'scroll');
        }
      });
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(checkVisibility);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    console.log('[Lazy Loading] Scroll listener set up');
  }

  /**
   * Set up prefetch timer
   */
  private setupPrefetchTimer(): void {
    setTimeout(() => {
      this.prefetchHighPriorityItems();
    }, this.config.prefetchDelay);
  }

  /**
   * Set up queue processor
   */
  private setupQueueProcessor(): void {
    setInterval(() => {
      this.processLoadingQueue();
    }, 100); // Process queue every 100ms
  }

  /**
   * Register lazy loading item
   */
  register(
    element: HTMLElement,
    options: {
      id?: string;
      src?: string;
      component?: () => Promise<any>;
      priority?: 'high' | 'medium' | 'low';
    }
  ): string {
    const id = options.id || this.generateId();
    
    const item: LazyLoadItem = {
      id,
      element,
      src: options.src,
      component: options.component,
      priority: options.priority || 'medium',
      loaded: false,
      loading: false,
      error: false,
      retryCount: 0
    };

    this.lazyItems.set(id, item);
    element.setAttribute('data-lazy-id', id);

    // Add to observer if available
    if (this.observer) {
      this.observer.observe(element);
    }

    this.loadingStats.totalItems++;

    console.log(`[Lazy Loading] Registered item: ${id} (priority: ${item.priority})`);
    return id;
  }

  /**
   * Unregister lazy loading item
   */
  unregister(id: string): void {
    const item = this.lazyItems.get(id);
    if (item) {
      if (this.observer) {
        this.observer.unobserve(item.element);
      }
      
      this.lazyItems.delete(id);
      this.currentLoads.delete(id);
      
      // Remove from queue
      this.loadingQueue = this.loadingQueue.filter(queueItem => queueItem.id !== id);
      
      console.log(`[Lazy Loading] Unregistered item: ${id}`);
    }
  }

  /**
   * Load item by ID
   */
  private async loadItem(id: string, trigger: 'viewport' | 'scroll' | 'prefetch' | 'manual'): Promise<void> {
    const item = this.lazyItems.get(id);
    if (!item || item.loaded || item.loading) {
      return;
    }

    // Check if we can start loading (respect concurrent load limit)
    if (this.currentLoads.size >= this.config.maxConcurrentLoads) {
      // Add to queue if not already there
      if (!this.loadingQueue.find(queueItem => queueItem.id === id)) {
        this.loadingQueue.push(item);
        console.log(`[Lazy Loading] Item ${id} queued (trigger: ${trigger})`);
      }
      return;
    }

    await this.performLoad(item, trigger);
  }

  /**
   * Perform the actual loading
   */
  private async performLoad(item: LazyLoadItem, trigger: string): Promise<void> {
    item.loading = true;
    this.currentLoads.add(item.id);
    
    const startTime = performance.now();
    
    console.log(`[Lazy Loading] Loading item: ${item.id} (trigger: ${trigger})`);

    try {
      let success = false;

      if (item.src) {
        success = await this.loadImage(item);
      } else if (item.component) {
        success = await this.loadComponent(item);
      }

      if (success) {
        item.loaded = true;
        item.error = false;
        item.loadTime = performance.now() - startTime;
        
        this.loadingStats.loadedItems++;
        this.loadTimes.push(item.loadTime);
        this.updateAverageLoadTime();
        
        // Check if loaded from cache
        if (await this.wasLoadedFromCache(item)) {
          this.cacheHits++;
        }
        this.totalLoads++;
        this.updateCacheHitRate();

        console.log(`[Lazy Loading] Item loaded successfully: ${item.id} (${Math.round(item.loadTime)}ms)`);
        
        // Dispatch custom event
        this.dispatchLoadEvent(item, 'loaded');
      } else {
        throw new Error('Load failed');
      }

    } catch (error) {
      console.error(`[Lazy Loading] Failed to load item ${item.id}:`, error);
      
      item.retryCount++;
      
      if (item.retryCount < this.config.retryAttempts) {
        // Schedule retry
        setTimeout(() => {
          item.loading = false;
          this.currentLoads.delete(item.id);
          this.performLoad(item, 'retry');
        }, this.config.retryDelay * item.retryCount);
        
        console.log(`[Lazy Loading] Scheduling retry ${item.retryCount}/${this.config.retryAttempts} for item: ${item.id}`);
        return;
      } else {
        item.error = true;
        this.loadingStats.failedItems++;
        
        console.error(`[Lazy Loading] Item failed after ${this.config.retryAttempts} attempts: ${item.id}`);
        
        // Dispatch error event
        this.dispatchLoadEvent(item, 'error');
      }
    } finally {
      item.loading = false;
      this.currentLoads.delete(item.id);
      
      // Process next item in queue
      this.processLoadingQueue();
    }
  }

  /**
   * Load image
   */
  private async loadImage(item: LazyLoadItem): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        // Update element src
        if (item.element.tagName === 'IMG') {
          (item.element as HTMLImageElement).src = item.src!;
        } else {
          item.element.style.backgroundImage = `url(${item.src})`;
        }
        
        // Remove loading class and add loaded class
        item.element.classList.remove('lazy-loading');
        item.element.classList.add('lazy-loaded');
        
        resolve(true);
      };
      
      img.onerror = () => {
        resolve(false);
      };
      
      // Add loading class
      item.element.classList.add('lazy-loading');
      
      // Start loading
      img.src = item.src!;
    });
  }

  /**
   * Load component
   */
  private async loadComponent(item: LazyLoadItem): Promise<boolean> {
    try {
      const component = await item.component!();
      
      // Component loaded successfully
      item.element.classList.remove('lazy-loading');
      item.element.classList.add('lazy-loaded');
      
      // Store component reference
      (item.element as any).__lazyComponent = component;
      
      return true;
    } catch (error) {
      console.error(`[Lazy Loading] Component load failed for ${item.id}:`, error);
      return false;
    }
  }

  /**
   * Check if item was loaded from cache
   */
  private async wasLoadedFromCache(item: LazyLoadItem): Promise<boolean> {
    // For images, check if load time was very fast (likely cached)
    if (item.src && item.loadTime && item.loadTime < 50) {
      return true;
    }
    
    // For components, check if they were already in module cache
    if (item.component && item.loadTime && item.loadTime < 10) {
      return true;
    }
    
    return false;
  }

  /**
   * Process loading queue
   */
  private processLoadingQueue(): void {
    while (
      this.loadingQueue.length > 0 && 
      this.currentLoads.size < this.config.maxConcurrentLoads
    ) {
      // Sort queue by priority
      this.loadingQueue.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
      
      const nextItem = this.loadingQueue.shift()!;
      this.performLoad(nextItem, 'queue');
    }
  }

  /**
   * Prefetch high priority items
   */
  private prefetchHighPriorityItems(): void {
    if (!this.config.enablePrefetch) return;

    console.log('[Lazy Loading] Prefetching high priority items');

    this.lazyItems.forEach((item) => {
      if (item.priority === 'high' && !item.loaded && !item.loading) {
        // Check if item is likely to be needed soon
        if (this.shouldPrefetchItem(item)) {
          this.loadItem(item.id, 'prefetch');
        }
      }
    });
  }

  /**
   * Determine if item should be prefetched
   */
  private shouldPrefetchItem(item: LazyLoadItem): boolean {
    // Don't prefetch if element is already in viewport
    if (this.isElementInViewport(item.element)) {
      return false;
    }

    // Check if element is close to viewport
    const rect = item.element.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    
    // Prefetch if element is within 2 viewport heights/widths
    return (
      rect.top < windowHeight * 2 &&
      rect.bottom > -windowHeight &&
      rect.left < windowWidth * 2 &&
      rect.right > -windowWidth
    );
  }

  /**
   * Check if element is in viewport
   */
  private isElementInViewport(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  }

  /**
   * Update average load time
   */
  private updateAverageLoadTime(): void {
    if (this.loadTimes.length > 0) {
      const sum = this.loadTimes.reduce((a, b) => a + b, 0);
      this.loadingStats.averageLoadTime = sum / this.loadTimes.length;
    }
  }

  /**
   * Update cache hit rate
   */
  private updateCacheHitRate(): void {
    if (this.totalLoads > 0) {
      this.loadingStats.cacheHitRate = this.cacheHits / this.totalLoads;
    }
  }

  /**
   * Dispatch load event
   */
  private dispatchLoadEvent(item: LazyLoadItem, type: 'loaded' | 'error'): void {
    const event = new CustomEvent(`lazy-${type}`, {
      detail: {
        id: item.id,
        element: item.element,
        loadTime: item.loadTime,
        retryCount: item.retryCount
      }
    });
    
    item.element.dispatchEvent(event);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `lazy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Force load item
   */
  async forceLoad(id: string): Promise<void> {
    await this.loadItem(id, 'manual');
  }

  /**
   * Force load all items
   */
  async forceLoadAll(): Promise<void> {
    console.log('[Lazy Loading] Force loading all items');
    
    const promises = Array.from(this.lazyItems.keys()).map(id => 
      this.loadItem(id, 'manual')
    );
    
    await Promise.allSettled(promises);
  }

  /**
   * Get loading statistics
   */
  getLoadingStats(): LoadingStats {
    return { ...this.loadingStats };
  }

  /**
   * Get item status
   */
  getItemStatus(id: string): LazyLoadItem | null {
    const item = this.lazyItems.get(id);
    return item ? { ...item } : null;
  }

  /**
   * Get all items status
   */
  getAllItemsStatus(): LazyLoadItem[] {
    return Array.from(this.lazyItems.values()).map(item => ({ ...item }));
  }

  /**
   * Clear loading statistics
   */
  clearStats(): void {
    this.loadingStats = {
      totalItems: this.lazyItems.size,
      loadedItems: 0,
      failedItems: 0,
      averageLoadTime: 0,
      cacheHitRate: 0
    };
    
    this.cacheHits = 0;
    this.totalLoads = 0;
    this.loadTimes = [];
  }

  /**
   * Destroy lazy loading manager
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    this.lazyItems.clear();
    this.loadingQueue = [];
    this.currentLoads.clear();
    
    console.log('[Lazy Loading] Lazy loading manager destroyed');
  }
}

// Export singleton instance
export const lazyLoadingManager = new LazyLoadingManager();
export default lazyLoadingManager;