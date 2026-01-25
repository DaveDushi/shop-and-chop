/**
 * Cache Optimizer for Mobile Networks
 * Optimizes caching strategies based on network conditions and device capabilities
 */

interface NetworkConditions {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // milliseconds
  saveData: boolean;
}

interface CacheStrategy {
  name: string;
  maxAge: number;
  maxEntries: number;
  compressionLevel: 'none' | 'low' | 'medium' | 'high';
  prefetchEnabled: boolean;
  backgroundSyncEnabled: boolean;
}

interface OptimizationConfig {
  enableAdaptiveCaching: boolean;
  enableNetworkAwareness: boolean;
  enableDataSaver: boolean;
  aggressiveCleanupThreshold: number; // Storage usage percentage
  prefetchBudget: number; // KB per session
}

class CacheOptimizer {
  private networkConditions: NetworkConditions = {
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    saveData: false
  };
  
  private config: OptimizationConfig = {
    enableAdaptiveCaching: true,
    enableNetworkAwareness: true,
    enableDataSaver: true,
    aggressiveCleanupThreshold: 80, // 80% storage usage
    prefetchBudget: 1024 // 1MB per session
  };
  
  private prefetchBudgetUsed: number = 0;
  private cacheStrategies: Map<string, CacheStrategy> = new Map();
  private networkChangeListeners: Set<(conditions: NetworkConditions) => void> = new Set();

  /**
   * Initialize cache optimizer
   */
  initialize(config?: Partial<OptimizationConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    console.log('[Cache Optimizer] Initializing cache optimization');

    try {
      // Monitor network conditions
      this.monitorNetworkConditions();
      
      // Set up default cache strategies
      this.setupDefaultCacheStrategies();
      
      // Optimize existing caches
      this.optimizeExistingCaches();
      
      // Set up periodic optimization
      this.setupPeriodicOptimization();
      
      console.log('[Cache Optimizer] Cache optimization initialized');
    } catch (error) {
      console.error('[Cache Optimizer] Failed to initialize:', error);
    }
  }

  /**
   * Monitor network conditions
   */
  private monitorNetworkConditions(): void {
    if (!this.config.enableNetworkAwareness) return;

    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection) {
      this.updateNetworkConditions(connection);
      
      // Listen for network changes
      connection.addEventListener('change', () => {
        this.updateNetworkConditions(connection);
        this.adaptCacheStrategies();
      });
    }

    // Monitor data saver preference
    if ('connection' in navigator && 'saveData' in (navigator as any).connection) {
      this.networkConditions.saveData = (navigator as any).connection.saveData;
    }
  }

  /**
   * Update network conditions
   */
  private updateNetworkConditions(connection: any): void {
    const oldConditions = { ...this.networkConditions };
    
    this.networkConditions = {
      effectiveType: connection.effectiveType || 'unknown',
      downlink: connection.downlink || 0,
      rtt: connection.rtt || 0,
      saveData: connection.saveData || false
    };

    console.log('[Cache Optimizer] Network conditions updated:', this.networkConditions);

    // Notify listeners if conditions changed significantly
    if (this.hasSignificantNetworkChange(oldConditions, this.networkConditions)) {
      this.notifyNetworkChangeListeners();
    }
  }

  /**
   * Check if network change is significant
   */
  private hasSignificantNetworkChange(old: NetworkConditions, current: NetworkConditions): boolean {
    return (
      old.effectiveType !== current.effectiveType ||
      Math.abs(old.downlink - current.downlink) > 1 ||
      Math.abs(old.rtt - current.rtt) > 100 ||
      old.saveData !== current.saveData
    );
  }

  /**
   * Notify network change listeners
   */
  private notifyNetworkChangeListeners(): void {
    this.networkChangeListeners.forEach(listener => {
      try {
        listener(this.networkConditions);
      } catch (error) {
        console.error('[Cache Optimizer] Error in network change listener:', error);
      }
    });
  }

  /**
   * Set up default cache strategies
   */
  private setupDefaultCacheStrategies(): void {
    // High-speed network strategy
    this.cacheStrategies.set('high-speed', {
      name: 'high-speed',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      maxEntries: 200,
      compressionLevel: 'low',
      prefetchEnabled: true,
      backgroundSyncEnabled: true
    });

    // Medium-speed network strategy
    this.cacheStrategies.set('medium-speed', {
      name: 'medium-speed',
      maxAge: 12 * 60 * 60 * 1000, // 12 hours
      maxEntries: 100,
      compressionLevel: 'medium',
      prefetchEnabled: true,
      backgroundSyncEnabled: true
    });

    // Low-speed network strategy
    this.cacheStrategies.set('low-speed', {
      name: 'low-speed',
      maxAge: 6 * 60 * 60 * 1000, // 6 hours
      maxEntries: 50,
      compressionLevel: 'high',
      prefetchEnabled: false,
      backgroundSyncEnabled: false
    });

    // Data saver strategy
    this.cacheStrategies.set('data-saver', {
      name: 'data-saver',
      maxAge: 2 * 60 * 60 * 1000, // 2 hours
      maxEntries: 25,
      compressionLevel: 'high',
      prefetchEnabled: false,
      backgroundSyncEnabled: false
    });
  }

  /**
   * Get optimal cache strategy based on current conditions
   */
  getOptimalCacheStrategy(): CacheStrategy {
    if (!this.config.enableAdaptiveCaching) {
      return this.cacheStrategies.get('medium-speed')!;
    }

    // Data saver mode takes precedence
    if (this.networkConditions.saveData && this.config.enableDataSaver) {
      return this.cacheStrategies.get('data-saver')!;
    }

    // Determine strategy based on network conditions
    const { effectiveType, downlink, rtt } = this.networkConditions;

    if (effectiveType === '4g' && downlink > 5 && rtt < 100) {
      return this.cacheStrategies.get('high-speed')!;
    } else if (effectiveType === '3g' || (downlink > 1 && rtt < 300)) {
      return this.cacheStrategies.get('medium-speed')!;
    } else {
      return this.cacheStrategies.get('low-speed')!;
    }
  }

  /**
   * Adapt cache strategies based on current conditions
   */
  private async adaptCacheStrategies(): Promise<void> {
    if (!this.config.enableAdaptiveCaching) return;

    console.log('[Cache Optimizer] Adapting cache strategies to network conditions');

    const optimalStrategy = this.getOptimalCacheStrategy();
    
    try {
      // Update service worker cache configuration
      await this.updateServiceWorkerCacheConfig(optimalStrategy);
      
      // Optimize existing caches
      await this.optimizeExistingCaches();
      
      // Adjust prefetch behavior
      this.adjustPrefetchBehavior(optimalStrategy);
      
      console.log(`[Cache Optimizer] Adapted to ${optimalStrategy.name} strategy`);
    } catch (error) {
      console.error('[Cache Optimizer] Failed to adapt cache strategies:', error);
    }
  }

  /**
   * Update service worker cache configuration
   */
  private async updateServiceWorkerCacheConfig(strategy: CacheStrategy): Promise<void> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const messageChannel = new MessageChannel();
        
        const response = await new Promise((resolve, reject) => {
          messageChannel.port1.onmessage = (event) => {
            if (event.data.success) {
              resolve(event.data);
            } else {
              reject(new Error(event.data.error));
            }
          };

          navigator.serviceWorker.controller!.postMessage({
            type: 'UPDATE_CACHE_STRATEGY',
            payload: strategy
          }, [messageChannel.port2]);
        });

        console.log('[Cache Optimizer] Service worker cache strategy updated');
      } catch (error) {
        console.error('[Cache Optimizer] Failed to update service worker cache strategy:', error);
      }
    }
  }

  /**
   * Optimize existing caches
   */
  private async optimizeExistingCaches(): Promise<void> {
    try {
      const strategy = this.getOptimalCacheStrategy();
      
      // Get current storage usage
      const storageUsage = await this.getStorageUsage();
      
      if (storageUsage.percentage > this.config.aggressiveCleanupThreshold) {
        console.log('[Cache Optimizer] Storage usage high, performing aggressive cleanup');
        await this.performAggressiveCleanup();
      } else if (storageUsage.percentage > 60) {
        console.log('[Cache Optimizer] Storage usage moderate, performing standard cleanup');
        await this.performStandardCleanup();
      }

      // Apply compression to cached data if needed
      if (strategy.compressionLevel !== 'none') {
        await this.compressCachedData(strategy.compressionLevel);
      }

    } catch (error) {
      console.error('[Cache Optimizer] Failed to optimize existing caches:', error);
    }
  }

  /**
   * Get storage usage information
   */
  private async getStorageUsage(): Promise<{ usage: number; quota: number; percentage: number }> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
          percentage: estimate.quota ? (estimate.usage! / estimate.quota) * 100 : 0
        };
      }
    } catch (error) {
      console.error('[Cache Optimizer] Failed to get storage usage:', error);
    }
    
    return { usage: 0, quota: 0, percentage: 0 };
  }

  /**
   * Perform aggressive cleanup
   */
  private async performAggressiveCleanup(): Promise<void> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const messageChannel = new MessageChannel();
        
        await new Promise((resolve, reject) => {
          messageChannel.port1.onmessage = (event) => {
            if (event.data.success) {
              resolve(event.data);
            } else {
              reject(new Error(event.data.error));
            }
          };

          navigator.serviceWorker.controller!.postMessage({
            type: 'CLEANUP_CACHE',
            payload: { aggressive: true }
          }, [messageChannel.port2]);
        });

        console.log('[Cache Optimizer] Aggressive cleanup completed');
      } catch (error) {
        console.error('[Cache Optimizer] Aggressive cleanup failed:', error);
      }
    }
  }

  /**
   * Perform standard cleanup
   */
  private async performStandardCleanup(): Promise<void> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const messageChannel = new MessageChannel();
        
        await new Promise((resolve, reject) => {
          messageChannel.port1.onmessage = (event) => {
            if (event.data.success) {
              resolve(event.data);
            } else {
              reject(new Error(event.data.error));
            }
          };

          navigator.serviceWorker.controller!.postMessage({
            type: 'CLEANUP_CACHE',
            payload: { aggressive: false }
          }, [messageChannel.port2]);
        });

        console.log('[Cache Optimizer] Standard cleanup completed');
      } catch (error) {
        console.error('[Cache Optimizer] Standard cleanup failed:', error);
      }
    }
  }

  /**
   * Compress cached data
   */
  private async compressCachedData(compressionLevel: 'low' | 'medium' | 'high'): Promise<void> {
    // This would typically involve working with the service worker
    // to compress cached responses based on the compression level
    console.log(`[Cache Optimizer] Applying ${compressionLevel} compression to cached data`);
    
    // Implementation would depend on the specific compression strategy
    // For now, we'll just log the intent
  }

  /**
   * Adjust prefetch behavior
   */
  private adjustPrefetchBehavior(strategy: CacheStrategy): void {
    if (!strategy.prefetchEnabled) {
      // Disable prefetching
      this.prefetchBudgetUsed = this.config.prefetchBudget; // Exhaust budget
      console.log('[Cache Optimizer] Prefetching disabled due to network conditions');
    } else {
      // Reset prefetch budget if conditions improved
      if (this.prefetchBudgetUsed >= this.config.prefetchBudget) {
        this.prefetchBudgetUsed = 0;
        console.log('[Cache Optimizer] Prefetch budget reset due to improved conditions');
      }
    }
  }

  /**
   * Check if prefetch is allowed
   */
  canPrefetch(estimatedSize: number): boolean {
    const strategy = this.getOptimalCacheStrategy();
    
    if (!strategy.prefetchEnabled) {
      return false;
    }
    
    if (this.networkConditions.saveData && this.config.enableDataSaver) {
      return false;
    }
    
    return (this.prefetchBudgetUsed + estimatedSize) <= this.config.prefetchBudget;
  }

  /**
   * Record prefetch usage
   */
  recordPrefetchUsage(size: number): void {
    this.prefetchBudgetUsed += size;
    console.log(`[Cache Optimizer] Prefetch budget used: ${this.prefetchBudgetUsed}/${this.config.prefetchBudget} KB`);
  }

  /**
   * Set up periodic optimization
   */
  private setupPeriodicOptimization(): void {
    // Run optimization every 5 minutes
    setInterval(() => {
      this.optimizeExistingCaches();
    }, 5 * 60 * 1000);

    // Reset prefetch budget every hour
    setInterval(() => {
      this.prefetchBudgetUsed = 0;
      console.log('[Cache Optimizer] Prefetch budget reset');
    }, 60 * 60 * 1000);
  }

  /**
   * Get cache recommendations for a specific resource type
   */
  getCacheRecommendations(resourceType: 'static' | 'dynamic' | 'api' | 'image'): {
    strategy: string;
    maxAge: number;
    maxEntries: number;
    shouldCompress: boolean;
    shouldPrefetch: boolean;
  } {
    const baseStrategy = this.getOptimalCacheStrategy();
    
    // Adjust recommendations based on resource type
    let maxAge = baseStrategy.maxAge;
    let maxEntries = baseStrategy.maxEntries;
    
    switch (resourceType) {
      case 'static':
        maxAge *= 2; // Static assets can be cached longer
        maxEntries = Math.floor(maxEntries * 0.3);
        break;
      case 'dynamic':
        maxAge *= 0.5; // Dynamic content should be fresher
        maxEntries = Math.floor(maxEntries * 0.4);
        break;
      case 'api':
        maxAge *= 0.25; // API responses should be very fresh
        maxEntries = Math.floor(maxEntries * 0.2);
        break;
      case 'image':
        maxAge *= 1.5; // Images can be cached longer
        maxEntries = Math.floor(maxEntries * 0.1);
        break;
    }

    return {
      strategy: baseStrategy.name,
      maxAge,
      maxEntries,
      shouldCompress: baseStrategy.compressionLevel !== 'none',
      shouldPrefetch: baseStrategy.prefetchEnabled && this.canPrefetch(100) // Assume 100KB
    };
  }

  /**
   * Add network change listener
   */
  onNetworkChange(listener: (conditions: NetworkConditions) => void): void {
    this.networkChangeListeners.add(listener);
  }

  /**
   * Remove network change listener
   */
  offNetworkChange(listener: (conditions: NetworkConditions) => void): void {
    this.networkChangeListeners.delete(listener);
  }

  /**
   * Get current network conditions
   */
  getNetworkConditions(): NetworkConditions {
    return { ...this.networkConditions };
  }

  /**
   * Get current cache strategy
   */
  getCurrentCacheStrategy(): CacheStrategy {
    return this.getOptimalCacheStrategy();
  }

  /**
   * Force cache optimization
   */
  async forceOptimization(): Promise<void> {
    console.log('[Cache Optimizer] Forcing cache optimization');
    await this.adaptCacheStrategies();
  }

  /**
   * Get optimization status
   */
  getOptimizationStatus(): {
    networkConditions: NetworkConditions;
    currentStrategy: CacheStrategy;
    prefetchBudgetUsed: number;
    prefetchBudgetRemaining: number;
    storageOptimized: boolean;
  } {
    return {
      networkConditions: this.getNetworkConditions(),
      currentStrategy: this.getCurrentCacheStrategy(),
      prefetchBudgetUsed: this.prefetchBudgetUsed,
      prefetchBudgetRemaining: this.config.prefetchBudget - this.prefetchBudgetUsed,
      storageOptimized: true // This would be determined by actual optimization status
    };
  }
}

// Export singleton instance
export const cacheOptimizer = new CacheOptimizer();
export default cacheOptimizer;