/**
 * PWA Validator Tests
 * Comprehensive tests for PWA validation functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { pwaValidator } from '../pwaValidator';

// Mock global objects
const mockManifest = {
  name: 'Shop & Chop',
  short_name: 'Shop&Chop',
  description: 'Smart meal planner and shopping list generator',
  start_url: '/',
  display: 'standalone',
  theme_color: '#10b981',
  background_color: '#ffffff',
  icons: [
    {
      src: '/icons/icon-192x192.png',
      sizes: '192x192',
      type: 'image/png'
    },
    {
      src: '/icons/icon-512x512.png',
      sizes: '512x512',
      type: 'image/png'
    }
  ]
};

const mockServiceWorkerRegistration = {
  installing: null,
  waiting: null,
  active: {
    postMessage: vi.fn()
  },
  addEventListener: vi.fn(),
  update: vi.fn()
};

// Mock fetch
global.fetch = vi.fn();

// Mock caches API
const mockCache = {
  keys: vi.fn(),
  match: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  add: vi.fn(),
  addAll: vi.fn()
};

global.caches = {
  keys: vi.fn(),
  open: vi.fn().mockResolvedValue(mockCache),
  delete: vi.fn(),
  match: vi.fn(),
  has: vi.fn()
} as any;

// Mock service worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: vi.fn(),
    getRegistration: vi.fn(),
    controller: mockServiceWorkerRegistration.active,
    addEventListener: vi.fn()
  },
  writable: true
});

// Mock ServiceWorkerRegistration
Object.defineProperty(window, 'ServiceWorkerRegistration', {
  value: {
    prototype: {
      sync: {}
    }
  },
  writable: true
});

// Mock IndexedDB
Object.defineProperty(window, 'indexedDB', {
  value: {},
  writable: true
});

describe('PWAValidator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset DOM
    document.head.innerHTML = '';
    
    // Mock location
    Object.defineProperty(window, 'location', {
      value: {
        protocol: 'https:',
        hostname: 'localhost',
        origin: 'https://localhost:3000'
      },
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Manifest Validation', () => {
    it('should validate a complete manifest', async () => {
      // Setup
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/manifest.json';
      document.head.appendChild(manifestLink);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest)
      });

      // Mock icon fetch
      (global.fetch as any).mockResolvedValue({
        ok: true
      });

      // Test
      const result = await pwaValidator.validatePWA();

      // Assertions
      expect(result.manifest.isValid).toBe(true);
      expect(result.manifest.score).toBe(100);
      expect(result.manifest.errors).toHaveLength(0);
      expect(result.manifest.requiredFields.name).toBe(true);
      expect(result.manifest.requiredFields.icons).toBe(true);
    });

    it('should detect missing manifest', async () => {
      // Test
      const result = await pwaValidator.validatePWA();

      // Assertions
      expect(result.manifest.isValid).toBe(false);
      expect(result.manifest.errors).toContain('Manifest file not found or not accessible');
    });

    it('should detect missing required fields', async () => {
      // Setup
      const incompleteManifest = {
        name: 'Test App'
        // Missing other required fields
      };

      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/manifest.json';
      document.head.appendChild(manifestLink);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(incompleteManifest)
      });

      // Test
      const result = await pwaValidator.validatePWA();

      // Assertions
      expect(result.manifest.isValid).toBe(false);
      expect(result.manifest.errors.length).toBeGreaterThan(0);
      expect(result.manifest.score).toBeLessThan(100);
    });

    it('should validate icon accessibility', async () => {
      // Setup
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/manifest.json';
      document.head.appendChild(manifestLink);

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockManifest)
        })
        .mockResolvedValueOnce({ ok: true }) // First icon
        .mockRejectedValueOnce(new Error('Not found')); // Second icon

      // Test
      const result = await pwaValidator.validatePWA();

      // Assertions
      expect(result.manifest.errors).toContain('Failed to validate icon: /icons/icon-512x512.png');
    });

    it('should validate color formats', async () => {
      // Setup
      const manifestWithInvalidColors = {
        ...mockManifest,
        theme_color: 'invalid-color',
        background_color: '#xyz'
      };

      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/manifest.json';
      document.head.appendChild(manifestLink);

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(manifestWithInvalidColors)
        })
        .mockResolvedValue({ ok: true }); // Icons

      // Test
      const result = await pwaValidator.validatePWA();

      // Assertions
      expect(result.manifest.warnings).toContain('Invalid theme_color format');
      expect(result.manifest.warnings).toContain('Invalid background_color format');
    });
  });

  describe('Service Worker Validation', () => {
    it('should validate active service worker', async () => {
      // Setup
      (navigator.serviceWorker.getRegistration as any).mockResolvedValue(mockServiceWorkerRegistration);

      // Test
      const result = await pwaValidator.validatePWA();

      // Assertions
      expect(result.serviceWorker.isRegistered).toBe(true);
      expect(result.serviceWorker.isActive).toBe(true);
      expect(result.serviceWorker.isControlling).toBe(true);
    });

    it('should detect missing service worker', async () => {
      // Setup
      (navigator.serviceWorker.getRegistration as any).mockResolvedValue(null);

      // Test
      const result = await pwaValidator.validatePWA();

      // Assertions
      expect(result.serviceWorker.isRegistered).toBe(false);
      expect(result.serviceWorker.errors).toContain('Service worker not registered');
    });

    it('should check API support', async () => {
      // Setup
      (navigator.serviceWorker.getRegistration as any).mockResolvedValue(mockServiceWorkerRegistration);

      // Test
      const result = await pwaValidator.validatePWA();

      // Assertions
      expect(result.serviceWorker.supportsCacheAPI).toBe(true);
      expect(result.serviceWorker.supportsIndexedDB).toBe(true);
    });

    it('should test service worker message passing', async () => {
      // Setup
      (navigator.serviceWorker.getRegistration as any).mockResolvedValue(mockServiceWorkerRegistration);

      // Mock MessageChannel with proper structure
      const mockPort1 = {
        onmessage: null as any,
        postMessage: vi.fn(),
        start: vi.fn(),
        close: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      };

      const mockPort2 = {
        onmessage: null as any,
        postMessage: vi.fn(),
        start: vi.fn(),
        close: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      };

      const mockMessageChannel = {
        port1: mockPort1,
        port2: mockPort2
      };

      global.MessageChannel = vi.fn(() => mockMessageChannel) as any;

      // Mock successful message response
      setTimeout(() => {
        if (mockPort1.onmessage) {
          mockPort1.onmessage({ data: { version: '1.0.0' } });
        }
      }, 100);

      // Test
      const result = await pwaValidator.validatePWA();

      // Assertions
      expect(result.serviceWorker.isRegistered).toBe(true);
    });
  });

  describe('Installability Check', () => {
    it('should pass installability check with all requirements', async () => {
      // Setup
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/manifest.json';
      document.head.appendChild(manifestLink);

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockManifest)
        })
        .mockResolvedValue({ ok: true }); // Icons

      (navigator.serviceWorker.getRegistration as any).mockResolvedValue(mockServiceWorkerRegistration);

      // Test
      const result = await pwaValidator.validatePWA();

      // Assertions
      expect(result.installability.canInstall).toBe(true);
      expect(result.installability.installCriteria.hasManifest).toBe(true);
      expect(result.installability.installCriteria.hasServiceWorker).toBe(true);
      expect(result.installability.installCriteria.isServedOverHTTPS).toBe(true);
    });

    it('should fail installability check without HTTPS', async () => {
      // Setup
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'http:',
          hostname: 'example.com'
        },
        writable: true
      });

      // Test
      const result = await pwaValidator.validatePWA();

      // Assertions
      expect(result.installability.canInstall).toBe(false);
      expect(result.installability.installCriteria.isServedOverHTTPS).toBe(false);
      expect(result.installability.issues).toContain('App must be served over HTTPS for installation');
    });

    it('should allow localhost without HTTPS', async () => {
      // Setup
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'http:',
          hostname: 'localhost'
        },
        writable: true
      });

      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/manifest.json';
      document.head.appendChild(manifestLink);

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockManifest)
        })
        .mockResolvedValue({ ok: true });

      (navigator.serviceWorker.getRegistration as any).mockResolvedValue(mockServiceWorkerRegistration);

      // Test
      const result = await pwaValidator.validatePWA();

      // Assertions
      expect(result.installability.installCriteria.isServedOverHTTPS).toBe(true);
    });
  });

  describe('Offline Functionality Test', () => {
    it('should detect cached resources', async () => {
      // Setup
      const mockCacheRequests = [
        { url: 'https://example.com/app.js' },
        { url: 'https://example.com/style.css' },
        { url: 'https://example.com/' },
        { url: 'https://example.com/api/data' },
        { url: 'https://example.com/image.png' }
      ];

      mockCache.keys.mockResolvedValue(mockCacheRequests);
      (global.caches.keys as any).mockResolvedValue(['app-cache-v1']);

      // Test
      const result = await pwaValidator.validatePWA();

      // Assertions
      expect(result.offlineFunctionality.cacheStrategies.staticAssets).toBe(true);
      expect(result.offlineFunctionality.cacheStrategies.dynamicContent).toBe(true);
      expect(result.offlineFunctionality.cacheStrategies.apiResponses).toBe(true);
      expect(result.offlineFunctionality.cacheStrategies.images).toBe(true);
      expect(result.offlineFunctionality.canWorkOffline).toBe(true);
    });

    it('should detect missing caches', async () => {
      // Setup
      (global.caches.keys as any).mockResolvedValue([]);

      // Test
      const result = await pwaValidator.validatePWA();

      // Assertions
      expect(result.offlineFunctionality.canWorkOffline).toBe(false);
      expect(result.offlineFunctionality.issues).toContain('No caches found - app may not work offline');
    });
  });

  describe('Cross-Browser Compatibility', () => {
    it('should detect Chrome browser', async () => {
      // Setup
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        writable: true
      });

      // Mock beforeinstallprompt support
      Object.defineProperty(window, 'onbeforeinstallprompt', {
        value: null,
        writable: true
      });

      // Test
      const result = await pwaValidator.validatePWA();

      // Assertions
      expect(result.crossBrowserCompatibility.chrome.supported).toBe(true);
      expect(result.crossBrowserCompatibility.chrome.version).toBe('91.0.4472.124');
    });

    it('should detect Safari browser and recommend iOS icon', async () => {
      // Setup
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        writable: true
      });

      const manifestWithoutIOSIcon = {
        ...mockManifest,
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      };

      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/manifest.json';
      document.head.appendChild(manifestLink);

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(manifestWithoutIOSIcon)
        })
        .mockResolvedValue({ ok: true });

      // Test
      const result = await pwaValidator.validatePWA();

      // Assertions
      expect(result.crossBrowserCompatibility.safari.supported).toBe(true);
      expect(result.crossBrowserCompatibility.safari.issues).toContain('Missing 180x180 icon for iOS home screen');
    });
  });

  describe('Overall Score Calculation', () => {
    it('should calculate high score for complete PWA', async () => {
      // Setup complete PWA
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/manifest.json';
      document.head.appendChild(manifestLink);

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockManifest)
        })
        .mockResolvedValue({ ok: true });

      (navigator.serviceWorker.getRegistration as any).mockResolvedValue(mockServiceWorkerRegistration);

      const mockCacheRequests = [
        { url: 'https://example.com/app.js' },
        { url: 'https://example.com/' }
      ];

      mockCache.keys.mockResolvedValue(mockCacheRequests);
      (global.caches.keys as any).mockResolvedValue(['app-cache-v1']);

      // Test
      const result = await pwaValidator.validatePWA();

      // Assertions
      expect(result.overallScore).toBeGreaterThan(80);
      expect(result.criticalIssues).toHaveLength(0);
    });

    it('should calculate low score for incomplete PWA', async () => {
      // Setup incomplete PWA (no manifest, no service worker)
      
      // Test
      const result = await pwaValidator.validatePWA();

      // Assertions
      expect(result.overallScore).toBeLessThan(50);
      expect(result.criticalIssues.length).toBeGreaterThan(0);
    });
  });

  describe('Quick Validation', () => {
    it('should perform quick validation successfully', async () => {
      // Setup
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/manifest.json';
      document.head.appendChild(manifestLink);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest)
      });

      (navigator.serviceWorker.getRegistration as any).mockResolvedValue(mockServiceWorkerRegistration);

      // Test
      const result = await pwaValidator.quickValidation();

      // Assertions
      expect(result.hasManifest).toBe(true);
      expect(result.hasServiceWorker).toBe(true);
      expect(result.canInstall).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect issues in quick validation', async () => {
      // Test
      const result = await pwaValidator.quickValidation();

      // Assertions
      expect(result.hasManifest).toBe(false);
      expect(result.hasServiceWorker).toBe(false);
      expect(result.canInstall).toBe(false);
      expect(result.issues).toContain('Missing web app manifest');
      expect(result.issues).toContain('Missing service worker');
    });
  });

  describe('Error Handling', () => {
    it('should handle manifest fetch errors gracefully', async () => {
      // Setup
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/manifest.json';
      document.head.appendChild(manifestLink);

      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      // Test
      const result = await pwaValidator.validatePWA();

      // Assertions
      expect(result.manifest.isValid).toBe(false);
      expect(result.manifest.errors).toContain('Manifest file not found or not accessible');
    });

    it('should handle service worker registration errors', async () => {
      // Setup
      (navigator.serviceWorker.getRegistration as any).mockRejectedValue(new Error('Registration failed'));

      // Test
      const result = await pwaValidator.validatePWA();

      // Assertions
      expect(result.serviceWorker.isRegistered).toBe(false);
    });

    it('should handle cache API errors', async () => {
      // Setup
      (global.caches.keys as any).mockRejectedValue(new Error('Cache API error'));

      // Test
      const result = await pwaValidator.validatePWA();

      // Assertions
      expect(result.offlineFunctionality.issues).toContain('Failed to test offline functionality');
    });
  });
});