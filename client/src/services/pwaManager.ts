/**
 * PWA Manager for handling installation, service worker, and offline functionality
 */

import { PWAInstallationState, ServiceWorkerMessage } from '../types/OfflineStorage.types';
import { offlineStorageManager } from './offlineStorageManager';
import { performanceMonitor } from './performanceMonitor';
import { cacheOptimizer } from './cacheOptimizer';
import { lazyLoadingManager } from './lazyLoadingManager';
import { pwaValidator } from './pwaValidator';
import { browserCompatibilityTester } from './browserCompatibilityTester';

interface InstallationMetrics {
  installPromptShown: Date | null;
  installPromptResult: 'accepted' | 'dismissed' | null;
  installationCompleted: Date | null;
  installationSource: 'prompt' | 'manual' | 'unknown';
  deviceInfo: {
    userAgent: string;
    platform: string;
    standalone: boolean;
  };
}

interface PWAInstallationManagerConfig {
  enableMetrics: boolean;
  enableAnalytics: boolean;
  autoPromptDelay: number; // milliseconds
  maxPromptAttempts: number;
}

class PWAManager {
  private installPromptEvent: BeforeInstallPromptEvent | null = null;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private installationState: PWAInstallationState = {
    canInstall: false,
    isInstalled: false
  };
  private messageHandlers: Map<string, (payload: any) => void> = new Map();
  private installationListeners: Set<(state: PWAInstallationState) => void> = new Set();
  private metrics: InstallationMetrics = {
    installPromptShown: null,
    installPromptResult: null,
    installationCompleted: null,
    installationSource: 'unknown',
    deviceInfo: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      standalone: this.isRunningStandalone()
    }
  };
  private config: PWAInstallationManagerConfig = {
    enableMetrics: true,
    enableAnalytics: false,
    autoPromptDelay: 5000, // 5 seconds
    maxPromptAttempts: 3
  };

  /**
   * Initialize PWA functionality
   */
  async initialize(): Promise<void> {
    try {
      // Load existing metrics
      this.loadMetrics();

      // Initialize performance monitoring
      performanceMonitor.initialize({
        enableMetrics: this.config.enableMetrics,
        enableReporting: this.config.enableAnalytics,
        sampleRate: 0.1 // Monitor 10% of sessions
      });
      console.log('[PWA] Performance monitoring initialized');

      // Initialize cache optimization
      cacheOptimizer.initialize({
        enableAdaptiveCaching: true,
        enableNetworkAwareness: true,
        enableDataSaver: true
      });
      console.log('[PWA] Cache optimization initialized');

      // Initialize lazy loading
      lazyLoadingManager.initialize({
        enablePrefetch: true,
        maxConcurrentLoads: 3,
        retryAttempts: 3
      });
      console.log('[PWA] Lazy loading initialized');

      // Initialize offline storage
      await offlineStorageManager.initialize();
      console.log('[PWA] Offline storage initialized');

      // Register service worker
      await this.registerServiceWorker();
      console.log('[PWA] Service worker registered');

      // Set up installation prompt handling
      this.setupInstallationPrompt();
      console.log('[PWA] Installation prompt setup complete');

      // Check if already installed
      this.checkInstallationStatus();
      console.log('[PWA] Installation status checked');

      // Set up message handling
      this.setupMessageHandling();
      console.log('[PWA] Message handling setup complete');

      // Initialize connection monitor
      const { connectionMonitor } = await import('./connectionMonitor');
      connectionMonitor.initialize();
      console.log('[PWA] Connection monitor initialized');

      // Set up installation state monitoring
      this.setupInstallationStateMonitoring();
      console.log('[PWA] Installation state monitoring setup complete');

      // Set up performance optimization listeners
      this.setupPerformanceOptimizationListeners();
      console.log('[PWA] Performance optimization listeners setup complete');

      // Validate PWA setup
      await this.validatePWASetup();
      console.log('[PWA] PWA validation completed');

      console.log('[PWA] PWA Manager initialized successfully');
    } catch (error) {
      console.error('[PWA] Failed to initialize PWA Manager:', error);
      throw error;
    }
  }

  /**
   * Configure PWA installation manager
   */
  configure(config: Partial<PWAInstallationManagerConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[PWA] Configuration updated:', this.config);
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        // Register the service worker with enhanced error handling
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        console.log('[PWA] Service worker registered:', this.serviceWorkerRegistration.scope);

        // Handle service worker updates
        this.serviceWorkerRegistration.addEventListener('updatefound', () => {
          const newWorker = this.serviceWorkerRegistration!.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New service worker available');
                this.notifyServiceWorkerUpdate();
              }
            });
          }
        });

        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', (event) => {
          this.handleServiceWorkerMessage(event.data);
        });

        // Register for background sync
        if ('sync' in this.serviceWorkerRegistration) {
          console.log('[PWA] Background sync supported');
        }

        // Handle service worker errors
        navigator.serviceWorker.addEventListener('error', (event) => {
          console.error('[PWA] Service worker error:', event);
          this.handleServiceWorkerError('runtime', {
            error: event.message || 'Service worker runtime error',
            timestamp: new Date().toISOString()
          });
        });

      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
        this.handleServiceWorkerError('registration', {
          error: error.message,
          timestamp: new Date().toISOString(),
          fallbackMode: true
        });
        throw error;
      }
    } else {
      console.warn('[PWA] Service workers not supported');
      this.handleServiceWorkerError('unsupported', {
        error: 'Service workers not supported in this browser',
        timestamp: new Date().toISOString(),
        fallbackMode: true
      });
    }
  }

  /**
   * Set up installation prompt handling
   */
  private setupInstallationPrompt(): void {
    window.addEventListener('beforeinstallprompt', (event) => {
      console.log('[PWA] Install prompt available');
      event.preventDefault();
      this.installPromptEvent = event as BeforeInstallPromptEvent;
      this.installationState.canInstall = true;
      this.installationState.installPromptEvent = this.installPromptEvent;
      
      // Track prompt availability
      if (this.config.enableMetrics) {
        this.metrics.installPromptShown = new Date();
        this.saveMetrics();
      }
      
      // Notify listeners
      this.notifyInstallationStateChange();
      
      // Auto-prompt after delay if configured
      if (this.shouldAutoPrompt()) {
        setTimeout(() => {
          this.showInstallPrompt();
        }, this.config.autoPromptDelay);
      }
    });

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed');
      this.installPromptEvent = null;
      this.installationState.canInstall = false;
      this.installationState.isInstalled = true;
      
      // Track installation
      if (this.config.enableMetrics) {
        this.metrics.installationCompleted = new Date();
        this.metrics.installationSource = this.metrics.installPromptResult === 'accepted' ? 'prompt' : 'manual';
        this.saveMetrics();
      }
      
      this.trackInstallationMetrics();
      
      // Notify listeners
      this.notifyInstallationStateChange();
    });
  }

  /**
   * Check if app is already installed
   */
  private checkInstallationStatus(): void {
    const isStandalone = this.isRunningStandalone();
    
    if (isStandalone) {
      this.installationState.isInstalled = true;
      console.log('[PWA] App is running in standalone mode');
      
      // Update metrics if not already tracked
      if (this.config.enableMetrics && !this.metrics.installationCompleted) {
        this.metrics.installationCompleted = new Date();
        this.metrics.installationSource = 'unknown';
        this.saveMetrics();
      }
    }
  }

  /**
   * Check if running in standalone mode
   */
  private isRunningStandalone(): boolean {
    // Check if running in standalone mode (installed)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }

    // Check if running as PWA on iOS
    if ((window.navigator as any).standalone === true) {
      return true;
    }

    return false;
  }

  /**
   * Set up performance optimization listeners
   */
  private setupPerformanceOptimizationListeners(): void {
    // Listen for network changes and adapt caching
    cacheOptimizer.onNetworkChange((conditions) => {
      console.log('[PWA] Network conditions changed, adapting performance:', conditions);
      
      // Record network performance metrics
      performanceMonitor.recordMetric({
        connectionType: conditions.effectiveType,
        downlink: conditions.downlink,
        rtt: conditions.rtt,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      } as any);
      
      // Notify user if on slow connection
      if (conditions.effectiveType === 'slow-2g' || conditions.effectiveType === '2g') {
        this.notifySlowConnection();
      }
    });

    // Monitor app load performance
    window.addEventListener('load', () => {
      const loadTime = performance.now();
      performanceMonitor.recordAppLoadTime(loadTime);
      
      if (loadTime > 5000) { // 5 seconds
        console.warn('[PWA] Slow app load detected:', loadTime);
        this.optimizeForSlowLoading();
      }
    });

    // Monitor shopping list performance
    window.addEventListener('shopping-list-loaded', ((event: CustomEvent) => {
      const loadTime = event.detail.loadTime;
      performanceMonitor.recordShoppingListLoadTime(loadTime);
    }) as EventListener);

    // Monitor cache performance
    window.addEventListener('cache-hit', ((event: CustomEvent) => {
      const { hits, total } = event.detail;
      performanceMonitor.recordCacheHitRate(hits, total);
    }) as EventListener);

    // Monitor sync performance
    window.addEventListener('sync-completed', ((event: CustomEvent) => {
      const duration = event.detail.duration;
      performanceMonitor.recordSyncDuration(duration);
    }) as EventListener);
  }

  /**
   * Notify user of slow connection
   */
  private notifySlowConnection(): void {
    // Dispatch event for UI to handle
    window.dispatchEvent(new CustomEvent('pwa-slow-connection', {
      detail: {
        message: 'Slow connection detected. Optimizing for better performance.',
        suggestions: [
          'Enable data saver mode',
          'Use offline features when possible',
          'Consider downloading content for offline use'
        ]
      }
    }));
  }

  /**
   * Optimize for slow loading
   */
  private optimizeForSlowLoading(): void {
    console.log('[PWA] Optimizing for slow loading conditions');
    
    // Force cache optimization
    cacheOptimizer.forceOptimization();
    
    // Reduce lazy loading thresholds
    lazyLoadingManager.configure({
      maxConcurrentLoads: 1,
      enablePrefetch: false
    });
    
    // Notify UI to show performance tips
    window.dispatchEvent(new CustomEvent('pwa-performance-optimization', {
      detail: {
        type: 'slow-loading',
        optimizations: [
          'Reduced concurrent loading',
          'Disabled prefetching',
          'Optimized cache strategies'
        ]
      }
    }));
  }

  /**
   * Validate PWA setup
   */
  private async validatePWASetup(): Promise<void> {
    try {
      console.log('[PWA] Starting PWA validation');
      
      // Run quick validation first
      const quickValidation = await pwaValidator.quickValidation();
      
      if (quickValidation.issues.length > 0) {
        console.warn('[PWA] PWA validation issues found:', quickValidation.issues);
        
        // Dispatch event for UI to handle
        window.dispatchEvent(new CustomEvent('pwa-validation-issues', {
          detail: {
            issues: quickValidation.issues,
            hasManifest: quickValidation.hasManifest,
            hasServiceWorker: quickValidation.hasServiceWorker,
            canInstall: quickValidation.canInstall
          }
        }));
      }

      // Run browser compatibility tests
      const compatibilityReport = await browserCompatibilityTester.runCompatibilityTests();
      
      if (compatibilityReport.criticalIssues.length > 0) {
        console.warn('[PWA] Browser compatibility issues found:', compatibilityReport.criticalIssues);
        
        // Dispatch event for UI to handle
        window.dispatchEvent(new CustomEvent('pwa-compatibility-issues', {
          detail: {
            browser: compatibilityReport.browser,
            score: compatibilityReport.score,
            criticalIssues: compatibilityReport.criticalIssues,
            warnings: compatibilityReport.warnings,
            recommendations: compatibilityReport.recommendations
          }
        }));
      }

      // Store validation results
      this.storeValidationResults({
        quickValidation,
        compatibilityReport,
        timestamp: new Date().toISOString()
      });

      console.log('[PWA] PWA validation completed successfully');
    } catch (error) {
      console.error('[PWA] PWA validation failed:', error);
      
      // Dispatch error event
      window.dispatchEvent(new CustomEvent('pwa-validation-error', {
        detail: {
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }));
    }
  }

  /**
   * Store validation results
   */
  private storeValidationResults(results: any): void {
    try {
      localStorage.setItem('pwa-validation-results', JSON.stringify(results));
      console.log('[PWA] Validation results stored');
    } catch (error) {
      console.error('[PWA] Failed to store validation results:', error);
    }
  }

  /**
   * Get stored validation results
   */
  getValidationResults(): any {
    try {
      const stored = localStorage.getItem('pwa-validation-results');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('[PWA] Failed to get validation results:', error);
      return null;
    }
  }

  /**
   * Run comprehensive PWA validation
   */
  async runComprehensiveValidation(): Promise<any> {
    try {
      console.log('[PWA] Running comprehensive PWA validation');
      
      const validationResult = await pwaValidator.validatePWA();
      const compatibilityReport = await browserCompatibilityTester.runCompatibilityTests();
      
      const comprehensiveReport = {
        validation: validationResult,
        compatibility: compatibilityReport,
        timestamp: new Date().toISOString(),
        summary: {
          overallScore: Math.round((validationResult.overallScore + compatibilityReport.score) / 2),
          criticalIssues: [
            ...validationResult.criticalIssues,
            ...compatibilityReport.criticalIssues
          ],
          recommendations: [
            ...validationResult.recommendations,
            ...compatibilityReport.recommendations
          ]
        }
      };

      // Store comprehensive results
      this.storeValidationResults(comprehensiveReport);
      
      // Dispatch event with results
      window.dispatchEvent(new CustomEvent('pwa-comprehensive-validation-complete', {
        detail: comprehensiveReport
      }));

      console.log('[PWA] Comprehensive validation completed. Overall score:', comprehensiveReport.summary.overallScore);
      return comprehensiveReport;
    } catch (error) {
      console.error('[PWA] Comprehensive validation failed:', error);
      throw error;
    }
  }

  /**
   * Set up installation state monitoring
   */
  private setupInstallationStateMonitoring(): void {
    // Monitor display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', (e) => {
      const wasInstalled = this.installationState.isInstalled;
      this.installationState.isInstalled = e.matches;
      
      if (!wasInstalled && e.matches) {
        console.log('[PWA] App installed (detected via display mode change)');
        this.trackInstallationMetrics();
        this.notifyInstallationStateChange();
      }
    });

    // Monitor visibility changes to detect installation
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        const currentlyInstalled = this.isRunningStandalone();
        if (!this.installationState.isInstalled && currentlyInstalled) {
          this.installationState.isInstalled = true;
          console.log('[PWA] App installation detected on visibility change');
          this.trackInstallationMetrics();
          this.notifyInstallationStateChange();
        }
      }
    });
  }

  /**
   * Determine if auto-prompt should be shown
   */
  private shouldAutoPrompt(): boolean {
    if (!this.config.enableMetrics) return false;
    
    const promptCount = this.getPromptAttemptCount();
    return promptCount < this.config.maxPromptAttempts;
  }

  /**
   * Get number of prompt attempts
   */
  private getPromptAttemptCount(): number {
    const attempts = localStorage.getItem('pwa-prompt-attempts');
    return attempts ? parseInt(attempts, 10) : 0;
  }

  /**
   * Increment prompt attempt count
   */
  private incrementPromptAttempts(): void {
    const attempts = this.getPromptAttemptCount() + 1;
    localStorage.setItem('pwa-prompt-attempts', attempts.toString());
  }

  /**
   * Set up message handling between service worker and main thread
   */
  private setupMessageHandling(): void {
    // Default message handlers
    this.onMessage('SYNC_COMPLETE', (payload) => {
      console.log('[PWA] Sync completed:', payload);
      // Update UI to reflect sync completion
    });

    this.onMessage('SYNC_ERROR', (payload) => {
      console.error('[PWA] Sync error:', payload);
      // Show error notification to user
    });

    this.onMessage('CACHE_UPDATED', (payload) => {
      console.log('[PWA] Cache updated:', payload);
      // Optionally notify user of updates
    });

    this.onMessage('OFFLINE_READY', (payload) => {
      console.log('[PWA] App ready for offline use:', payload);
      // Show offline ready notification
    });

    // Enhanced error handling messages
    this.onMessage('SW_REGISTRATION_ERROR', (payload) => {
      console.error('[PWA] Service worker registration error:', payload);
      this.handleServiceWorkerError('registration', payload);
    });

    this.onMessage('SW_CACHE_ERROR', (payload) => {
      console.error('[PWA] Service worker cache error:', payload);
      this.handleServiceWorkerError('cache', payload);
    });

    this.onMessage('SW_SYNC_ERROR', (payload) => {
      console.error('[PWA] Service worker sync error:', payload);
      this.handleServiceWorkerError('sync', payload);
    });

    this.onMessage('SW_STORAGE_ERROR', (payload) => {
      console.error('[PWA] Service worker storage error:', payload);
      this.handleServiceWorkerError('storage', payload);
    });

    this.onMessage('SW_FETCH_ERROR', (payload) => {
      console.error('[PWA] Service worker fetch error:', payload);
      this.handleServiceWorkerError('fetch', payload);
    });
  }

  /**
   * Show installation prompt
   */
  async showInstallPrompt(): Promise<boolean> {
    if (!this.installPromptEvent) {
      console.warn('[PWA] No install prompt available');
      return false;
    }

    try {
      // Increment attempt count
      this.incrementPromptAttempts();
      
      await this.installPromptEvent.prompt();
      const result = await this.installPromptEvent.userChoice;
      console.log('[PWA] Install prompt result:', result.outcome);
      
      // Track result
      if (this.config.enableMetrics) {
        this.metrics.installPromptResult = result.outcome;
        this.saveMetrics();
      }
      
      if (result.outcome === 'accepted') {
        this.installPromptEvent = null;
        this.installationState.canInstall = false;
        
        // Track analytics
        if (this.config.enableAnalytics) {
          this.trackAnalyticsEvent('pwa_install_accepted', {
            source: 'prompt',
            timestamp: new Date().toISOString()
          });
        }
        
        return true;
      } else {
        // Track dismissal
        if (this.config.enableAnalytics) {
          this.trackAnalyticsEvent('pwa_install_dismissed', {
            source: 'prompt',
            timestamp: new Date().toISOString(),
            attemptCount: this.getPromptAttemptCount()
          });
        }
      }
      
      return false;
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error);
      
      // Track error
      if (this.config.enableAnalytics) {
        this.trackAnalyticsEvent('pwa_install_error', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      return false;
    }
  }

  /**
   * Get installation state
   */
  getInstallationState(): PWAInstallationState {
    return { ...this.installationState };
  }

  /**
   * Get installation metrics
   */
  getInstallationMetrics(): InstallationMetrics {
    return { ...this.metrics };
  }

  /**
   * Add installation state listener
   */
  onInstallationStateChange(listener: (state: PWAInstallationState) => void): void {
    this.installationListeners.add(listener);
  }

  /**
   * Remove installation state listener
   */
  offInstallationStateChange(listener: (state: PWAInstallationState) => void): void {
    this.installationListeners.delete(listener);
  }

  /**
   * Check if installation is recommended
   */
  isInstallationRecommended(): boolean {
    // Don't recommend if already installed
    if (this.installationState.isInstalled) return false;
    
    // Don't recommend if can't install
    if (!this.installationState.canInstall) return false;
    
    // Don't recommend if user has dismissed too many times
    if (this.getPromptAttemptCount() >= this.config.maxPromptAttempts) return false;
    
    // Check if user has been using the app enough to warrant installation
    const usageCount = this.getUsageCount();
    return usageCount >= 3; // Recommend after 3 visits
  }

  /**
   * Get usage count
   */
  private getUsageCount(): number {
    const count = localStorage.getItem('pwa-usage-count');
    return count ? parseInt(count, 10) : 0;
  }

  /**
   * Increment usage count
   */
  incrementUsageCount(): void {
    const count = this.getUsageCount() + 1;
    localStorage.setItem('pwa-usage-count', count.toString());
    localStorage.setItem('pwa-last-visit', new Date().toISOString());
  }

  /**
   * Reset installation prompt attempts (for testing or admin purposes)
   */
  resetPromptAttempts(): void {
    localStorage.removeItem('pwa-prompt-attempts');
    console.log('[PWA] Prompt attempts reset');
  }

  /**
   * Load metrics from storage
   */
  private loadMetrics(): void {
    try {
      const stored = localStorage.getItem('pwa-installation-metrics');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.metrics = {
          ...this.metrics,
          ...parsed,
          // Convert date strings back to Date objects
          installPromptShown: parsed.installPromptShown ? new Date(parsed.installPromptShown) : null,
          installationCompleted: parsed.installationCompleted ? new Date(parsed.installationCompleted) : null
        };
      }
    } catch (error) {
      console.error('[PWA] Failed to load metrics:', error);
    }
  }

  /**
   * Save metrics to storage
   */
  private saveMetrics(): void {
    if (!this.config.enableMetrics) return;
    
    try {
      localStorage.setItem('pwa-installation-metrics', JSON.stringify(this.metrics));
    } catch (error) {
      console.error('[PWA] Failed to save metrics:', error);
    }
  }

  /**
   * Track analytics event
   */
  private trackAnalyticsEvent(eventName: string, properties: any): void {
    if (!this.config.enableAnalytics) return;
    
    console.log('[PWA] Analytics event:', eventName, properties);
    
    // Here you would integrate with your analytics service
    // Example: analytics.track(eventName, properties);
    
    // For now, just store locally for debugging
    const events = JSON.parse(localStorage.getItem('pwa-analytics-events') || '[]');
    events.push({
      event: eventName,
      properties,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 events
    if (events.length > 100) {
      events.splice(0, events.length - 100);
    }
    
    localStorage.setItem('pwa-analytics-events', JSON.stringify(events));
  }

  /**
   * Register background sync
   */
  async registerBackgroundSync(tag: string): Promise<void> {
    if (this.serviceWorkerRegistration && 'sync' in this.serviceWorkerRegistration) {
      try {
        const syncManager = (this.serviceWorkerRegistration as any).sync;
        await syncManager.register(tag);
        console.log('[PWA] Background sync registered:', tag);
      } catch (error) {
        console.error('[PWA] Background sync registration failed:', error);
        throw error;
      }
    } else {
      console.warn('[PWA] Background sync not supported');
    }
  }

  /**
   * Send message to service worker
   */
  async sendMessageToServiceWorker(message: ServiceWorkerMessage): Promise<any> {
    if (!this.serviceWorkerRegistration || !this.serviceWorkerRegistration.active) {
      throw new Error('Service worker not available');
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      // Handle errors - MessagePort doesn't have onerror, use onmessageerror
      messageChannel.port1.onmessageerror = () => {
        reject(new Error('Message channel error'));
      };

      this.serviceWorkerRegistration!.active!.postMessage(message, [messageChannel.port2]);
    });
  }

  /**
   * Register message handler
   */
  onMessage(type: string, handler: (payload: any) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Handle service worker messages
   */
  private handleServiceWorkerMessage(message: ServiceWorkerMessage): void {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message.payload);
    } else {
      console.log('[PWA] Unhandled service worker message:', message);
    }
  }

  /**
   * Notify about service worker update
   */
  private notifyServiceWorkerUpdate(): void {
    // Dispatch custom event for UI to handle
    window.dispatchEvent(new CustomEvent('sw-update-available'));
  }

  /**
   * Notify about installation state change
   */
  private notifyInstallationStateChange(): void {
    // Notify registered listeners
    this.installationListeners.forEach(listener => {
      try {
        listener(this.installationState);
      } catch (error) {
        console.error('[PWA] Error in installation state listener:', error);
      }
    });
    
    // Dispatch custom event for UI to handle
    window.dispatchEvent(new CustomEvent('pwa-install-state-change', {
      detail: this.installationState
    }));
  }

  /**
   * Track installation metrics
   */
  private trackInstallationMetrics(): void {
    console.log('[PWA] Tracking installation metrics');
    
    // Store installation timestamp
    const installTime = new Date().toISOString();
    localStorage.setItem('pwa-installed-at', installTime);
    
    // Track analytics
    if (this.config.enableAnalytics) {
      this.trackAnalyticsEvent('pwa_installed', {
        timestamp: installTime,
        source: this.metrics.installationSource,
        deviceInfo: this.metrics.deviceInfo,
        usageCount: this.getUsageCount(),
        promptAttempts: this.getPromptAttemptCount()
      });
    }
    
    // Update metrics
    if (this.config.enableMetrics && !this.metrics.installationCompleted) {
      this.metrics.installationCompleted = new Date();
      this.saveMetrics();
    }
  }

  /**
   * Update service worker
   */
  async updateServiceWorker(): Promise<void> {
    if (this.serviceWorkerRegistration) {
      try {
        await this.serviceWorkerRegistration.update();
        console.log('[PWA] Service worker update triggered');
      } catch (error) {
        console.error('[PWA] Service worker update failed:', error);
        throw error;
      }
    }
  }

  /**
   * Skip waiting for new service worker
   */
  async skipWaiting(): Promise<void> {
    if (this.serviceWorkerRegistration && this.serviceWorkerRegistration.waiting) {
      this.serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      console.log('[PWA] Skip waiting message sent');
    }
  }

  /**
   * Get service worker registration
   */
  getServiceWorkerRegistration(): ServiceWorkerRegistration | null {
    return this.serviceWorkerRegistration;
  }

  /**
   * Check if offline
   */
  isOffline(): boolean {
    return !navigator.onLine;
  }

  /**
   * Get connection type
   */
  getConnectionType(): 'wifi' | 'cellular' | 'unknown' {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      if (connection.type === 'wifi') return 'wifi';
      if (connection.type === 'cellular') return 'cellular';
    }
    
    return 'unknown';
  }

  /**
   * Handle service worker errors with recovery strategies
   */
  private handleServiceWorkerError(errorType: string, payload: any): void {
    console.error(`[PWA] Service worker ${errorType} error:`, payload);
    
    // Store error information
    const errorInfo = {
      type: errorType,
      ...payload,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
    
    try {
      const existingErrors = JSON.parse(localStorage.getItem('pwa-sw-errors') || '[]');
      existingErrors.push(errorInfo);
      
      // Keep only last 20 errors
      if (existingErrors.length > 20) {
        existingErrors.splice(0, existingErrors.length - 20);
      }
      
      localStorage.setItem('pwa-sw-errors', JSON.stringify(existingErrors));
    } catch (storageError) {
      console.error('[PWA] Failed to store service worker error:', storageError);
    }
    
    // Attempt recovery based on error type
    this.attemptErrorRecovery(errorType, payload);
    
    // Dispatch error event for UI handling
    window.dispatchEvent(new CustomEvent('pwa-service-worker-error', {
      detail: { type: errorType, payload }
    }));
  }

  /**
   * Attempt error recovery
   */
  private async attemptErrorRecovery(errorType: string, payload: any): Promise<void> {
    console.log(`[PWA] Attempting recovery for ${errorType} error`);
    
    try {
      switch (errorType) {
        case 'registration':
          await this.recoverFromRegistrationError();
          break;
        case 'cache':
          await this.recoverFromCacheError(payload);
          break;
        case 'sync':
          await this.recoverFromSyncError(payload);
          break;
        case 'storage':
          await this.recoverFromStorageError(payload);
          break;
        default:
          console.log(`[PWA] No recovery strategy for ${errorType} error`);
      }
    } catch (recoveryError) {
      console.error(`[PWA] Recovery failed for ${errorType} error:`, recoveryError);
    }
  }

  /**
   * Recover from registration errors
   */
  private async recoverFromRegistrationError(): Promise<void> {
    console.log('[PWA] Attempting registration error recovery');
    
    try {
      // Strategy 1: Unregister all service workers and re-register
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
      
      // Wait a bit before re-registering
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Re-register
      await this.registerServiceWorker();
      console.log('[PWA] Registration recovery successful');
      
    } catch (error) {
      console.error('[PWA] Registration recovery failed:', error);
      
      // Enable fallback mode
      localStorage.setItem('pwa-fallback-mode', 'true');
      localStorage.setItem('pwa-fallback-reason', 'registration-failure');
    }
  }

  /**
   * Recover from cache errors
   */
  private async recoverFromCacheError(payload: any): Promise<void> {
    console.log('[PWA] Attempting cache error recovery');
    
    try {
      // Send message to service worker to clear caches
      if (this.serviceWorkerRegistration && this.serviceWorkerRegistration.active) {
        await this.sendMessageToServiceWorker({
          type: 'CLEAR_CACHE',
          payload: { aggressive: true }
        });
        console.log('[PWA] Cache recovery successful');
      }
    } catch (error) {
      console.error('[PWA] Cache recovery failed:', error);
    }
  }

  /**
   * Recover from sync errors
   */
  private async recoverFromSyncError(payload: any): Promise<void> {
    console.log('[PWA] Attempting sync error recovery');
    
    try {
      // If sync error is recoverable, schedule a retry
      if (payload.recoverable) {
        setTimeout(async () => {
          try {
            await this.registerBackgroundSync('shopping-list-sync');
            console.log('[PWA] Sync recovery successful - retry scheduled');
          } catch (error) {
            console.error('[PWA] Sync retry failed:', error);
          }
        }, 30000); // Retry after 30 seconds
      }
    } catch (error) {
      console.error('[PWA] Sync recovery failed:', error);
    }
  }

  /**
   * Recover from storage errors
   */
  private async recoverFromStorageError(payload: any): Promise<void> {
    console.log('[PWA] Attempting storage error recovery');
    
    try {
      // Send message to service worker to perform cleanup
      if (this.serviceWorkerRegistration && this.serviceWorkerRegistration.active) {
        await this.sendMessageToServiceWorker({
          type: 'CLEANUP_CACHE',
          payload: { aggressive: true }
        });
        console.log('[PWA] Storage recovery successful');
      }
    } catch (error) {
      console.error('[PWA] Storage recovery failed:', error);
    }
  }

  /**
   * Get service worker error history
   */
  getServiceWorkerErrors(): any[] {
    try {
      return JSON.parse(localStorage.getItem('pwa-sw-errors') || '[]');
    } catch (error) {
      console.error('[PWA] Failed to get service worker errors:', error);
      return [];
    }
  }

  /**
   * Clear service worker error history
   */
  clearServiceWorkerErrors(): void {
    try {
      localStorage.removeItem('pwa-sw-errors');
      console.log('[PWA] Service worker error history cleared');
    } catch (error) {
      console.error('[PWA] Failed to clear service worker errors:', error);
    }
  }

  /**
   * Check if in fallback mode
   */
  isInFallbackMode(): boolean {
    return localStorage.getItem('pwa-fallback-mode') === 'true';
  }

  /**
   * Exit fallback mode
   */
  exitFallbackMode(): void {
    localStorage.removeItem('pwa-fallback-mode');
    localStorage.removeItem('pwa-fallback-reason');
    console.log('[PWA] Exited fallback mode');
  }

  /**
   * Get fallback mode reason
   */
  getFallbackModeReason(): string | null {
    return localStorage.getItem('pwa-fallback-reason');
  }
}

// Export singleton instance
export const pwaManager = new PWAManager();
export default pwaManager;