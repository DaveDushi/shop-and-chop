/**
 * Data Serialization Utilities for PWA Offline Storage
 * 
 * Provides comprehensive serialization and deserialization utilities
 * with type safety, version management, and migration support.
 * 
 * Features:
 * - Type-safe serialization with schema validation
 * - Version management and migration support
 * - Binary and JSON serialization formats
 * - Data transformation and normalization
 * - Performance optimization for large datasets
 */

import { 
  OfflineShoppingListEntry, 
  OfflineShoppingListItem,
  ShoppingListMetadata,
  SyncOperation,
  OfflineStorageError 
} from '../types/OfflineStorage.types';

// Serialization configuration
export interface SerializationConfig {
  format: 'json' | 'binary' | 'compact';
  version: number;
  enableValidation: boolean;
  enableMigration: boolean;
  preserveTypes: boolean;
}

// Serialization result
export interface SerializationResult {
  data: any;
  format: string;
  version: number;
  size: number;
  checksum: string;
  timestamp: Date;
}

// Migration handler interface
export interface MigrationHandler {
  fromVersion: number;
  toVersion: number;
  migrate(data: any): any;
}

// Schema definition for validation
export interface SerializationSchema {
  version: number;
  fields: { [key: string]: FieldSchema };
  required: string[];
}

export interface FieldSchema {
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  optional?: boolean;
  validator?: (value: any) => boolean;
  transformer?: (value: any) => any;
}

/**
 * Advanced Data Serialization Utility Class
 */
class DataSerializationUtil {
  private static instance: DataSerializationUtil;
  private config: SerializationConfig;
  private migrationHandlers: Map<string, MigrationHandler> = new Map();
  private schemas: Map<number, SerializationSchema> = new Map();

  private constructor(config?: Partial<SerializationConfig>) {
    this.config = {
      format: 'json',
      version: 1,
      enableValidation: true,
      enableMigration: true,
      preserveTypes: true,
      ...config
    };

    this.initializeSchemas();
    this.initializeMigrationHandlers();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<SerializationConfig>): DataSerializationUtil {
    if (!DataSerializationUtil.instance) {
      DataSerializationUtil.instance = new DataSerializationUtil(config);
    }
    return DataSerializationUtil.instance;
  }

  /**
   * Initialize serialization schemas for different versions
   */
  private initializeSchemas(): void {
    // Version 1 schema
    this.schemas.set(1, {
      version: 1,
      fields: {
        'metadata.id': { type: 'string' },
        'metadata.mealPlanId': { type: 'string' },
        'metadata.weekStartDate': { type: 'string' },
        'metadata.generatedAt': { type: 'date' },
        'metadata.lastModified': { type: 'date' },
        'metadata.syncStatus': { type: 'string', validator: (v) => ['synced', 'pending', 'conflict'].includes(v) },
        'metadata.deviceId': { type: 'string' },
        'metadata.version': { type: 'number', optional: true },
        'shoppingList': { type: 'object' }
      },
      required: ['metadata.id', 'metadata.mealPlanId', 'metadata.generatedAt', 'shoppingList']
    });
  }

  /**
   * Initialize migration handlers for version upgrades
   */
  private initializeMigrationHandlers(): void {
    // Example migration from version 1 to 2 (when needed)
    this.migrationHandlers.set('1->2', {
      fromVersion: 1,
      toVersion: 2,
      migrate: (data: any) => {
        // Add new fields or transform existing ones
        return {
          ...data,
          metadata: {
            ...data.metadata,
            version: 2,
            // Add new fields for version 2
            createdBy: data.metadata.deviceId,
            tags: []
          }
        };
      }
    });
  }

  /**
   * Serialize shopping list entry with comprehensive validation
   */
  async serializeShoppingListEntry(entry: OfflineShoppingListEntry): Promise<SerializationResult> {
    try {
      const startTime = performance.now();

      // Validate input if enabled
      if (this.config.enableValidation) {
        this.validateEntry(entry);
      }

      let serializedData: any;
      let format: string;

      // Serialize based on configured format
      switch (this.config.format) {
        case 'json':
          serializedData = this.serializeToJSON(entry);
          format = 'json';
          break;
        case 'binary':
          serializedData = this.serializeToBinary(entry);
          format = 'binary';
          break;
        case 'compact':
          serializedData = this.serializeToCompact(entry);
          format = 'compact';
          break;
        default:
          throw new Error(`Unsupported serialization format: ${this.config.format}`);
      }

      const size = this.calculateSize(serializedData);
      const checksum = this.calculateChecksum(serializedData);
      const processingTime = performance.now() - startTime;

      console.debug(`Serialization completed in ${processingTime.toFixed(2)}ms, size: ${size} bytes`);

      return {
        data: serializedData,
        format,
        version: this.config.version,
        size,
        checksum,
        timestamp: new Date()
      };
    } catch (error) {
      throw this.createSerializationError('SERIALIZATION_FAILED', 'Failed to serialize shopping list entry', error);
    }
  }

  /**
   * Deserialize shopping list entry with migration support
   */
  async deserializeShoppingListEntry(serializedResult: SerializationResult | any): Promise<OfflineShoppingListEntry> {
    try {
      const startTime = performance.now();

      // Handle legacy data without SerializationResult wrapper
      const data = serializedResult.data || serializedResult;
      const version = serializedResult.version || 1;
      const format = serializedResult.format || 'json';

      // Validate checksum if available
      if (serializedResult.checksum && this.config.enableValidation) {
        const currentChecksum = this.calculateChecksum(data);
        if (currentChecksum !== serializedResult.checksum) {
          throw new Error('Data integrity check failed: checksum mismatch');
        }
      }

      let deserializedData: any;

      // Deserialize based on format
      switch (format) {
        case 'json':
          deserializedData = this.deserializeFromJSON(data);
          break;
        case 'binary':
          deserializedData = this.deserializeFromBinary(data);
          break;
        case 'compact':
          deserializedData = this.deserializeFromCompact(data);
          break;
        default:
          // Fallback to JSON deserialization
          deserializedData = this.deserializeFromJSON(data);
          break;
      }

      // Apply migrations if needed
      if (this.config.enableMigration && version < this.config.version) {
        deserializedData = this.applyMigrations(deserializedData, version, this.config.version);
      }

      // Validate result if enabled
      if (this.config.enableValidation) {
        this.validateEntry(deserializedData);
      }

      const processingTime = performance.now() - startTime;
      console.debug(`Deserialization completed in ${processingTime.toFixed(2)}ms`);

      return deserializedData;
    } catch (error) {
      throw this.createSerializationError('DESERIALIZATION_FAILED', 'Failed to deserialize shopping list entry', error);
    }
  }

  /**
   * Serialize to JSON format with type preservation
   */
  private serializeToJSON(entry: OfflineShoppingListEntry): any {
    const serialized = {
      _format: 'json',
      _version: this.config.version,
      _timestamp: new Date().toISOString(),
      metadata: {
        ...entry.metadata,
        generatedAt: entry.metadata.generatedAt.toISOString(),
        lastModified: entry.metadata.lastModified.toISOString()
      },
      shoppingList: {}
    };

    // Serialize shopping list items with type preservation
    Object.keys(entry.shoppingList).forEach(category => {
      const categoryItems = entry.shoppingList[category as keyof typeof entry.shoppingList];
      (serialized.shoppingList as any)[category] = categoryItems.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        checked: item.checked,
        lastModified: item.lastModified.toISOString(),
        syncStatus: item.syncStatus,
        ...(item.recipeId && { recipeId: item.recipeId }),
        ...(item.recipeName && { recipeName: item.recipeName })
      }));
    });

    return serialized;
  }

  /**
   * Serialize to binary format (using ArrayBuffer)
   */
  private serializeToBinary(entry: OfflineShoppingListEntry): ArrayBuffer {
    // Convert to JSON first, then to binary
    const jsonData = this.serializeToJSON(entry);
    const jsonString = JSON.stringify(jsonData);
    
    // Create ArrayBuffer from string
    const buffer = new ArrayBuffer(jsonString.length * 2);
    const view = new Uint16Array(buffer);
    
    for (let i = 0; i < jsonString.length; i++) {
      view[i] = jsonString.charCodeAt(i);
    }
    
    return buffer;
  }

  /**
   * Serialize to compact format with optimizations
   */
  private serializeToCompact(entry: OfflineShoppingListEntry): any {
    // Create compact representation with field mappings
    const fieldMap = {
      id: 'i',
      name: 'n',
      quantity: 'q',
      unit: 'u',
      checked: 'c',
      lastModified: 'l',
      syncStatus: 's',
      recipeId: 'r',
      recipeName: 'rn'
    };

    const metadataMap = {
      id: 'i',
      mealPlanId: 'm',
      weekStartDate: 'w',
      generatedAt: 'g',
      lastModified: 'l',
      syncStatus: 's',
      deviceId: 'd',
      version: 'v'
    };

    const compact = {
      _format: 'compact',
      _version: this.config.version,
      _fieldMap: fieldMap,
      _metadataMap: metadataMap,
      m: {}, // metadata
      sl: {} // shopping list
    };

    // Compact metadata
    Object.keys(entry.metadata).forEach(key => {
      const mappedKey = metadataMap[key as keyof typeof metadataMap] || key;
      let value: string | boolean | number | Date | undefined = entry.metadata[key as keyof ShoppingListMetadata];
      
      if (value instanceof Date) {
        value = value.getTime(); // Store as timestamp
      }
      
      (compact.m as any)[mappedKey] = value;
    });

    // Compact shopping list
    Object.keys(entry.shoppingList).forEach((category, categoryIndex) => {
      const categoryItems = entry.shoppingList[category as keyof typeof entry.shoppingList];
      (compact.sl as any)[categoryIndex] = {
        name: category,
        items: categoryItems.map(item => {
          const compactItem: any = {};
          Object.keys(item).forEach(key => {
            const mappedKey = fieldMap[key as keyof typeof fieldMap] || key;
            let value: string | boolean | number | Date | undefined = item[key as keyof OfflineShoppingListItem];
            
            if (value instanceof Date) {
              const timeValue = value.getTime();
              compactItem[mappedKey] = timeValue;
            } else {
              compactItem[mappedKey] = value;
            }
          });
          return compactItem;
        })
      };
    });

    return compact;
  }

  /**
   * Deserialize from JSON format
   */
  private deserializeFromJSON(data: any): OfflineShoppingListEntry {
    const entry: OfflineShoppingListEntry = {
      metadata: {
        ...data.metadata,
        generatedAt: new Date(data.metadata.generatedAt),
        lastModified: new Date(data.metadata.lastModified)
      },
      shoppingList: {}
    };

    // Deserialize shopping list items
    Object.keys(data.shoppingList).forEach(category => {
      entry.shoppingList[category] = data.shoppingList[category].map((item: any): OfflineShoppingListItem => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        checked: Boolean(item.checked),
        lastModified: new Date(item.lastModified),
        syncStatus: item.syncStatus || 'pending',
        ...(item.recipeId && { recipeId: item.recipeId }),
        ...(item.recipeName && { recipeName: item.recipeName })
      }));
    });

    return entry;
  }

  /**
   * Deserialize from binary format
   */
  private deserializeFromBinary(buffer: ArrayBuffer): OfflineShoppingListEntry {
    // Convert ArrayBuffer back to string
    const view = new Uint16Array(buffer);
    let jsonString = '';
    
    for (let i = 0; i < view.length; i++) {
      jsonString += String.fromCharCode(view[i]);
    }
    
    const jsonData = JSON.parse(jsonString);
    return this.deserializeFromJSON(jsonData);
  }

  /**
   * Deserialize from compact format
   */
  private deserializeFromCompact(data: any): OfflineShoppingListEntry {
    const reverseFieldMap: { [key: string]: string } = {};
    const reverseMetadataMap: { [key: string]: string } = {};

    // Create reverse mappings
    Object.keys(data._fieldMap).forEach(original => {
      reverseFieldMap[data._fieldMap[original]] = original;
    });

    Object.keys(data._metadataMap).forEach(original => {
      reverseMetadataMap[data._metadataMap[original]] = original;
    });

    // Restore metadata
    const metadata: any = {};
    Object.keys(data.m).forEach(key => {
      const originalKey = reverseMetadataMap[key] || key;
      let value = data.m[key];
      
      // Restore dates from timestamps
      if (['generatedAt', 'lastModified'].includes(originalKey) && typeof value === 'number') {
        value = new Date(value);
      }
      
      metadata[originalKey] = value;
    });

    // Restore shopping list
    const shoppingList: any = {};
    Object.keys(data.sl).forEach(categoryIndex => {
      const categoryData = data.sl[categoryIndex];
      const categoryName = categoryData.name;
      
      shoppingList[categoryName] = categoryData.items.map((item: any) => {
        const restoredItem: any = {};
        Object.keys(item).forEach(key => {
          const originalKey = reverseFieldMap[key] || key;
          let value = item[key];
          
          // Restore dates from timestamps
          if (originalKey === 'lastModified' && typeof value === 'number') {
            value = new Date(value);
          }
          
          restoredItem[originalKey] = value;
        });
        return restoredItem;
      });
    });

    return { metadata, shoppingList };
  }

  /**
   * Apply migrations to upgrade data from old versions
   */
  private applyMigrations(data: any, fromVersion: number, toVersion: number): any {
    let currentData = data;
    let currentVersion = fromVersion;

    while (currentVersion < toVersion) {
      const migrationKey = `${currentVersion}->${currentVersion + 1}`;
      const handler = this.migrationHandlers.get(migrationKey);

      if (handler) {
        console.log(`Applying migration from version ${currentVersion} to ${currentVersion + 1}`);
        currentData = handler.migrate(currentData);
        currentVersion++;
      } else {
        console.warn(`No migration handler found for ${migrationKey}`);
        break;
      }
    }

    return currentData;
  }

  /**
   * Validate entry against schema
   */
  private validateEntry(entry: any): void {
    const schema = this.schemas.get(this.config.version);
    if (!schema) {
      throw new Error(`No schema found for version ${this.config.version}`);
    }

    // Check required fields
    schema.required.forEach(fieldPath => {
      if (!this.getNestedValue(entry, fieldPath)) {
        throw new Error(`Missing required field: ${fieldPath}`);
      }
    });

    // Validate field types and constraints
    Object.keys(schema.fields).forEach(fieldPath => {
      const fieldSchema = schema.fields[fieldPath];
      const value = this.getNestedValue(entry, fieldPath);

      if (value !== undefined && value !== null) {
        this.validateFieldValue(value, fieldSchema, fieldPath);
      } else if (!fieldSchema.optional) {
        throw new Error(`Missing required field: ${fieldPath}`);
      }
    });
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Validate individual field value
   */
  private validateFieldValue(value: any, schema: FieldSchema, fieldPath: string): void {
    // Type validation
    switch (schema.type) {
      case 'string':
        if (typeof value !== 'string') {
          throw new Error(`Field ${fieldPath} must be a string`);
        }
        break;
      case 'number':
        if (typeof value !== 'number') {
          throw new Error(`Field ${fieldPath} must be a number`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new Error(`Field ${fieldPath} must be a boolean`);
        }
        break;
      case 'date':
        if (!(value instanceof Date) && typeof value !== 'string') {
          throw new Error(`Field ${fieldPath} must be a Date or ISO string`);
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null) {
          throw new Error(`Field ${fieldPath} must be an object`);
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          throw new Error(`Field ${fieldPath} must be an array`);
        }
        break;
    }

    // Custom validator
    if (schema.validator && !schema.validator(value)) {
      throw new Error(`Field ${fieldPath} failed custom validation`);
    }
  }

  /**
   * Calculate size of serialized data
   */
  private calculateSize(data: any): number {
    if (data instanceof ArrayBuffer) {
      return data.byteLength;
    }
    return JSON.stringify(data).length;
  }

  /**
   * Calculate checksum for data integrity
   */
  private calculateChecksum(data: any): string {
    let content: string;
    
    if (data instanceof ArrayBuffer) {
      const view = new Uint8Array(data);
      content = Array.from(view).join(',');
    } else {
      content = JSON.stringify(data);
    }

    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(16);
  }

  /**
   * Create serialization error
   */
  private createSerializationError(
    code: 'SERIALIZATION_FAILED' | 'DESERIALIZATION_FAILED' | 'VALIDATION_FAILED' | 'MIGRATION_FAILED',
    message: string,
    details?: any
  ): OfflineStorageError {
    const error = new Error(message) as OfflineStorageError;
    error.code = 'DB_ERROR';
    error.details = { serializationCode: code, ...details };
    return error;
  }

  /**
   * Add custom migration handler
   */
  addMigrationHandler(handler: MigrationHandler): void {
    const key = `${handler.fromVersion}->${handler.toVersion}`;
    this.migrationHandlers.set(key, handler);
  }

  /**
   * Add custom schema
   */
  addSchema(schema: SerializationSchema): void {
    this.schemas.set(schema.version, schema);
  }

  /**
   * Get serialization statistics
   */
  getStats(): {
    supportedFormats: string[];
    currentVersion: number;
    availableVersions: number[];
    migrationHandlers: string[];
  } {
    return {
      supportedFormats: ['json', 'binary', 'compact'],
      currentVersion: this.config.version,
      availableVersions: Array.from(this.schemas.keys()),
      migrationHandlers: Array.from(this.migrationHandlers.keys())
    };
  }
}

/**
 * Sync Operation Serialization Utilities
 */
class SyncOperationSerializer {
  /**
   * Serialize sync operation for storage
   */
  static serialize(operation: SyncOperation): any {
    return {
      id: operation.id,
      type: operation.type,
      shoppingListId: operation.shoppingListId,
      data: operation.data,
      timestamp: operation.timestamp.toISOString(),
      retryCount: operation.retryCount,
      maxRetries: operation.maxRetries
    };
  }

  /**
   * Deserialize sync operation from storage
   */
  static deserialize(data: any): SyncOperation {
    return {
      id: data.id,
      type: data.type,
      shoppingListId: data.shoppingListId,
      data: data.data,
      timestamp: new Date(data.timestamp),
      retryCount: data.retryCount || 0,
      maxRetries: data.maxRetries || 3
    };
  }

  /**
   * Batch serialize multiple sync operations
   */
  static serializeBatch(operations: SyncOperation[]): any[] {
    return operations.map(op => this.serialize(op));
  }

  /**
   * Batch deserialize multiple sync operations
   */
  static deserializeBatch(data: any[]): SyncOperation[] {
    return data.map(item => this.deserialize(item));
  }
}

// Export singleton instance
export const dataSerializationUtil = DataSerializationUtil.getInstance();
export { DataSerializationUtil, SyncOperationSerializer };