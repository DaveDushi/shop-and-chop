/**
 * PWA Validator
 * Validates PWA installation requirements, manifest completeness, and service worker functionality
 */

interface ManifestValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number; // 0-100
  requiredFields: { [key: string]: boolean };
  recommendations: string[];
}

interface ServiceWorkerValidation {
  isRegistered: boolean;
  isActive: boolean;
  isControlling: boolean;
  supportsBackgroundSync: boolean;
  supportsCacheAPI: boolean;
  supportsIndexedDB: boolean;
  errors: string[];
  warnings: string[];
  lifecycle: {
    installing: boolean;
    waiting: boolean;
    active: boolean;
  };
}

interface PWAInstallabilityCheck {
  canInstall: boolean;
  installCriteria: {
    hasManifest: boolean;
    hasServiceWorker: boolean;
    isServedOverHTTPS: boolean;
    hasValidIcons: boolean;
    hasStartUrl: boolean;
    hasDisplayMode: boolean;
    hasName: boolean;
  };
  browserSupport: {
    supportsServiceWorker: boolean;
    supportsManifest: boolean;
    supportsPWAInstall: boolean;
    supportsBackgroundSync: boolean;
  };
  issues: string[];
  recommendations: string[];
}

interface OfflineFunctionalityTest {
  canWorkOffline: boolean;
  cacheStrategies: {
    staticAssets: boolean;
    dynamicContent: boolean;
    apiResponses: boolean;
    images: boolean;
  };
  offlinePages: string[];
  fallbackPages: string[];
  issues: string[];
}

interface CrossBrowserCompatibility {
  chrome: { supported: boolean; version?: string; issues: string[] };
  firefox: { supported: boolean; version?: string; issues: string[] };
  safari: { supported: boolean; version?: string; issues: string[] };
  edge: { supported: boolean; version?: string; issues: string[] };
  overall: { score: number; criticalIssues: string[] };
}

class PWAValidator {
  private manifest: any = null;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  /**
   * Perform comprehensive PWA validation
   */
  async validatePWA(): Promise<{
    manifest: ManifestValidation;
    serviceWorker: ServiceWorkerValidation;
    installability: PWAInstallabilityCheck;
    offlineFunctionality: OfflineFunctionalityTest;
    crossBrowserCompatibility: CrossBrowserCompatibility;
    overallScore: number;
    criticalIssues: string[];
    recommendations: string[];
  }> {
    console.log('[PWA Validator] Starting comprehensive PWA validation');

    try {
      // Load manifest
      await this.loadManifest();
      
      // Get service worker registration
      await this.getServiceWorkerRegistration();

      // Perform individual validations
      const manifestValidation = await this.validateManifest();
      const serviceWorkerValidation = await this.validateServiceWorker();
      const installabilityCheck = await this.checkInstallability();
      const offlineFunctionalityTest = await this.testOfflineFunctionality();
      const crossBrowserCompatibility = await this.checkCrossBrowserCompatibility();

      // Calculate overall score
      const overallScore = this.calculateOverallScore({
        manifest: manifestValidation,
        serviceWorker: serviceWorkerValidation,
        installability: installabilityCheck,
        offlineFunctionality: offlineFunctionalityTest,
        crossBrowserCompatibility
      });

      // Collect critical issues and recommendations
      const criticalIssues = this.collectCriticalIssues({
        manifest: manifestValidation,
        serviceWorker: serviceWorkerValidation,
        installability: installabilityCheck,
        offlineFunctionality: offlineFunctionalityTest,
        crossBrowserCompatibility
      });

      const recommendations = this.collectRecommendations({
        manifest: manifestValidation,
        serviceWorker: serviceWorkerValidation,
        installability: installabilityCheck,
        offlineFunctionality: offlineFunctionalityTest,
        crossBrowserCompatibility
      });

      const result = {
        manifest: manifestValidation,
        serviceWorker: serviceWorkerValidation,
        installability: installabilityCheck,
        offlineFunctionality: offlineFunctionalityTest,
        crossBrowserCompatibility,
        overallScore,
        criticalIssues,
        recommendations
      };

      console.log('[PWA Validator] Validation completed. Overall score:', overallScore);
      return result;

    } catch (error) {
      console.error('[PWA Validator] Validation failed:', error);
      throw error;
    }
  }

  /**
   * Load and parse manifest
   */
  private async loadManifest(): Promise<void> {
    try {
      const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (!manifestLink) {
        throw new Error('No manifest link found');
      }

      const response = await fetch(manifestLink.href);
      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.status}`);
      }

      this.manifest = await response.json();
      console.log('[PWA Validator] Manifest loaded successfully');
    } catch (error) {
      console.error('[PWA Validator] Failed to load manifest:', error);
      this.manifest = null;
    }
  }

  /**
   * Get service worker registration
   */
  private async getServiceWorkerRegistration(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        this.serviceWorkerRegistration = registration || null;
        console.log('[PWA Validator] Service worker registration obtained');
      } catch (error) {
        console.error('[PWA Validator] Failed to get service worker registration:', error);
        this.serviceWorkerRegistration = null;
      }
    }
  }

  /**
   * Validate manifest
   */
  private async validateManifest(): Promise<ManifestValidation> {
    const validation: ManifestValidation = {
      isValid: false,
      errors: [],
      warnings: [],
      score: 0,
      requiredFields: {},
      recommendations: []
    };

    if (!this.manifest) {
      validation.errors.push('Manifest file not found or not accessible');
      return validation;
    }

    // Required fields validation
    const requiredFields = {
      name: 'App name',
      short_name: 'Short app name',
      start_url: 'Start URL',
      display: 'Display mode',
      theme_color: 'Theme color',
      background_color: 'Background color',
      icons: 'App icons'
    };

    let validFields = 0;
    const totalFields = Object.keys(requiredFields).length;

    for (const [field, description] of Object.entries(requiredFields)) {
      const hasField = field in this.manifest && this.manifest[field];
      validation.requiredFields[field] = !!hasField;

      if (hasField) {
        validFields++;
      } else {
        validation.errors.push(`Missing required field: ${description} (${field})`);
      }
    }

    // Validate specific fields
    await this.validateManifestFields(validation);

    // Calculate score
    validation.score = Math.round((validFields / totalFields) * 100);
    validation.isValid = validation.errors.length === 0;

    // Add recommendations
    this.addManifestRecommendations(validation);

    return validation;
  }

  /**
   * Validate specific manifest fields
   */
  private async validateManifestFields(validation: ManifestValidation): Promise<void> {
    if (!this.manifest) return;

    // Validate icons
    if (this.manifest.icons && Array.isArray(this.manifest.icons)) {
      const hasRequiredSizes = this.manifest.icons.some((icon: any) => 
        icon.sizes && (icon.sizes.includes('192x192') || icon.sizes.includes('512x512'))
      );
      
      if (!hasRequiredSizes) {
        validation.warnings.push('Missing recommended icon sizes (192x192 or 512x512)');
      }

      // Check if icons are accessible
      for (const icon of this.manifest.icons) {
        try {
          const response = await fetch(icon.src);
          if (!response.ok) {
            validation.errors.push(`Icon not accessible: ${icon.src}`);
          }
        } catch (error) {
          validation.errors.push(`Failed to validate icon: ${icon.src}`);
        }
      }
    } else {
      validation.errors.push('Icons array is missing or invalid');
    }

    // Validate start_url
    if (this.manifest.start_url) {
      try {
        new URL(this.manifest.start_url, window.location.origin);
      } catch (error) {
        validation.errors.push('Invalid start_url format');
      }
    }

    // Validate display mode
    if (this.manifest.display) {
      const validDisplayModes = ['fullscreen', 'standalone', 'minimal-ui', 'browser'];
      if (!validDisplayModes.includes(this.manifest.display)) {
        validation.warnings.push(`Unusual display mode: ${this.manifest.display}`);
      }
    }

    // Validate colors
    if (this.manifest.theme_color && !this.isValidColor(this.manifest.theme_color)) {
      validation.warnings.push('Invalid theme_color format');
    }

    if (this.manifest.background_color && !this.isValidColor(this.manifest.background_color)) {
      validation.warnings.push('Invalid background_color format');
    }

    // Validate orientation
    if (this.manifest.orientation) {
      const validOrientations = [
        'any', 'natural', 'landscape', 'landscape-primary', 'landscape-secondary',
        'portrait', 'portrait-primary', 'portrait-secondary'
      ];
      if (!validOrientations.includes(this.manifest.orientation)) {
        validation.warnings.push(`Invalid orientation: ${this.manifest.orientation}`);
      }
    }
  }

  /**
   * Add manifest recommendations
   */
  private addManifestRecommendations(validation: ManifestValidation): void {
    if (!this.manifest) return;

    if (!this.manifest.description) {
      validation.recommendations.push('Add a description field for better app store listings');
    }

    if (!this.manifest.categories) {
      validation.recommendations.push('Add categories to help users discover your app');
    }

    if (!this.manifest.screenshots) {
      validation.recommendations.push('Add screenshots for app store listings');
    }

    if (!this.manifest.shortcuts) {
      validation.recommendations.push('Add shortcuts for quick access to key features');
    }

    if (this.manifest.icons && this.manifest.icons.length < 3) {
      validation.recommendations.push('Provide multiple icon sizes for better device support');
    }

    if (!this.manifest.lang) {
      validation.recommendations.push('Specify the primary language of your app');
    }
  }

  /**
   * Validate service worker
   */
  private async validateServiceWorker(): Promise<ServiceWorkerValidation> {
    const validation: ServiceWorkerValidation = {
      isRegistered: false,
      isActive: false,
      isControlling: false,
      supportsBackgroundSync: false,
      supportsCacheAPI: false,
      supportsIndexedDB: false,
      errors: [],
      warnings: [],
      lifecycle: {
        installing: false,
        waiting: false,
        active: false
      }
    };

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      validation.errors.push('Service Workers not supported in this browser');
      return validation;
    }

    // Check registration
    if (this.serviceWorkerRegistration) {
      validation.isRegistered = true;

      // Check lifecycle states
      validation.lifecycle.installing = !!this.serviceWorkerRegistration.installing;
      validation.lifecycle.waiting = !!this.serviceWorkerRegistration.waiting;
      validation.lifecycle.active = !!this.serviceWorkerRegistration.active;

      validation.isActive = validation.lifecycle.active;
      validation.isControlling = !!navigator.serviceWorker.controller;

      if (!validation.isControlling) {
        validation.warnings.push('Service worker is not controlling the page');
      }

      // Check API support
      validation.supportsCacheAPI = 'caches' in window;
      validation.supportsIndexedDB = 'indexedDB' in window;
      validation.supportsBackgroundSync = 'serviceWorker' in navigator && 
        'ServiceWorkerRegistration' in window && 
        'sync' in window.ServiceWorkerRegistration.prototype;

      if (!validation.supportsCacheAPI) {
        validation.errors.push('Cache API not supported');
      }

      if (!validation.supportsIndexedDB) {
        validation.errors.push('IndexedDB not supported');
      }

      if (!validation.supportsBackgroundSync) {
        validation.warnings.push('Background Sync not supported');
      }

      // Test service worker functionality
      await this.testServiceWorkerFunctionality(validation);

    } else {
      validation.errors.push('Service worker not registered');
    }

    return validation;
  }

  /**
   * Test service worker functionality
   */
  private async testServiceWorkerFunctionality(validation: ServiceWorkerValidation): Promise<void> {
    if (!navigator.serviceWorker.controller) return;

    try {
      // Test message passing
      const messageChannel = new MessageChannel();
      const messagePromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Service worker message timeout'));
        }, 5000);

        messageChannel.port1.onmessage = (event) => {
          clearTimeout(timeout);
          resolve(event.data);
        };
      });

      navigator.serviceWorker.controller.postMessage({
        type: 'GET_VERSION'
      }, [messageChannel.port2]);

      await messagePromise;
      console.log('[PWA Validator] Service worker message passing works');

    } catch (error) {
      validation.warnings.push('Service worker message passing failed');
      console.warn('[PWA Validator] Service worker message test failed:', error);
    }

      // Test cache functionality
      try {
        if ('caches' in window) {
          const cache = await caches.open('pwa-validator-test');
          await cache.put('/test', new Response('test'));
          const response = await cache.match('/test');
          if (response) {
            await cache.delete('/test');
            console.log('[PWA Validator] Cache functionality works');
          } else {
            validation.warnings.push('Cache functionality test failed');
          }
          await caches.delete('pwa-validator-test');
        }
      } catch (error) {
        validation.warnings.push('Cache API test failed');
        console.warn('[PWA Validator] Cache test failed:', error);
      }
  }

  /**
   * Check PWA installability
   */
  private async checkInstallability(): Promise<PWAInstallabilityCheck> {
    const check: PWAInstallabilityCheck = {
      canInstall: false,
      installCriteria: {
        hasManifest: false,
        hasServiceWorker: false,
        isServedOverHTTPS: false,
        hasValidIcons: false,
        hasStartUrl: false,
        hasDisplayMode: false,
        hasName: false
      },
      browserSupport: {
        supportsServiceWorker: 'serviceWorker' in navigator,
        supportsManifest: 'onbeforeinstallprompt' in window,
        supportsPWAInstall: 'onbeforeinstallprompt' in window,
        supportsBackgroundSync: 'serviceWorker' in navigator && 
          'ServiceWorkerRegistration' in window && 
          'sync' in window.ServiceWorkerRegistration.prototype
      },
      issues: [],
      recommendations: []
    };

    // Check HTTPS
    check.installCriteria.isServedOverHTTPS = location.protocol === 'https:' || location.hostname === 'localhost';
    if (!check.installCriteria.isServedOverHTTPS) {
      check.issues.push('App must be served over HTTPS for installation');
    }

    // Check manifest
    check.installCriteria.hasManifest = !!this.manifest;
    if (this.manifest) {
      check.installCriteria.hasName = !!(this.manifest.name || this.manifest.short_name);
      check.installCriteria.hasStartUrl = !!this.manifest.start_url;
      check.installCriteria.hasDisplayMode = !!this.manifest.display;
      check.installCriteria.hasValidIcons = !!(
        this.manifest.icons && 
        this.manifest.icons.length > 0 &&
        this.manifest.icons.some((icon: any) => 
          icon.sizes && (icon.sizes.includes('192x192') || icon.sizes.includes('512x512'))
        )
      );

      if (!check.installCriteria.hasName) {
        check.issues.push('Manifest must have a name or short_name');
      }
      if (!check.installCriteria.hasStartUrl) {
        check.issues.push('Manifest must have a start_url');
      }
      if (!check.installCriteria.hasDisplayMode) {
        check.issues.push('Manifest must have a display mode');
      }
      if (!check.installCriteria.hasValidIcons) {
        check.issues.push('Manifest must have icons with sizes 192x192 or 512x512');
      }
    } else {
      check.issues.push('Web app manifest is required for installation');
    }

    // Check service worker
    check.installCriteria.hasServiceWorker = !!this.serviceWorkerRegistration;
    if (!check.installCriteria.hasServiceWorker) {
      check.issues.push('Service worker is required for installation');
    }

    // Determine if can install
    check.canInstall = Object.values(check.installCriteria).every(Boolean);

    // Add browser-specific recommendations
    this.addBrowserSpecificRecommendations(check);

    return check;
  }

  /**
   * Add browser-specific recommendations
   */
  private addBrowserSpecificRecommendations(check: PWAInstallabilityCheck): void {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('chrome')) {
      if (!check.browserSupport.supportsPWAInstall) {
        check.recommendations.push('Update Chrome to latest version for PWA installation support');
      }
    } else if (userAgent.includes('firefox')) {
      check.recommendations.push('Firefox supports PWA features but may not show install prompts');
    } else if (userAgent.includes('safari')) {
      check.recommendations.push('Safari supports PWA features with "Add to Home Screen"');
      if (!this.manifest?.icons?.some((icon: any) => icon.sizes?.includes('180x180'))) {
        check.recommendations.push('Add 180x180 icon for better iOS support');
      }
    } else if (userAgent.includes('edge')) {
      if (!check.browserSupport.supportsPWAInstall) {
        check.recommendations.push('Update Edge to latest version for PWA installation support');
      }
    }
  }

  /**
   * Test offline functionality
   */
  private async testOfflineFunctionality(): Promise<OfflineFunctionalityTest> {
    const test: OfflineFunctionalityTest = {
      canWorkOffline: false,
      cacheStrategies: {
        staticAssets: false,
        dynamicContent: false,
        apiResponses: false,
        images: false
      },
      offlinePages: [],
      fallbackPages: [],
      issues: []
    };

    try {
      // Test if caches exist
      const cacheNames = await caches.keys();
      
      if (!cacheNames || cacheNames.length === 0) {
        test.issues.push('No caches found - app may not work offline');
        return test;
      }

      // Test different cache strategies
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();

        for (const request of requests) {
          const url = new URL(request.url);
          
          // Categorize cached resources
          if (url.pathname.match(/\.(js|css|woff|woff2|ttf|eot)$/)) {
            test.cacheStrategies.staticAssets = true;
          } else if (url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|gif)$/)) {
            test.cacheStrategies.images = true;
          } else if (url.pathname.startsWith('/api/')) {
            test.cacheStrategies.apiResponses = true;
          } else if (url.pathname === '/' || url.pathname.endsWith('.html')) {
            test.cacheStrategies.dynamicContent = true;
            test.offlinePages.push(url.pathname);
          }
        }
      }

      // Check if essential resources are cached
      const essentialResourcesCached = test.cacheStrategies.staticAssets && test.cacheStrategies.dynamicContent;
      test.canWorkOffline = essentialResourcesCached;

      if (!test.cacheStrategies.staticAssets) {
        test.issues.push('Static assets (JS, CSS) not cached - app may not work offline');
      }
      if (!test.cacheStrategies.dynamicContent) {
        test.issues.push('HTML pages not cached - app may not work offline');
      }
      if (!test.cacheStrategies.apiResponses) {
        test.issues.push('API responses not cached - limited offline functionality');
      }

    } catch (error) {
      test.issues.push('Failed to test offline functionality');
      console.error('[PWA Validator] Offline functionality test failed:', error);
    }

    return test;
  }

  /**
   * Check cross-browser compatibility
   */
  private async checkCrossBrowserCompatibility(): Promise<CrossBrowserCompatibility> {
    const compatibility: CrossBrowserCompatibility = {
      chrome: { supported: false, issues: [] },
      firefox: { supported: false, issues: [] },
      safari: { supported: false, issues: [] },
      edge: { supported: false, issues: [] },
      overall: { score: 0, criticalIssues: [] }
    };

    // Check current browser
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Chrome compatibility
    if (userAgent.includes('chrome')) {
      compatibility.chrome.supported = true;
      compatibility.chrome.version = this.extractBrowserVersion(userAgent, 'chrome');
      
      if (!('onbeforeinstallprompt' in window)) {
        compatibility.chrome.issues.push('Install prompt not supported in this Chrome version');
      }
    } else {
      compatibility.chrome.issues.push('Not running on Chrome - cannot test Chrome-specific features');
    }

    // Firefox compatibility
    if (userAgent.includes('firefox')) {
      compatibility.firefox.supported = true;
      compatibility.firefox.version = this.extractBrowserVersion(userAgent, 'firefox');
      
      if (!('serviceWorker' in navigator)) {
        compatibility.firefox.issues.push('Service Workers not supported in this Firefox version');
      }
    } else {
      compatibility.firefox.issues.push('Not running on Firefox - cannot test Firefox-specific features');
    }

    // Safari compatibility
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      compatibility.safari.supported = true;
      compatibility.safari.version = this.extractBrowserVersion(userAgent, 'version');
      
      if (!('serviceWorker' in navigator)) {
        compatibility.safari.issues.push('Service Workers not supported in this Safari version');
      }
      
      // Safari-specific checks
      if (!this.manifest?.icons?.some((icon: any) => icon.sizes?.includes('180x180'))) {
        compatibility.safari.issues.push('Missing 180x180 icon for iOS home screen');
      }
    } else {
      compatibility.safari.issues.push('Not running on Safari - cannot test Safari-specific features');
    }

    // Edge compatibility
    if (userAgent.includes('edge') || userAgent.includes('edg/')) {
      compatibility.edge.supported = true;
      compatibility.edge.version = this.extractBrowserVersion(userAgent, 'edg');
      
      if (!('onbeforeinstallprompt' in window)) {
        compatibility.edge.issues.push('Install prompt not supported in this Edge version');
      }
    } else {
      compatibility.edge.issues.push('Not running on Edge - cannot test Edge-specific features');
    }

    // Calculate overall score
    const supportedBrowsers = [
      compatibility.chrome.supported,
      compatibility.firefox.supported,
      compatibility.safari.supported,
      compatibility.edge.supported
    ].filter(Boolean).length;

    compatibility.overall.score = (supportedBrowsers / 4) * 100;

    // Collect critical issues
    const allIssues = [
      ...compatibility.chrome.issues,
      ...compatibility.firefox.issues,
      ...compatibility.safari.issues,
      ...compatibility.edge.issues
    ];

    compatibility.overall.criticalIssues = allIssues.filter(issue => 
      issue.includes('not supported') || issue.includes('required')
    );

    return compatibility;
  }

  /**
   * Extract browser version from user agent
   */
  private extractBrowserVersion(userAgent: string, browserName: string): string {
    const regex = new RegExp(`${browserName}\/([\\d\\.]+)`, 'i');
    const match = userAgent.match(regex);
    return match ? match[1] : 'unknown';
  }

  /**
   * Calculate overall PWA score
   */
  private calculateOverallScore(validations: {
    manifest: ManifestValidation;
    serviceWorker: ServiceWorkerValidation;
    installability: PWAInstallabilityCheck;
    offlineFunctionality: OfflineFunctionalityTest;
    crossBrowserCompatibility: CrossBrowserCompatibility;
  }): number {
    const weights = {
      manifest: 0.25,
      serviceWorker: 0.25,
      installability: 0.25,
      offlineFunctionality: 0.15,
      crossBrowserCompatibility: 0.1
    };

    let totalScore = 0;

    // Manifest score
    totalScore += validations.manifest.score * weights.manifest;

    // Service worker score
    const swScore = validations.serviceWorker.isRegistered && validations.serviceWorker.isActive ? 100 : 0;
    totalScore += swScore * weights.serviceWorker;

    // Installability score
    const installScore = validations.installability.canInstall ? 100 : 0;
    totalScore += installScore * weights.installability;

    // Offline functionality score
    const offlineScore = validations.offlineFunctionality.canWorkOffline ? 100 : 0;
    totalScore += offlineScore * weights.offlineFunctionality;

    // Cross-browser compatibility score
    totalScore += validations.crossBrowserCompatibility.overall.score * weights.crossBrowserCompatibility;

    return Math.round(totalScore);
  }

  /**
   * Collect critical issues
   */
  private collectCriticalIssues(validations: any): string[] {
    const criticalIssues: string[] = [];

    // Manifest critical issues
    if (!validations.manifest.isValid) {
      criticalIssues.push(...validations.manifest.errors);
    }

    // Service worker critical issues
    if (!validations.serviceWorker.isRegistered) {
      criticalIssues.push('Service worker not registered');
    }

    // Installability critical issues
    if (!validations.installability.canInstall) {
      criticalIssues.push(...validations.installability.issues);
    }

    // Offline functionality critical issues
    if (!validations.offlineFunctionality.canWorkOffline) {
      criticalIssues.push('App cannot work offline');
    }

    return criticalIssues;
  }

  /**
   * Collect recommendations
   */
  private collectRecommendations(validations: any): string[] {
    const recommendations: string[] = [];

    recommendations.push(...validations.manifest.recommendations);
    recommendations.push(...validations.installability.recommendations);

    // Add general recommendations
    if (validations.manifest.score < 100) {
      recommendations.push('Complete all required manifest fields for better PWA compliance');
    }

    if (!validations.offlineFunctionality.cacheStrategies.apiResponses) {
      recommendations.push('Cache API responses for better offline experience');
    }

    if (validations.crossBrowserCompatibility.overall.score < 75) {
      recommendations.push('Test and optimize for better cross-browser compatibility');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Validate color format
   */
  private isValidColor(color: string): boolean {
    // Simple color validation - hex, rgb, rgba, named colors
    const colorRegex = /^(#[0-9A-Fa-f]{3,8}|rgb\(|rgba\(|[a-zA-Z]+)$/;
    return colorRegex.test(color);
  }

  /**
   * Quick validation for development
   */
  async quickValidation(): Promise<{
    hasManifest: boolean;
    hasServiceWorker: boolean;
    canInstall: boolean;
    issues: string[];
  }> {
    const result = {
      hasManifest: false,
      hasServiceWorker: false,
      canInstall: false,
      issues: [] as string[]
    };

    try {
      await this.loadManifest();
      result.hasManifest = !!this.manifest;

      await this.getServiceWorkerRegistration();
      result.hasServiceWorker = !!this.serviceWorkerRegistration;

      result.canInstall = result.hasManifest && result.hasServiceWorker && 
                         (location.protocol === 'https:' || location.hostname === 'localhost');

      if (!result.hasManifest) {
        result.issues.push('Missing web app manifest');
      }
      if (!result.hasServiceWorker) {
        result.issues.push('Missing service worker');
      }
      if (!result.canInstall) {
        result.issues.push('PWA installation requirements not met');
      }

    } catch (error: any) {
      result.issues.push('Validation failed: ' + (error?.message || 'Unknown error'));
    }

    return result;
  }
}

// Export singleton instance
export const pwaValidator = new PWAValidator();
export default pwaValidator;