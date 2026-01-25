/**
 * Data Validation System for PWA Offline Shopping Lists
 * Provides comprehensive validation, schema enforcement, and data migration utilities
 */

import { 
  OfflineShoppingListEntry, 
  ShoppingListMetadata,
  SyncOperation 
} from '../types/OfflineStorage.types';
import { dataIntegrityManager } from '../utils/dataIntegrity';

// Schema version for data migration
export const CURRENT_SCHEMA_VERSION = 2;

// Validation rule types
export type ValidationRule = {
  field: string;
  type: 'required' | 'type' | 'format' | 'range' | 'custom';
  validator: (value: any, context?: any) => boolean;
  message: string;
  severity: 'error' | 'warning';
};

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  schemaVersion: number;
  migrationRequired: boolean;
}

export interface ValidationError {
  field: string;
  rule: string;
  message: string;
  value: any;
  expectedType?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// Data migration result
export interface MigrationResult {
  success: boolean;
  fromVersion: number;
  toVersion: number;
  migratedData?: OfflineShoppingListEntry;
  errors: string[];
  warnings: string[];
}

// Schema definition for shopping list data
export interface ShoppingListSchema {
  version: number;
  metadata: {
    required: string[];
    optional: string[];
    types: Record<string, string>;
    formats: Record<string, RegExp>;
  };
  shoppingList: {
    categoryRules: ValidationRule[];
    itemRules: ValidationRule[];
  };
  businessRules: ValidationRule[];
}

/**
 * Data Validation System
 */
class DataValidationSystem {
  private static instance: DataValidationSystem;
  private schema: ShoppingListSchema;
  private customValidators: Map<string, (value: any, context?: any) => boolean> = new Map();

  private constructor() {
    this.schema = this.createCurrentSchema();
    this.initializeCustomValidators();
  }

  static getInstance(): DataValidationSystem {
    if (!DataValidationSystem.instance) {
      DataValidationSystem.instance = new DataValidationSystem();
    }
    return DataValidationSystem.instance;
  }

  /**
   * Validate shopping list entry against current schema
   */
  async validateShoppingListEntry(entry: any): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let migrationRequired = false;

    try {
      // Check schema version
      const entryVersion = entry.metadata?.schemaVersion || 1;
      if (entryVersion < CURRENT_SCHEMA_VERSION) {
        migrationRequired = true;
        warnings.push({
          field: 'metadata.schemaVersion',
          message: `Data schema is outdated (v${entryVersion}), migration to v${CURRENT_SCHEMA_VERSION} recommended`,
          suggestion: 'Run data migration to update to current schema'
        });
      }

      // Validate metadata
      this.validateMetadata(entry.metadata, errors, warnings);

      // Validate shopping list structure
      this.validateShoppingListStructure(entry.shoppingList, errors, warnings);

      // Validate business rules
      this.validateBusinessRules(entry, errors, warnings);

      // Run integrity check
      const integrityResult = await dataIntegrityManager.checkIntegrity(entry);
      if (!integrityResult.isValid) {
        integrityResult.errors.forEach(integrityError => {
          errors.push({
            field: integrityError.field || 'unknown',
            rule: 'integrity',
            message: integrityError.message,
            value: integrityError.actual
          });
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        schemaVersion: entryVersion,
        migrationRequired
      };

    } catch (error) {
      errors.push({
        field: 'root',
        rule: 'validation_error',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        value: entry
      });

      return {
        isValid: false,
        errors,
        warnings,
        schemaVersion: 1,
        migrationRequired: false
      };
    }
  }

  /**
   * Validate sync operation data
   */
  validateSyncOperation(operation: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields for sync operations
    const requiredFields = ['id', 'type', 'shoppingListId', 'timestamp'];
    requiredFields.forEach(field => {
      if (!operation[field]) {
        errors.push({
          field,
          rule: 'required',
          message: `Required field '${field}' is missing`,
          value: operation[field]
        });
      }
    });

    // Validate operation type
    const validTypes = ['create', 'update', 'delete', 'item_check', 'item_uncheck'];
    if (operation.type && !validTypes.includes(operation.type)) {
      errors.push({
        field: 'type',
        rule: 'enum',
        message: `Invalid operation type '${operation.type}'. Must be one of: ${validTypes.join(', ')}`,
        value: operation.type
      });
    }

    // Validate timestamp
    if (operation.timestamp) {
      const timestamp = new Date(operation.timestamp);
      if (isNaN(timestamp.getTime())) {
        errors.push({
          field: 'timestamp',
          rule: 'format',
          message: 'Invalid timestamp format',
          value: operation.timestamp
        });
      }
    }

    // Validate retry count
    if (operation.retryCount !== undefined) {
      if (typeof operation.retryCount !== 'number' || operation.retryCount < 0) {
        errors.push({
          field: 'retryCount',
          rule: 'type',
          message: 'Retry count must be a non-negative number',
          value: operation.retryCount,
          expectedType: 'number'
        });
      }

      if (operation.retryCount > 10) {
        warnings.push({
          field: 'retryCount',
          message: 'High retry count detected, operation may be failing repeatedly',
          suggestion: 'Consider investigating the cause of sync failures'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      migrationRequired: false
    };
  }

  /**
   * Migrate data from older schema versions
   */
  async migrateData(entry: any, targetVersion: number = CURRENT_SCHEMA_VERSION): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      fromVersion: entry.metadata?.schemaVersion || 1,
      toVersion: targetVersion,
      errors: [],
      warnings: []
    };

    try {
      let migratedEntry = JSON.parse(JSON.stringify(entry)); // Deep clone

      // Apply migrations step by step
      for (let version = result.fromVersion; version < targetVersion; version++) {
        const nextVersion = version + 1;
        console.log(`Migrating data from v${version} to v${nextVersion}`);

        switch (nextVersion) {
          case 2:
            migratedEntry = await this.migrateToV2(migratedEntry, result);
            break;
          // Add more migration cases as schema evolves
          default:
            result.errors.push(`No migration path from v${version} to v${nextVersion}`);
            return result;
        }
      }

      // Validate migrated data
      const validationResult = await this.validateShoppingListEntry(migratedEntry);
      if (!validationResult.isValid) {
        result.errors.push('Migrated data failed validation');
        validationResult.errors.forEach(error => {
          result.errors.push(`Validation error: ${error.message}`);
        });
        return result;
      }

      result.success = true;
      result.migratedData = migratedEntry;
      console.log(`Successfully migrated data from v${result.fromVersion} to v${result.toVersion}`);

    } catch (error) {
      result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Sanitize and normalize shopping list data
   */
  sanitizeShoppingListEntry(entry: any): OfflineShoppingListEntry {
    const sanitized = JSON.parse(JSON.stringify(entry)); // Deep clone

    // Sanitize metadata
    if (sanitized.metadata) {
      // Ensure dates are Date objects
      if (sanitized.metadata.generatedAt && typeof sanitized.metadata.generatedAt === 'string') {
        sanitized.metadata.generatedAt = new Date(sanitized.metadata.generatedAt);
      }
      if (sanitized.metadata.lastModified && typeof sanitized.metadata.lastModified === 'string') {
        sanitized.metadata.lastModified = new Date(sanitized.metadata.lastModified);
      }

      // Normalize sync status
      if (sanitized.metadata.syncStatus) {
        sanitized.metadata.syncStatus = sanitized.metadata.syncStatus.toLowerCase();
      }

      // Ensure version is a number
      if (sanitized.metadata.version && typeof sanitized.metadata.version === 'string') {
        sanitized.metadata.version = parseInt(sanitized.metadata.version, 10);
      }
    }

    // Sanitize shopping list items
    if (sanitized.shoppingList) {
      Object.keys(sanitized.shoppingList).forEach(category => {
        if (Array.isArray(sanitized.shoppingList[category])) {
          sanitized.shoppingList[category] = sanitized.shoppingList[category].map((item: any) => {
            // Ensure boolean fields are booleans
            if (typeof item.checked === 'string') {
              item.checked = item.checked.toLowerCase() === 'true';
            }

            // Ensure numeric fields are numbers
            if (typeof item.quantity === 'string' && !isNaN(Number(item.quantity))) {
              item.quantity = Number(item.quantity);
            }

            // Sanitize strings
            if (typeof item.name === 'string') {
              item.name = item.name.trim();
            }
            if (typeof item.unit === 'string') {
              item.unit = item.unit.trim();
            }

            // Ensure dates are Date objects
            if (item.lastModified && typeof item.lastModified === 'string') {
              item.lastModified = new Date(item.lastModified);
            }

            return item;
          });
        }
      });
    }

    return sanitized;
  }

  /**
   * Detect and repair common data corruption issues
   */
  async detectAndRepairCorruption(entry: any): Promise<{
    repaired: boolean;
    repairedEntry?: OfflineShoppingListEntry;
    issues: string[];
    repairs: string[];
  }> {
    const result = {
      repaired: false,
      issues: [] as string[],
      repairs: [] as string[]
    };

    let repairedEntry = JSON.parse(JSON.stringify(entry)); // Deep clone
    let hasRepairs = false;

    try {
      // Check for missing required fields and add defaults
      if (!repairedEntry.metadata) {
        repairedEntry.metadata = {};
        result.issues.push('Missing metadata object');
        result.repairs.push('Added empty metadata object');
        hasRepairs = true;
      }

      // Repair missing metadata fields
      const metadataDefaults = {
        id: `shopping-list-${Date.now()}`,
        mealPlanId: 'unknown',
        weekStartDate: new Date().toISOString().split('T')[0],
        generatedAt: new Date(),
        lastModified: new Date(),
        syncStatus: 'pending' as const,
        deviceId: 'unknown',
        version: 1,
        schemaVersion: CURRENT_SCHEMA_VERSION
      };

      Object.entries(metadataDefaults).forEach(([key, defaultValue]) => {
        if (!repairedEntry.metadata[key]) {
          repairedEntry.metadata[key] = defaultValue;
          result.issues.push(`Missing metadata.${key}`);
          result.repairs.push(`Added default value for metadata.${key}`);
          hasRepairs = true;
        }
      });

      // Repair shopping list structure
      if (!repairedEntry.shoppingList || typeof repairedEntry.shoppingList !== 'object') {
        repairedEntry.shoppingList = {};
        result.issues.push('Missing or invalid shopping list object');
        result.repairs.push('Created empty shopping list object');
        hasRepairs = true;
      }

      // Repair shopping list items
      Object.keys(repairedEntry.shoppingList).forEach(category => {
        if (!Array.isArray(repairedEntry.shoppingList[category])) {
          repairedEntry.shoppingList[category] = [];
          result.issues.push(`Invalid category array: ${category}`);
          result.repairs.push(`Reset category ${category} to empty array`);
          hasRepairs = true;
        } else {
          // Repair individual items
          repairedEntry.shoppingList[category] = repairedEntry.shoppingList[category].map((item: any, index: number) => {
            const itemDefaults = {
              id: `item-${category}-${index}-${Date.now()}`,
              name: 'Unknown Item',
              quantity: 1,
              unit: 'item',
              checked: false,
              lastModified: new Date(),
              syncStatus: 'pending' as const
            };

            let itemRepaired = false;
            Object.entries(itemDefaults).forEach(([key, defaultValue]) => {
              if (item[key] === undefined || item[key] === null) {
                item[key] = defaultValue;
                result.issues.push(`Missing ${category}[${index}].${key}`);
                result.repairs.push(`Added default value for ${category}[${index}].${key}`);
                itemRepaired = true;
              }
            });

            if (itemRepaired) {
              hasRepairs = true;
            }

            return item;
          });
        }
      });

      // Remove duplicate items within categories
      Object.keys(repairedEntry.shoppingList).forEach(category => {
        const items = repairedEntry.shoppingList[category];
        const uniqueItems = [];
        const seenIds = new Set();

        items.forEach((item: any) => {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            uniqueItems.push(item);
          } else {
            result.issues.push(`Duplicate item ID in ${category}: ${item.id}`);
            result.repairs.push(`Removed duplicate item from ${category}`);
            hasRepairs = true;
          }
        });

        repairedEntry.shoppingList[category] = uniqueItems;
      });

      if (hasRepairs) {
        result.repaired = true;
        result.repairedEntry = repairedEntry;
      }

    } catch (error) {
      result.issues.push(`Corruption detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Private validation methods
   */
  private validateMetadata(metadata: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!metadata) {
      errors.push({
        field: 'metadata',
        rule: 'required',
        message: 'Metadata object is required',
        value: metadata
      });
      return;
    }

    // Validate required fields
    this.schema.metadata.required.forEach(field => {
      if (!metadata[field]) {
        errors.push({
          field: `metadata.${field}`,
          rule: 'required',
          message: `Required metadata field '${field}' is missing`,
          value: metadata[field]
        });
      }
    });

    // Validate field types
    Object.entries(this.schema.metadata.types).forEach(([field, expectedType]) => {
      if (metadata[field] !== undefined) {
        const actualType = typeof metadata[field];
        if (actualType !== expectedType && !(expectedType === 'date' && metadata[field] instanceof Date)) {
          errors.push({
            field: `metadata.${field}`,
            rule: 'type',
            message: `Field '${field}' must be of type ${expectedType}`,
            value: metadata[field],
            expectedType
          });
        }
      }
    });

    // Validate formats
    Object.entries(this.schema.metadata.formats).forEach(([field, pattern]) => {
      if (metadata[field] && typeof metadata[field] === 'string') {
        if (!pattern.test(metadata[field])) {
          errors.push({
            field: `metadata.${field}`,
            rule: 'format',
            message: `Field '${field}' has invalid format`,
            value: metadata[field]
          });
        }
      }
    });

    // Business rule validations
    if (metadata.generatedAt && metadata.lastModified) {
      const generated = new Date(metadata.generatedAt);
      const modified = new Date(metadata.lastModified);
      
      if (modified < generated) {
        errors.push({
          field: 'metadata.lastModified',
          rule: 'business_rule',
          message: 'Last modified date cannot be before generated date',
          value: metadata.lastModified
        });
      }
    }
  }

  private validateShoppingListStructure(shoppingList: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!shoppingList || typeof shoppingList !== 'object') {
      errors.push({
        field: 'shoppingList',
        rule: 'required',
        message: 'Shopping list object is required',
        value: shoppingList
      });
      return;
    }

    // Validate each category
    Object.entries(shoppingList).forEach(([category, items]) => {
      if (!Array.isArray(items)) {
        errors.push({
          field: `shoppingList.${category}`,
          rule: 'type',
          message: `Category '${category}' must be an array`,
          value: items,
          expectedType: 'array'
        });
        return;
      }

      // Validate each item in the category
      (items as any[]).forEach((item, index) => {
        this.validateShoppingListItem(item, `shoppingList.${category}[${index}]`, errors, warnings);
      });
    });
  }

  private validateShoppingListItem(item: any, path: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Apply item validation rules
    this.schema.shoppingList.itemRules.forEach(rule => {
      const isValid = rule.validator(item[rule.field], item);
      if (!isValid) {
        if (rule.severity === 'error') {
          errors.push({
            field: `${path}.${rule.field}`,
            rule: rule.type,
            message: rule.message,
            value: item[rule.field]
          });
        } else {
          warnings.push({
            field: `${path}.${rule.field}`,
            message: rule.message
          });
        }
      }
    });
  }

  private validateBusinessRules(entry: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Apply business rules
    this.schema.businessRules.forEach(rule => {
      const isValid = rule.validator(entry[rule.field], entry);
      if (!isValid) {
        if (rule.severity === 'error') {
          errors.push({
            field: rule.field,
            rule: rule.type,
            message: rule.message,
            value: entry[rule.field]
          });
        } else {
          warnings.push({
            field: rule.field,
            message: rule.message
          });
        }
      }
    });
  }

  /**
   * Migration methods
   */
  private async migrateToV2(entry: any, result: MigrationResult): Promise<any> {
    // Migration from v1 to v2: Add schema version and enhance metadata
    if (!entry.metadata) {
      entry.metadata = {};
    }

    // Add schema version
    entry.metadata.schemaVersion = 2;

    // Add version field if missing
    if (!entry.metadata.version) {
      entry.metadata.version = 1;
    }

    // Ensure all items have syncStatus
    if (entry.shoppingList) {
      Object.keys(entry.shoppingList).forEach(category => {
        if (Array.isArray(entry.shoppingList[category])) {
          entry.shoppingList[category].forEach((item: any) => {
            if (!item.syncStatus) {
              item.syncStatus = 'pending';
            }
          });
        }
      });
    }

    result.warnings.push('Added schema version and enhanced metadata structure');
    return entry;
  }

  /**
   * Schema definition
   */
  private createCurrentSchema(): ShoppingListSchema {
    return {
      version: CURRENT_SCHEMA_VERSION,
      metadata: {
        required: ['id', 'mealPlanId', 'weekStartDate', 'generatedAt', 'lastModified', 'syncStatus', 'deviceId'],
        optional: ['version', 'schemaVersion'],
        types: {
          id: 'string',
          mealPlanId: 'string',
          weekStartDate: 'string',
          generatedAt: 'date',
          lastModified: 'date',
          syncStatus: 'string',
          deviceId: 'string',
          version: 'number',
          schemaVersion: 'number'
        },
        formats: {
          id: /^[a-zA-Z0-9_-]+$/,
          weekStartDate: /^\d{4}-\d{2}-\d{2}$/,
          syncStatus: /^(synced|pending|conflict)$/
        }
      },
      shoppingList: {
        categoryRules: [],
        itemRules: [
          {
            field: 'id',
            type: 'required',
            validator: (value) => typeof value === 'string' && value.length > 0,
            message: 'Item ID is required and must be a non-empty string',
            severity: 'error'
          },
          {
            field: 'name',
            type: 'required',
            validator: (value) => typeof value === 'string' && value.trim().length > 0,
            message: 'Item name is required and must be a non-empty string',
            severity: 'error'
          },
          {
            field: 'quantity',
            type: 'type',
            validator: (value) => typeof value === 'number' && value > 0,
            message: 'Item quantity must be a positive number',
            severity: 'error'
          },
          {
            field: 'checked',
            type: 'type',
            validator: (value) => typeof value === 'boolean',
            message: 'Item checked status must be a boolean',
            severity: 'error'
          }
        ]
      },
      businessRules: [
        {
          field: 'shoppingList',
          type: 'custom',
          validator: (value) => {
            if (!value || typeof value !== 'object') return false;
            const totalItems = Object.values(value).reduce((sum: number, items: any) => 
              sum + (Array.isArray(items) ? items.length : 0), 0);
            return totalItems > 0;
          },
          message: 'Shopping list must contain at least one item',
          severity: 'warning'
        }
      ]
    };
  }

  /**
   * Initialize custom validators
   */
  private initializeCustomValidators(): void {
    this.customValidators.set('uuid', (value: string) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(value);
    });

    this.customValidators.set('email', (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    });

    this.customValidators.set('positiveNumber', (value: number) => {
      return typeof value === 'number' && value > 0;
    });
  }

  /**
   * Add custom validator
   */
  addCustomValidator(name: string, validator: (value: any, context?: any) => boolean): void {
    this.customValidators.set(name, validator);
  }

  /**
   * Get validation schema
   */
  getSchema(): ShoppingListSchema {
    return JSON.parse(JSON.stringify(this.schema));
  }

  /**
   * Update schema (use with caution)
   */
  updateSchema(newSchema: Partial<ShoppingListSchema>): void {
    this.schema = { ...this.schema, ...newSchema };
  }
}

// Export singleton instance
export const dataValidationSystem = DataValidationSystem.getInstance();
export { DataValidationSystem };