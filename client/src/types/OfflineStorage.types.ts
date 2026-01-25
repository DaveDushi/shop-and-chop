/**
 * Types for PWA offline storage functionality
 */

// Extend global types for PWA
declare global {
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
      outcome: 'accepted' | 'dismissed';
      platform: string;
    }>;
    prompt(): Promise<void>;
  }

  interface ServiceWorkerRegistration {
    sync?: {
      register(tag: string): Promise<void>;
    };
  }
}

// Shopping List Types
export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  checked: boolean;
  recipeId?: string;
  recipeName?: string;
}

export interface OfflineShoppingListItem extends ShoppingListItem {
  lastModified: Date;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

export interface ShoppingList {
  [category: string]: ShoppingListItem[];
}

export interface OfflineShoppingList {
  [category: string]: OfflineShoppingListItem[];
}

// Metadata Types
export interface ShoppingListMetadata {
  id: string;
  mealPlanId: string;
  weekStartDate: string;
  generatedAt: Date;
  lastModified: Date;
  syncStatus: 'synced' | 'pending' | 'conflict';
  deviceId: string;
  version: number;
}

export interface OfflineShoppingListEntry {
  metadata: ShoppingListMetadata;
  shoppingList: OfflineShoppingList;
}

// Sync Operation Types
export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'item_check' | 'item_uncheck';
  shoppingListId: string;
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export interface ShoppingListChange {
  id: string;
  type: 'item_check' | 'item_uncheck' | 'item_add' | 'item_remove';
  itemId: string;
  category: string;
  timestamp: Date;
  data: any;
}

export interface OfflineShoppingListState {
  id: string;
  metadata: ShoppingListMetadata;
  shoppingList: OfflineShoppingList;
  pendingChanges: ShoppingListChange[];
}

// Storage Management Types
export interface StorageUsage {
  used: number;
  available: number;
  percentage: number;
}

// IndexedDB Schema Types
export interface ShoppingListDB {
  shoppingLists: {
    key: string; // shopping list ID
    value: OfflineShoppingListEntry;
    indexes: {
      mealPlanId: string;
      weekStartDate: string;
      lastModified: Date;
      syncStatus: string;
    };
  };
  
  syncQueue: {
    key: string; // operation ID
    value: SyncOperation;
    indexes: {
      timestamp: Date;
      type: string;
      shoppingListId: string;
      retryCount: number;
    };
  };
  
  metadata: {
    key: string; // metadata key
    value: any;
  };
}

// Connection and Sync Types
export interface ConnectionState {
  isOnline: boolean;
  connectionType: 'wifi' | 'cellular' | 'unknown';
  lastOnline: Date;
}

export interface SyncStatus {
  isActive: boolean;
  pendingOperations: number;
  lastSync: Date;
  errors: string[];
}

// PWA Installation Types
export interface PWAInstallationState {
  canInstall: boolean;
  isInstalled: boolean;
  installPromptEvent?: BeforeInstallPromptEvent;
}

// Service Worker Message Types
export interface ServiceWorkerMessage {
  type: 'SYNC_COMPLETE' | 'SYNC_ERROR' | 'CACHE_UPDATED' | 'OFFLINE_READY';
  payload?: any;
}

// Error Types
export interface OfflineStorageError extends Error {
  code: 'QUOTA_EXCEEDED' | 'DB_ERROR' | 'SYNC_ERROR' | 'NETWORK_ERROR';
  details?: any;
}