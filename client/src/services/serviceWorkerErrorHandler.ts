/**
 * Service Worker Error Handler
 * Provides comprehensive error handling and recovery mechanisms for service worker operations
 */

export interface ServiceWorkerError {
  type: 'registration' | 'cache' | 'sync' | 'storage' | 'network' | 'unknown';
  message: string;
  originalError: Error;
  timestamp: Date;
  context?: any;
  recoverable: boolean;
}

export interface ErrorRecoveryStrategy {
  type: string;
  action: () => Promise<boolean>;
  description: string;
}

export interface ServiceWorkerErrorHandlerConfig {
  enableLogging: boolean;
  enableRecovery: boolean;
  maxRetryAttempts: number;
  retryDelay: number;
  enableFallbackMode: boolean;
}

class ServiceWorkerErrorHandler {
  private config: ServiceWorkerErrorHandlerConfig = {
    enableLogging: true,
    enableRecovery: true,
    maxRetryAttempts: 3,
    retryDelay: 1000,
    enableFallbackMode: true
  };

  private errorHistory: ServiceWorkerError[] = [];
  private recoveryStrategies: Map<string, ErrorRecoveryStrategy[]> = new Map();
  private fallbackMode = false;

  constructor() {
    this.initializeRecoveryStrategies();
  }

  /**
   * Configure error handler
   */
  configure(config: Partial<ServiceWorkerErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Handle service worker registration errors
   */
  async handleRegistrationError(error: Error): Promise<void> {
    const swError: ServiceWorkerError = {
      type: 'registration',
      message: 'Service worker registration failed',
      originalError: error,
      timestamp: new Date(),
      recoverable: true
    };

    this.logError(swError);
    this.addToHistory(swError);

    if (this.config.enableRecovery) {
      const recovered = await this.attemptRecovery(swError);
      if (!recovered && this.config.enableFallbackMode) {
        this.enableFallbackMode();
      }
    }

    // Notify main thread
    this.notifyMainThread('REGISTRATION_ERROR', {
      error: swError,
      fallbackMode: this.fallbackMode
    });
  }

  /**
   * Handle cache operation errors
   */
  async handleCacheError(error: Error, request: Request): Promise<Response> {
    const swError: ServiceWorkerError = {
      type: 'cache',
      message: 'Cache operation failed',
      originalError: error,
      timestamp: new Date(),
      context: { url: request.url, method: request.method },
      recoverable: true
    };

    this.logError(swError);
    this.addToHistory(swError);

    // Try recovery strategies
    if (this.config.enableRecovery) {
      const recovered = await this.attemptRecovery(swError);
      if (recovered) {
        // Retry the cache operation
        try {
          return await this.retryCacheOperation(request);
        } catch (retryError) {
          console.error('[SW Error Handler] Cache retry failed:', retryError);
        }
      }
    }

    // Fallback to network or offline response
    return this.createFallbackResponse(request, swError);
  }

  /**
   * Handle sync operation errors
   */
  async handleSyncError(error: Error, operation: any): Promise<void> {
    const swError: ServiceWorkerError = {
      type: 'sync',
      message: 'Sync operation failed',
      originalError: error,
      timestamp: new Date(),
      context: { operation },
      recoverable: this.isSyncErrorRecoverable(error)
    };

    this.logError(swError);
    this.addToHistory(swError);

    if (this.config.enableRecovery && swError.recoverable) {
      await this.attemptRecovery(swError);
    }

    // Notify main thread about sync failure
    this.notifyMainThread('SYNC_ERROR', {
      error: swError,
      operation
    });
  }

  /**
   * Handle storage quota exceeded errors
   */
  async handleStorageQuotaExceeded(error: Error): Promise<void> {
    const swError: ServiceWorkerError = {
      type: 'storage',
      message: 'Storage quota exceeded',
      originalError: error,
      timestamp: new Date(),
      recoverable: true
    };

    this.logError(swError);
    this.addToHistory(swError);

    if (this.config.enableRecovery) {
      const recovered = await this.attemptRecovery(swError);
      if (recovered) {
        console.log('[SW Error Handler] Storage quota issue resolved');
      }
    }

    // Notify main thread about storage issue
    this.notifyMainThread('STORAGE_QUOTA_EXCEEDED', {
      error: swError
    });
  }

  /**
   * Handle network errors
   */
  async handleNetworkError(error: Error, request: Request): Promise<Response> {
    const swError: ServiceWorkerError = {
      type: 'network',
      message: 'Network request failed',
      originalError: error,
      timestamp: new Date(),
      context: { url: request.url, method: request.method },
      recoverable: false // Network errors are not directly recoverable
    };

    this.logError(swError);
    this.addToHistory(swError);

    // Try to serve from cache as fallback
    try {
      const cache = await caches.open('dynamic-cache-v2.0.0');
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        console.log('[SW Error Handler] Serving stale cache for network error:', request.url);
        return cachedResponse;
      }
    } catch (cacheError) {
      console.error('[SW Error Handler] Cache fallback failed:', cacheError);
    }

    return this.createOfflineResponse(request);
  }

  /**
   * Handle unknown errors
   */
  async handleUnknownError(error: Error, context?: any): Promise<void> {
    const swError: ServiceWorkerError = {
      type: 'unknown',
      message: 'Unknown service worker error',
      originalError: error,
      timestamp: new Date(),
      context,
      recoverable: false
    };

    this.logError(swError);
    this.addToHistory(swError);

    // Notify main thread
    this.notifyMainThread('UNKNOWN_ERROR', {
      error: swError
    });
  }

  /**
   * Initialize recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    // Registration error recovery strategies
    this.recoveryStrategies.set('registration', [
      {
        type: 'retry_registration',
        action: async () => {
          try {
            await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            return true;
          } catch (error) {
            return false;
          }
        },
        description: 'Retry service worker registration'
      },
      {
        type: 'clear_registration',
        action: async () => {
          try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(reg => reg.unregister()));
            return true;
          } catch (error) {
            return false;
          }
        },
        description: 'Clear existing registrations and retry'
      }
    ]);

    // Cache error recovery strategies
    this.recoveryStrategies.set('cache', [
      {
        type: 'clear_corrupted_cache',
        action: async () => {
          try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            return true;
          } catch (error) {
            return false;
          }
        },
        description: 'Clear all caches and start fresh'
      },
      {
        type: 'recreate_cache',
        action: async () => {
          try {
            await caches.open('static-cache-v2.0.0');
            return true;
          } catch (error) {
            return false;
          }
        },
        description: 'Recreate cache storage'
      }
    ]);

    // Sync error recovery strategies
    this.recoveryStrategies.set('sync', [
      {
        type: 'clear_sync_queue',
        action: async () => {
          try {
            const db = await this.openIndexedDB();
            const transaction = db.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            await store.clear();
            return true;
          } catch (error) {
            return false;
          }
        },
        description: 'Clear sync queue to resolve conflicts'
      },
      {
        type: 'reset_sync_state',
        action: async () => {
          try {
            // Reset sync-related metadata
            const db = await this.openIndexedDB();
            const transaction = db.transaction(['metadata'], 'readwrite');
            const store = transaction.objectStore('metadata');
            await store.delete('last-sync-time');
            await store.delete('sync-failures');
            return true;
          } catch (error) {
            return false;
          }
        },
        description: 'Reset sync state and metadata'
      }
    ]);

    // Storage error recovery strategies
    this.recoveryStrategies.set('storage', [
      {
        type: 'aggressive_cleanup',
        action: async () => {
          try {
            await this.performAggressiveCleanup();
            return true;
          } catch (error) {
            return false;
          }
        },
        description: 'Perform aggressive storage cleanup'
      },
      {
        type: 'clear_old_data',
        action: async () => {
          try {
            await this.clearOldData();
            return true;
          } catch (error) {
            return false;
          }
        },
        description: 'Clear old cached data'
      }
    ]);
  }

  /**
   * Attempt error recovery
   */
  private async attemptRecovery(error: ServiceWorkerError): Promise<boolean> {
    if (!error.recoverable) {
      console.log('[SW Error Handler] Error not recoverable:', error.type);
      return false;
    }

    const strategies = this.recoveryStrategies.get(error.type);
    if (!strategies) {
      console.log('[SW Error Handler] No recovery strategies for error type:', error.type);
      return false;
    }

    console.log(`[SW Error Handler] Attempting recovery for ${error.type} error`);

    for (const strategy of strategies) {
      try {
        console.log(`[SW Error Handler] Trying recovery strategy: ${strategy.description}`);
        const success = await strategy.action();
        
        if (success) {
          console.log(`[SW Error Handler] Recovery successful: ${strategy.description}`);
          this.logRecovery(error, strategy);
          return true;
        }
      } catch (recoveryError) {
        console.error(`[SW Error Handler] Recovery strategy failed: ${strategy.description}`, recoveryError);
      }

      // Wait before trying next strategy
      await this.delay(this.config.retryDelay);
    }

    console.log(`[SW Error Handler] All recovery strategies failed for ${error.type} error`);
    return false;
  }

  /**
   * Retry cache operation
   */
  private async retryCacheOperation(request: Request): Promise<Response> {
    // Try to fetch from network and cache
    const response = await fetch(request);
    
    if (response.ok) {
      try {
        const cache = await caches.open('dynamic-cache-v2.0.0');
        await cache.put(request, response.clone());
      } catch (cacheError) {
        console.warn('[SW Error Handler] Failed to cache retry response:', cacheError);
      }
    }
    
    return response;
  }

  /**
   * Create fallback response for cache errors
   */
  private createFallbackResponse(request: Request, error: ServiceWorkerError): Response {
    // Try to fetch from network as fallback
    return fetch(request).catch(() => {
      return this.createOfflineResponse(request);
    });
  }

  /**
   * Create offline response
   */
  private createOfflineResponse(request: Request): Response {
    const url = new URL(request.url);
    
    if (url.pathname.startsWith('/api/')) {
      return new Response(
        JSON.stringify({
          error: 'Offline',
          message: 'This request requires an internet connection',
          timestamp: new Date().toISOString()
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Offline - Shop&Chop</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
          .offline-message { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .error-details { margin-top: 20px; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="offline-message">
          <h1>You're offline</h1>
          <p>This page isn't available offline. Please check your connection and try again.</p>
          <div class="error-details">
            <p>Error: ${error.message}</p>
            <p>Time: ${error.timestamp.toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>`,
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }

  /**
   * Check if sync error is recoverable
   */
  private isSyncErrorRecoverable(error: Error): boolean {
    // Network errors during sync are recoverable (will retry later)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true;
    }
    
    // Server errors (5xx) are recoverable
    if (error.message.includes('Server error')) {
      return true;
    }
    
    // Timeout errors are recoverable
    if (error.message.includes('timeout')) {
      return true;
    }
    
    // Storage errors during sync are recoverable
    if (error.name === 'QuotaExceededError') {
      return true;
    }
    
    return false;
  }

  /**
   * Enable fallback mode
   */
  private enableFallbackMode(): void {
    this.fallbackMode = true;
    console.log('[SW Error Handler] Fallback mode enabled - operating without service worker');
    
    // Store fallback mode state
    try {
      localStorage.setItem('sw-fallback-mode', 'true');
      localStorage.setItem('sw-fallback-timestamp', new Date().toISOString());
    } catch (error) {
      console.error('[SW Error Handler] Failed to store fallback mode state:', error);
    }
  }

  /**
   * Check if in fallback mode
   */
  isInFallbackMode(): boolean {
    return this.fallbackMode || localStorage.getItem('sw-fallback-mode') === 'true';
  }

  /**
   * Exit fallback mode
   */
  exitFallbackMode(): void {
    this.fallbackMode = false;
    localStorage.removeItem('sw-fallback-mode');
    localStorage.removeItem('sw-fallback-timestamp');
    console.log('[SW Error Handler] Exited fallback mode');
  }

  /**
   * Perform aggressive cleanup
   */
  private async performAggressiveCleanup(): Promise<void> {
    // Clear all caches
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    
    // Clear IndexedDB data
    const db = await this.openIndexedDB();
    
    // Clear old shopping lists (keep only last 24 hours)
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 24);
    
    const transaction = db.transaction(['shoppingLists'], 'readwrite');
    const store = transaction.objectStore('shoppingLists');
    const cursor = await store.openCursor();
    
    while (cursor) {
      const entry = cursor.value;
      const lastModified = new Date(entry.metadata.lastModified);
      
      if (lastModified < cutoffDate) {
        await cursor.delete();
      }
      
      cursor.continue();
    }
  }

  /**
   * Clear old data
   */
  private async clearOldData(): Promise<void> {
    const db = await this.openIndexedDB();
    
    // Clear old sync operations
    const syncTransaction = db.transaction(['syncQueue'], 'readwrite');
    const syncStore = syncTransaction.objectStore('syncQueue');
    const syncCursor = await syncStore.openCursor();
    
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 1); // Clear operations older than 1 hour
    
    while (syncCursor) {
      const operation = syncCursor.value;
      const timestamp = new Date(operation.timestamp);
      
      if (timestamp < cutoffDate) {
        await syncCursor.delete();
      }
      
      syncCursor.continue();
    }
  }

  /**
   * Open IndexedDB
   */
  private async openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ShopAndChopDB', 2);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('shoppingLists')) {
          const shoppingListStore = db.createObjectStore('shoppingLists', { keyPath: 'metadata.id' });
          shoppingListStore.createIndex('lastModified', 'metadata.lastModified');
        }
        
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('timestamp', 'timestamp');
        }
        
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata');
        }
      };
    });
  }

  /**
   * Log error
   */
  private logError(error: ServiceWorkerError): void {
    if (!this.config.enableLogging) return;
    
    console.error(`[SW Error Handler] ${error.type.toUpperCase()} ERROR:`, {
      message: error.message,
      originalError: error.originalError,
      timestamp: error.timestamp,
      context: error.context,
      recoverable: error.recoverable
    });
  }

  /**
   * Log recovery
   */
  private logRecovery(error: ServiceWorkerError, strategy: ErrorRecoveryStrategy): void {
    if (!this.config.enableLogging) return;
    
    console.log(`[SW Error Handler] RECOVERY SUCCESS:`, {
      errorType: error.type,
      strategy: strategy.description,
      timestamp: new Date()
    });
  }

  /**
   * Add error to history
   */
  private addToHistory(error: ServiceWorkerError): void {
    this.errorHistory.push(error);
    
    // Keep only last 50 errors
    if (this.errorHistory.length > 50) {
      this.errorHistory.splice(0, this.errorHistory.length - 50);
    }
  }

  /**
   * Get error history
   */
  getErrorHistory(): ServiceWorkerError[] {
    return [...this.errorHistory];
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): any {
    const stats = {
      total: this.errorHistory.length,
      byType: {} as Record<string, number>,
      recoverable: 0,
      recent: 0 // Last hour
    };
    
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    this.errorHistory.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      
      if (error.recoverable) {
        stats.recoverable++;
      }
      
      if (error.timestamp > oneHourAgo) {
        stats.recent++;
      }
    });
    
    return stats;
  }

  /**
   * Notify main thread
   */
  private notifyMainThread(type: string, payload: any): void {
    // In service worker context, use postMessage to all clients
    if (typeof self !== 'undefined' && 'clients' in self) {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: `SW_ERROR_${type}`,
            payload
          });
        });
      });
    }
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const serviceWorkerErrorHandler = new ServiceWorkerErrorHandler();
export default serviceWorkerErrorHandler;