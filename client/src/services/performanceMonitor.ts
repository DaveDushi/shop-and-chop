/**
 * Performance Monitor for PWA
 * Collects and analyzes performance metrics for optimization
 */

// Performance monitoring types
interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  
  // Custom metrics
  appLoadTime?: number;
  shoppingListLoadTime?: number;
  cacheHitRate?: number;
  syncDuration?: number;
  offlineOperations?: number;
  
  // Network metrics
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  
  // Memory metrics
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
  
  // Storage metrics
  cacheStorageUsage?: number;
  indexedDBUsage?: number;
  localStorageUsage?: number;
  
  timestamp: number;
  url: string;
  userAgent: string;
  [key: string]: number | string | undefined;
}

interface PerformanceThresholds {
  lcp: { good: number; needsImprovement: number };
  fid: { good: number; needsImprovement: number };
  cls: { good: number; needsImprovement: number };
  fcp: { good: number; needsImprovement: number };
  ttfb: { good: number; needsImprovement: number };
  appLoadTime: { good: number; needsImprovement: number };
  cacheHitRate: { good: number; needsImprovement: number };
}

interface PerformanceConfig {
  enableMetrics: boolean;
  enableReporting: boolean;
  sampleRate: number; // 0-1, percentage of sessions to monitor
  reportingEndpoint?: string;
  bufferSize: number;
  reportingInterval: number; // milliseconds
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private observer: PerformanceObserver | null = null;
  private config: PerformanceConfig = {
    enableMetrics: true,
    enableReporting: false,
    sampleRate: 0.1, // Monitor 10% of sessions
    bufferSize: 100,
    reportingInterval: 30000 // 30 seconds
  };
  
  private thresholds: PerformanceThresholds = {
    lcp: { good: 2500, needsImprovement: 4000 },
    fid: { good: 100, needsImprovement: 300 },
    cls: { good: 0.1, needsImprovement: 0.25 },
    fcp: { good: 1800, needsImprovement: 3000 },
    ttfb: { good: 800, needsImprovement: 1800 },
    appLoadTime: { good: 3000, needsImprovement: 5000 },
    cacheHitRate: { good: 0.9, needsImprovement: 0.7 }
  };
  
  private startTime: number = performance.now();
  private reportingTimer: NodeJS.Timeout | null = null;
  private shouldMonitor: boolean = false;

  /**
   * Initialize performance monitoring
   */
  initialize(config?: Partial<PerformanceConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Determine if this session should be monitored
    this.shouldMonitor = Math.random() < this.config.sampleRate;
    
    if (!this.shouldMonitor || !this.config.enableMetrics) {
      console.log('[Performance] Monitoring disabled for this session');
      return;
    }

    console.log('[Performance] Initializing performance monitoring');

    try {
      // Set up performance observer for Core Web Vitals
      this.setupPerformanceObserver();
      
      // Monitor app load time
      this.monitorAppLoadTime();
      
      // Monitor network information
      this.monitorNetworkInformation();
      
      // Monitor memory usage
      this.monitorMemoryUsage();
      
      // Monitor storage usage
      this.monitorStorageUsage();
      
      // Set up periodic reporting
      if (this.config.enableReporting) {
        this.setupPeriodicReporting();
      }
      
      // Monitor page visibility changes
      this.setupVisibilityChangeMonitoring();
      
      console.log('[Performance] Performance monitoring initialized');
    } catch (error) {
      console.error('[Performance] Failed to initialize performance monitoring:', error);
    }
  }

  /**
   * Configure performance monitoring
   */
  configure(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.config.enableReporting && !this.reportingTimer) {
      this.setupPeriodicReporting();
    } else if (!this.config.enableReporting && this.reportingTimer) {
      clearInterval(this.reportingTimer);
      this.reportingTimer = null;
    }
  }

  /**
   * Set up performance observer for Core Web Vitals
   */
  private setupPerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) {
      console.warn('[Performance] PerformanceObserver not supported');
      return;
    }

    try {
      // Observe paint metrics (FCP, LCP)
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handlePerformanceEntry(entry);
        }
      });

      // Observe different entry types
      const entryTypes = ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift', 'navigation'];
      
      for (const entryType of entryTypes) {
        try {
          this.observer.observe({ entryTypes: [entryType] });
        } catch (error) {
          console.warn(`[Performance] Cannot observe ${entryType}:`, error);
        }
      }
    } catch (error) {
      console.error('[Performance] Failed to setup performance observer:', error);
    }
  }

  /**
   * Handle performance entries
   */
  private handlePerformanceEntry(entry: PerformanceEntry): void {
    const metric: Partial<PerformanceMetrics> = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    switch (entry.entryType) {
      case 'paint':
        if (entry.name === 'first-contentful-paint') {
          metric.fcp = entry.startTime;
        }
        break;
        
      case 'largest-contentful-paint':
        metric.lcp = entry.startTime;
        break;
        
      case 'first-input':
        metric.fid = (entry as PerformanceEventTiming).processingStart - entry.startTime;
        break;
        
      case 'layout-shift':
        if (!(entry as LayoutShift).hadRecentInput) {
          metric.cls = (metric.cls || 0) + (entry as LayoutShift).value;
        }
        break;
        
      case 'navigation':
        const navEntry = entry as PerformanceNavigationTiming;
        metric.ttfb = navEntry.responseStart - navEntry.requestStart;
        break;
    }

    if (Object.keys(metric).length > 3) { // More than just timestamp, url, userAgent
      this.recordMetric(metric as PerformanceMetrics);
    }
  }

  /**
   * Monitor app load time
   */
  private monitorAppLoadTime(): void {
    // Monitor when the app is fully loaded
    if (document.readyState === 'complete') {
      this.recordAppLoadTime();
    } else {
      window.addEventListener('load', () => {
        this.recordAppLoadTime();
      });
    }
  }

  /**
   * Record app load time
   */
  private recordAppLoadTime(): void {
    const loadTime = performance.now() - this.startTime;
    
    this.recordMetric({
      appLoadTime: loadTime,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });
    
    console.log(`[Performance] App load time: ${Math.round(loadTime)}ms`);
  }

  /**
   * Monitor network information
   */
  private monitorNetworkInformation(): void {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection) {
      const networkMetric: Partial<PerformanceMetrics> = {
        connectionType: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      };
      
      this.recordMetric(networkMetric as PerformanceMetrics);
      
      // Monitor connection changes
      connection.addEventListener('change', () => {
        this.monitorNetworkInformation();
      });
    }
  }

  /**
   * Monitor memory usage
   */
  private monitorMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      
      const memoryMetric: Partial<PerformanceMetrics> = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      };
      
      this.recordMetric(memoryMetric as PerformanceMetrics);
    }
  }

  /**
   * Monitor storage usage
   */
  private async monitorStorageUsage(): Promise<void> {
    try {
      const storageMetric: Partial<PerformanceMetrics> = {
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      };

      // Monitor cache storage usage
      if ('caches' in window) {
        let cacheSize = 0;
        const cacheNames = await caches.keys();
        
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          
          for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
              const responseText = await response.clone().text();
              cacheSize += responseText.length;
            }
          }
        }
        
        storageMetric.cacheStorageUsage = cacheSize;
      }

      // Monitor localStorage usage
      if ('localStorage' in window) {
        let localStorageSize = 0;
        for (const key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            localStorageSize += localStorage[key].length + key.length;
          }
        }
        storageMetric.localStorageUsage = localStorageSize;
      }

      // Monitor IndexedDB usage (estimate)
      if ('indexedDB' in window) {
        try {
          const estimate = await navigator.storage?.estimate();
          if (estimate) {
            storageMetric.indexedDBUsage = estimate.usage || 0;
          }
        } catch (error) {
          console.warn('[Performance] Failed to estimate IndexedDB usage:', error);
        }
      }

      this.recordMetric(storageMetric as PerformanceMetrics);
    } catch (error) {
      console.error('[Performance] Failed to monitor storage usage:', error);
    }
  }

  /**
   * Set up periodic reporting
   */
  private setupPeriodicReporting(): void {
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
    }
    
    this.reportingTimer = setInterval(() => {
      this.reportMetrics();
    }, this.config.reportingInterval);
  }

  /**
   * Set up visibility change monitoring
   */
  private setupVisibilityChangeMonitoring(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden, report current metrics
        this.reportMetrics();
      } else {
        // Page is visible again, update monitoring
        this.monitorMemoryUsage();
        this.monitorStorageUsage();
      }
    });
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetrics): void {
    if (!this.shouldMonitor) return;
    
    this.metrics.push(metric);
    
    // Maintain buffer size
    if (this.metrics.length > this.config.bufferSize) {
      this.metrics.shift();
    }
    
    // Log significant metrics
    this.logSignificantMetrics(metric);
  }

  /**
   * Log significant metrics
   */
  private logSignificantMetrics(metric: PerformanceMetrics): void {
    const warnings: string[] = [];
    
    if (metric.lcp && metric.lcp > this.thresholds.lcp.needsImprovement) {
      warnings.push(`LCP: ${Math.round(metric.lcp)}ms (threshold: ${this.thresholds.lcp.needsImprovement}ms)`);
    }
    
    if (metric.fid && metric.fid > this.thresholds.fid.needsImprovement) {
      warnings.push(`FID: ${Math.round(metric.fid)}ms (threshold: ${this.thresholds.fid.needsImprovement}ms)`);
    }
    
    if (metric.cls && metric.cls > this.thresholds.cls.needsImprovement) {
      warnings.push(`CLS: ${metric.cls.toFixed(3)} (threshold: ${this.thresholds.cls.needsImprovement})`);
    }
    
    if (metric.appLoadTime && metric.appLoadTime > this.thresholds.appLoadTime.needsImprovement) {
      warnings.push(`App Load: ${Math.round(metric.appLoadTime)}ms (threshold: ${this.thresholds.appLoadTime.needsImprovement}ms)`);
    }
    
    if (warnings.length > 0) {
      console.warn('[Performance] Performance issues detected:', warnings.join(', '));
    }
  }

  /**
   * Record shopping list load time
   */
  recordShoppingListLoadTime(loadTime: number): void {
    if (!this.shouldMonitor) return;
    
    this.recordMetric({
      shoppingListLoadTime: loadTime,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });
    
    console.log(`[Performance] Shopping list load time: ${Math.round(loadTime)}ms`);
  }

  /**
   * Record cache hit rate
   */
  recordCacheHitRate(hits: number, total: number): void {
    if (!this.shouldMonitor || total === 0) return;
    
    const hitRate = hits / total;
    
    this.recordMetric({
      cacheHitRate: hitRate,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });
    
    if (hitRate < this.thresholds.cacheHitRate.needsImprovement) {
      console.warn(`[Performance] Low cache hit rate: ${Math.round(hitRate * 100)}%`);
    }
  }

  /**
   * Record sync duration
   */
  recordSyncDuration(duration: number): void {
    if (!this.shouldMonitor) return;
    
    this.recordMetric({
      syncDuration: duration,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });
    
    console.log(`[Performance] Sync duration: ${Math.round(duration)}ms`);
  }

  /**
   * Record offline operations count
   */
  recordOfflineOperations(count: number): void {
    if (!this.shouldMonitor) return;
    
    this.recordMetric({
      offlineOperations: count,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    metrics: PerformanceMetrics[];
    averages: Partial<PerformanceMetrics>;
    issues: string[];
  } {
    if (this.metrics.length === 0) {
      return { metrics: [], averages: {}, issues: [] };
    }

    const averages: Partial<PerformanceMetrics> = {};
    const issues: string[] = [];
    
    // Calculate averages
    const numericFields = ['lcp', 'fid', 'cls', 'fcp', 'ttfb', 'appLoadTime', 'shoppingListLoadTime', 'cacheHitRate', 'syncDuration'];
    
    for (const field of numericFields) {
      const values = this.metrics
        .map(m => m[field as keyof PerformanceMetrics])
        .filter(v => typeof v === 'number') as number[];
      
      if (values.length > 0) {
        averages[field as keyof PerformanceMetrics] = values.reduce((a, b) => a + b, 0) / values.length;
      }
    }

    // Identify issues
    if (averages.lcp && averages.lcp > this.thresholds.lcp.needsImprovement) {
      issues.push(`Average LCP (${Math.round(averages.lcp)}ms) exceeds threshold`);
    }
    
    if (averages.fid && averages.fid > this.thresholds.fid.needsImprovement) {
      issues.push(`Average FID (${Math.round(averages.fid)}ms) exceeds threshold`);
    }
    
    if (averages.cls && averages.cls > this.thresholds.cls.needsImprovement) {
      issues.push(`Average CLS (${averages.cls.toFixed(3)}) exceeds threshold`);
    }
    
    if (averages.cacheHitRate && averages.cacheHitRate < this.thresholds.cacheHitRate.needsImprovement) {
      issues.push(`Average cache hit rate (${Math.round(averages.cacheHitRate * 100)}%) below threshold`);
    }

    return {
      metrics: [...this.metrics],
      averages,
      issues
    };
  }

  /**
   * Report metrics to endpoint or console
   */
  private async reportMetrics(): Promise<void> {
    if (this.metrics.length === 0) return;

    const report = {
      timestamp: Date.now(),
      sessionId: this.generateSessionId(),
      metrics: [...this.metrics],
      summary: this.getPerformanceSummary()
    };

    if (this.config.reportingEndpoint) {
      try {
        await fetch(this.config.reportingEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(report)
        });
        
        console.log('[Performance] Metrics reported to endpoint');
      } catch (error) {
        console.error('[Performance] Failed to report metrics:', error);
      }
    } else {
      console.log('[Performance] Performance Report:', report);
    }

    // Clear reported metrics
    this.metrics = [];
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Destroy performance monitor
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
      this.reportingTimer = null;
    }
    
    this.metrics = [];
    console.log('[Performance] Performance monitor destroyed');
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;