/**
 * Browser Compatibility Tester
 * Tests PWA functionality across different browsers and provides compatibility reports
 */

interface BrowserFeatureSupport {
  serviceWorker: boolean;
  webAppManifest: boolean;
  installPrompt: boolean;
  backgroundSync: boolean;
  cacheAPI: boolean;
  indexedDB: boolean;
  pushNotifications: boolean;
  webShare: boolean;
  fullscreen: boolean;
  standalone: boolean;
}

interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  platform: string;
  mobile: boolean;
  userAgent: string;
}

interface CompatibilityReport {
  browser: BrowserInfo;
  features: BrowserFeatureSupport;
  score: number; // 0-100
  criticalIssues: string[];
  warnings: string[];
  recommendations: string[];
  testResults: TestResult[];
}

interface TestResult {
  feature: string;
  supported: boolean;
  tested: boolean;
  error?: string;
  details?: any;
}

class BrowserCompatibilityTester {
  private testResults: Map<string, TestResult> = new Map();
  private browserInfo: BrowserInfo | null = null;

  /**
   * Run comprehensive browser compatibility tests
   */
  async runCompatibilityTests(): Promise<CompatibilityReport> {
    console.log('[Browser Compatibility] Starting compatibility tests');

    try {
      // Detect browser info
      this.browserInfo = this.detectBrowser();
      
      // Test all features
      const features = await this.testAllFeatures();
      
      // Generate report
      const report = this.generateReport(features);
      
      console.log('[Browser Compatibility] Tests completed. Score:', report.score);
      return report;

    } catch (error) {
      console.error('[Browser Compatibility] Test failed:', error);
      throw error;
    }
  }

  /**
   * Detect browser information
   */
  private detectBrowser(): BrowserInfo {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    let name = 'Unknown';
    let version = 'Unknown';
    let engine = 'Unknown';
    let mobile = false;

    // Detect browser name and version
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      name = 'Chrome';
      const match = userAgent.match(/Chrome\/([0-9.]+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Blink';
    } else if (userAgent.includes('Firefox')) {
      name = 'Firefox';
      const match = userAgent.match(/Firefox\/([0-9.]+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Gecko';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      name = 'Safari';
      const match = userAgent.match(/Version\/([0-9.]+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'WebKit';
    } else if (userAgent.includes('Edg')) {
      name = 'Edge';
      const match = userAgent.match(/Edg\/([0-9.]+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Blink';
    }

    // Detect mobile
    mobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    return {
      name,
      version,
      engine,
      platform,
      mobile,
      userAgent
    };
  }

  /**
   * Test all PWA features
   */
  private async testAllFeatures(): Promise<BrowserFeatureSupport> {
    const features: BrowserFeatureSupport = {
      serviceWorker: false,
      webAppManifest: false,
      installPrompt: false,
      backgroundSync: false,
      cacheAPI: false,
      indexedDB: false,
      pushNotifications: false,
      webShare: false,
      fullscreen: false,
      standalone: false
    };

    // Test Service Worker support
    features.serviceWorker = await this.testServiceWorkerSupport();
    
    // Test Web App Manifest support
    features.webAppManifest = await this.testWebAppManifestSupport();
    
    // Test Install Prompt support
    features.installPrompt = await this.testInstallPromptSupport();
    
    // Test Background Sync support
    features.backgroundSync = await this.testBackgroundSyncSupport();
    
    // Test Cache API support
    features.cacheAPI = await this.testCacheAPISupport();
    
    // Test IndexedDB support
    features.indexedDB = await this.testIndexedDBSupport();
    
    // Test Push Notifications support
    features.pushNotifications = await this.testPushNotificationsSupport();
    
    // Test Web Share support
    features.webShare = await this.testWebShareSupport();
    
    // Test Fullscreen support
    features.fullscreen = await this.testFullscreenSupport();
    
    // Test Standalone mode support
    features.standalone = await this.testStandaloneModeSupport();

    return features;
  }

  /**
   * Test Service Worker support
   */
  private async testServiceWorkerSupport(): Promise<boolean> {
    const testName = 'serviceWorker';
    
    try {
      const supported = 'serviceWorker' in navigator;
      
      if (supported) {
        // Try to register a test service worker
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          this.recordTestResult(testName, true, true, undefined, {
            hasRegistration: !!registration,
            controllerPresent: !!navigator.serviceWorker.controller
          });
        } catch (error) {
          this.recordTestResult(testName, true, true, undefined, {
            registrationError: error instanceof Error ? error instanceof Error ? error.message : 'Unknown error' : 'Unknown error'
          });
        }
      } else {
        this.recordTestResult(testName, false, true, 'Service Worker API not available');
      }
      
      return supported;
    } catch (error) {
      this.recordTestResult(testName, false, false, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Test Web App Manifest support
   */
  private async testWebAppManifestSupport(): Promise<boolean> {
    const testName = 'webAppManifest';
    
    try {
      // Check if manifest link exists
      const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      const hasManifestLink = !!manifestLink;
      
      // Check if manifest can be parsed
      let manifestParseable = false;
      let manifestContent = null;
      
      if (hasManifestLink) {
        try {
          const response = await fetch(manifestLink.href);
          if (response.ok) {
            manifestContent = await response.json();
            manifestParseable = true;
          }
        } catch (error) {
          // Manifest exists but can't be parsed
        }
      }
      
      const supported = hasManifestLink && manifestParseable;
      
      this.recordTestResult(testName, supported, true, undefined, {
        hasManifestLink,
        manifestParseable,
        manifestUrl: manifestLink?.href,
        manifestContent: manifestContent ? Object.keys(manifestContent) : null
      });
      
      return supported;
    } catch (error) {
      this.recordTestResult(testName, false, false, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Test Install Prompt support
   */
  private async testInstallPromptSupport(): Promise<boolean> {
    const testName = 'installPrompt';
    
    try {
      const supported = 'onbeforeinstallprompt' in window;
      
      this.recordTestResult(testName, supported, true, undefined, {
        beforeInstallPromptSupported: supported,
        currentlyInstallable: supported && !window.matchMedia('(display-mode: standalone)').matches
      });
      
      return supported;
    } catch (error) {
      this.recordTestResult(testName, false, false, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Test Background Sync support
   */
  private async testBackgroundSyncSupport(): Promise<boolean> {
    const testName = 'backgroundSync';
    
    try {
      const supported = 'serviceWorker' in navigator && 
        'ServiceWorkerRegistration' in window && 
        'sync' in window.ServiceWorkerRegistration.prototype;
      
      this.recordTestResult(testName, supported, true, undefined, {
        serviceWorkerSupported: 'serviceWorker' in navigator,
        serviceWorkerRegistrationExists: 'ServiceWorkerRegistration' in window,
        syncInPrototype: 'ServiceWorkerRegistration' in window && 
          'sync' in window.ServiceWorkerRegistration.prototype
      });
      
      return supported;
    } catch (error) {
      this.recordTestResult(testName, false, false, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Test Cache API support
   */
  private async testCacheAPISupport(): Promise<boolean> {
    const testName = 'cacheAPI';
    
    try {
      const supported = 'caches' in window;
      
      if (supported) {
        // Test basic cache operations
        try {
          const testCacheName = 'compatibility-test-cache';
          const cache = await caches.open(testCacheName);
          await cache.put('/test', new Response('test'));
          const response = await cache.match('/test');
          const hasResponse = !!response;
          await cache.delete('/test');
          await caches.delete(testCacheName);
          
          this.recordTestResult(testName, true, true, undefined, {
            basicOperationsWork: hasResponse
          });
        } catch (error) {
          this.recordTestResult(testName, true, true, undefined, {
            basicOperationsWork: false,
            operationError: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      } else {
        this.recordTestResult(testName, false, true, 'Cache API not available');
      }
      
      return supported;
    } catch (error) {
      this.recordTestResult(testName, false, false, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Test IndexedDB support
   */
  private async testIndexedDBSupport(): Promise<boolean> {
    const testName = 'indexedDB';
    
    try {
      const supported = 'indexedDB' in window;
      
      if (supported) {
        // Test basic IndexedDB operations
        try {
          const dbName = 'compatibility-test-db';
          const request = indexedDB.open(dbName, 1);
          
          const dbWorking = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('IndexedDB test timeout'));
            }, 5000);
            
            request.onerror = () => {
              clearTimeout(timeout);
              resolve(false);
            };
            
            request.onsuccess = () => {
              clearTimeout(timeout);
              const db = request.result;
              db.close();
              indexedDB.deleteDatabase(dbName);
              resolve(true);
            };
            
            request.onupgradeneeded = (event) => {
              const db = (event.target as IDBOpenDBRequest).result;
              db.createObjectStore('test', { keyPath: 'id' });
            };
          });
          
          this.recordTestResult(testName, true, true, undefined, {
            basicOperationsWork: dbWorking
          });
        } catch (error) {
          this.recordTestResult(testName, true, true, undefined, {
            basicOperationsWork: false,
            operationError: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      } else {
        this.recordTestResult(testName, false, true, 'IndexedDB not available');
      }
      
      return supported;
    } catch (error) {
      this.recordTestResult(testName, false, false, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Test Push Notifications support
   */
  private async testPushNotificationsSupport(): Promise<boolean> {
    const testName = 'pushNotifications';
    
    try {
      const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
      
      this.recordTestResult(testName, supported, true, undefined, {
        notificationAPI: 'Notification' in window,
        serviceWorkerSupported: 'serviceWorker' in navigator,
        pushManagerSupported: 'PushManager' in window,
        currentPermission: supported ? Notification.permission : 'not-supported'
      });
      
      return supported;
    } catch (error) {
      this.recordTestResult(testName, false, false, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Test Web Share support
   */
  private async testWebShareSupport(): Promise<boolean> {
    const testName = 'webShare';
    
    try {
      const supported = 'share' in navigator;
      
      this.recordTestResult(testName, supported, true, undefined, {
        webShareAPI: supported
      });
      
      return supported;
    } catch (error) {
      this.recordTestResult(testName, false, false, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Test Fullscreen support
   */
  private async testFullscreenSupport(): Promise<boolean> {
    const testName = 'fullscreen';
    
    try {
      const supported = !!(
        document.fullscreenEnabled ||
        (document as any).webkitFullscreenEnabled ||
        (document as any).mozFullScreenEnabled ||
        (document as any).msFullscreenEnabled
      );
      
      this.recordTestResult(testName, supported, true, undefined, {
        standardFullscreen: !!document.fullscreenEnabled,
        webkitFullscreen: !!(document as any).webkitFullscreenEnabled,
        mozFullscreen: !!(document as any).mozFullScreenEnabled,
        msFullscreen: !!(document as any).msFullscreenEnabled
      });
      
      return supported;
    } catch (error) {
      this.recordTestResult(testName, false, false, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Test Standalone mode support
   */
  private async testStandaloneModeSupport(): Promise<boolean> {
    const testName = 'standalone';
    
    try {
      const standaloneMediaQuery = window.matchMedia('(display-mode: standalone)');
      const isCurrentlyStandalone = standaloneMediaQuery.matches;
      const iosStandalone = (window.navigator as any).standalone === true;
      
      const supported = standaloneMediaQuery.media !== 'not all' || iosStandalone;
      
      this.recordTestResult(testName, supported, true, undefined, {
        mediaQuerySupported: standaloneMediaQuery.media !== 'not all',
        currentlyStandalone: isCurrentlyStandalone,
        iosStandalone: iosStandalone
      });
      
      return supported;
    } catch (error) {
      this.recordTestResult(testName, false, false, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Record test result
   */
  private recordTestResult(feature: string, supported: boolean, tested: boolean, error?: string, details?: any): void {
    this.testResults.set(feature, {
      feature,
      supported,
      tested,
      error,
      details
    });
  }

  /**
   * Generate compatibility report
   */
  private generateReport(features: BrowserFeatureSupport): CompatibilityReport {
    const criticalIssues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Analyze critical features
    if (!features.serviceWorker) {
      criticalIssues.push('Service Worker not supported - PWA functionality severely limited');
    }

    if (!features.cacheAPI) {
      criticalIssues.push('Cache API not supported - offline functionality not available');
    }

    if (!features.webAppManifest) {
      criticalIssues.push('Web App Manifest not supported - app installation not available');
    }

    // Analyze important features
    if (!features.installPrompt) {
      warnings.push('Install prompt not supported - users cannot install app easily');
    }

    if (!features.backgroundSync) {
      warnings.push('Background Sync not supported - offline data sync limited');
    }

    if (!features.indexedDB) {
      warnings.push('IndexedDB not supported - local data storage limited');
    }

    // Generate recommendations based on browser
    this.generateBrowserSpecificRecommendations(recommendations);

    // Calculate score
    const totalFeatures = Object.keys(features).length;
    const supportedFeatures = Object.values(features).filter(Boolean).length;
    const score = Math.round((supportedFeatures / totalFeatures) * 100);

    return {
      browser: this.browserInfo!,
      features,
      score,
      criticalIssues,
      warnings,
      recommendations,
      testResults: Array.from(this.testResults.values())
    };
  }

  /**
   * Generate browser-specific recommendations
   */
  private generateBrowserSpecificRecommendations(recommendations: string[]): void {
    if (!this.browserInfo) return;

    const { name, version, mobile } = this.browserInfo;

    switch (name) {
      case 'Chrome':
        if (parseInt(version) < 90) {
          recommendations.push('Update Chrome to version 90+ for better PWA support');
        }
        break;

      case 'Firefox':
        recommendations.push('Firefox supports PWA features but may not show install prompts');
        if (parseInt(version) < 85) {
          recommendations.push('Update Firefox to version 85+ for better PWA support');
        }
        break;

      case 'Safari':
        recommendations.push('Safari supports PWA features with "Add to Home Screen"');
        if (mobile) {
          recommendations.push('Ensure 180x180 icon is available for iOS home screen');
        }
        if (parseInt(version) < 14) {
          recommendations.push('Update Safari to version 14+ for better PWA support');
        }
        break;

      case 'Edge':
        if (parseInt(version) < 90) {
          recommendations.push('Update Edge to version 90+ for better PWA support');
        }
        break;

      default:
        recommendations.push('Consider testing on Chrome, Firefox, Safari, or Edge for better PWA support');
    }

    if (mobile) {
      recommendations.push('Mobile browsers may have different PWA installation flows');
    }
  }

  /**
   * Get test results for specific feature
   */
  getTestResult(feature: string): TestResult | null {
    return this.testResults.get(feature) || null;
  }

  /**
   * Get all test results
   */
  getAllTestResults(): TestResult[] {
    return Array.from(this.testResults.values());
  }

  /**
   * Clear test results
   */
  clearTestResults(): void {
    this.testResults.clear();
  }

  /**
   * Test specific feature
   */
  async testFeature(feature: keyof BrowserFeatureSupport): Promise<boolean> {
    switch (feature) {
      case 'serviceWorker':
        return this.testServiceWorkerSupport();
      case 'webAppManifest':
        return this.testWebAppManifestSupport();
      case 'installPrompt':
        return this.testInstallPromptSupport();
      case 'backgroundSync':
        return this.testBackgroundSyncSupport();
      case 'cacheAPI':
        return this.testCacheAPISupport();
      case 'indexedDB':
        return this.testIndexedDBSupport();
      case 'pushNotifications':
        return this.testPushNotificationsSupport();
      case 'webShare':
        return this.testWebShareSupport();
      case 'fullscreen':
        return this.testFullscreenSupport();
      case 'standalone':
        return this.testStandaloneModeSupport();
      default:
        throw new Error(`Unknown feature: ${feature}`);
    }
  }
}

// Export singleton instance
export const browserCompatibilityTester = new BrowserCompatibilityTester();
export default browserCompatibilityTester;