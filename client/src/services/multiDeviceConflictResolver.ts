/**
 * Multi-Device Conflict Resolution System
 * Implements intelligent conflict resolution algorithms for simultaneous offline edits
 * across multiple devices, with merge strategies for shopping list changes
 * 
 * Features:
 * - Intelligent conflict resolution algorithms
 * - Conflict detection for simultaneous offline edits
 * - Merge strategies for shopping list changes
 * - Operational transformation for concurrent edits
 * - Conflict history tracking and learning
 * - User preference-based resolution
 */

import {
  OfflineShoppingListEntry,
  OfflineShoppingListItem,
  ShoppingListMetadata,
  OfflineStorageError
} from '../types/OfflineStorage.types';
import { offlineStorageManager } from './offlineStorageManager';

interface ConflictResolutionStrategy {
  name: string;
  priority: number;
  description: string;
  canResolve: (conflict: MultiDeviceConflict) => boolean;
  resolve: (conflict: MultiDeviceConflict) => Promise<ConflictResolution>;
}

interface MultiDeviceConflict {
  id: string;
  shoppingListId: string;
  conflictType: 'item-state' | 'item-addition' | 'item-removal' | 'list-structure' | 'metadata';
  devices: ConflictingDevice[];
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
  autoResolvable: boolean;
  context: ConflictContext;
}

interface ConflictingDevice {
  deviceId: string;
  deviceName: string;
  data: OfflineShoppingListEntry;
  lastModified: Date;
  changesSince: Date;
  operationHistory: DeviceOperation[];
}

interface DeviceOperation {
  id: string;
  type: 'item_check' | 'item_uncheck' | 'item_add' | 'item_remove' | 'item_modify';
  itemId?: string;
  category?: string;
  timestamp: Date;
  data: any;
}

interface ConflictContext {
  timeWindow: number; // milliseconds between conflicting operations
  affectedItems: string[];
  affectedCategories: string[];
  userPreferences?: ConflictResolutionPreferences;
}

interface ConflictResolutionPreferences {
  preferredStrategy: 'timestamp' | 'device-priority' | 'merge' | 'user-choice';
  devicePriority: string[]; // ordered list of device IDs by priority
  autoResolveThreshold: 'low' | 'medium' | 'high';
  preserveCheckedItems: boolean;
  preserveAddedItems: boolean;
}

interface ConflictResolution {
  strategy: string;
  resolvedData: OfflineShoppingListEntry;
  confidence: number; // 0-1 scale
  requiresUserConfirmation: boolean;
  explanation: string;
  appliedOperations: DeviceOperation[];
  discardedOperations: DeviceOperation[];
}

interface MergeResult {
  success: boolean;
  mergedList: OfflineShoppingListEntry;
  conflicts: ItemConflict[];
  warnings: string[];
}

interface ItemConflict {
  itemId: string;
  category: string;
  conflictType: 'state' | 'quantity' | 'existence';
  devices: string[];
  resolution: 'merged' | 'device-priority' | 'user-required';
}

export class MultiDeviceConflictResolver {
  private strategies: ConflictResolutionStrategy[] = [];
  private conflictHistory: Map<string, MultiDeviceConflict[]> = new Map();
  private userPreferences: ConflictResolutionPreferences = {
    preferredStrategy: 'merge',
    devicePriority: [],
    autoResolveThreshold: 'medium',
    preserveCheckedItems: true,
    preserveAddedItems: true
  };

  constructor() {
    this.initializeStrategies();
  }

  /**
   * Initialize conflict resolution strategies
   */
  private initializeStrategies(): void {
    this.strategies = [
      {
        name: 'timestamp-based',
        priority: 1,
        description: 'Resolve conflicts based on most recent timestamp',
        canResolve: (conflict) => conflict.severity !== 'high',
        resolve: this.resolveByTimestamp.bind(this)
      },
      {
        name: 'intelligent-merge',
        priority: 2,
        description: 'Merge changes intelligently based on operation types',
        canResolve: (conflict) => conflict.conflictType !== 'list-structure',
        resolve: this.resolveByIntelligentMerge.bind(this)
      },
      {
        name: 'operational-transform',
        priority: 3,
        description: 'Apply operational transformation for concurrent edits',
        canResolve: (conflict) => conflict.devices.length === 2,
        resolve: this.resolveByOperationalTransform.bind(this)
      },
      {
        name: 'device-priority',
        priority: 4,
        description: 'Resolve based on device priority preferences',
        canResolve: (conflict) => this.userPreferences.devicePriority.length > 0,
        resolve: this.resolveByDevicePriority.bind(this)
      },
      {
        name: 'user-preference',
        priority: 5,
        description: 'Apply user-defined conflict resolution preferences',
        canResolve: () => true,
        resolve: this.resolveByUserPreference.bind(this)
      }
    ];

    // Sort strategies by priority
    this.strategies.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Detect conflicts between multiple device versions
   */
  async detectConflicts(
    shoppingListId: string,
    deviceVersions: ConflictingDevice[]
  ): Promise<MultiDeviceConflict[]> {
    const conflicts: MultiDeviceConflict[] = [];

    try {
      // Group devices by modification time to identify simultaneous edits
      const timeGroups = this.groupDevicesByTime(deviceVersions, 30000); // 30 second window

      for (const timeGroup of timeGroups) {
        if (timeGroup.length > 1) {
          // Multiple devices modified within the same time window
          const conflict = await this.analyzeDeviceConflict(shoppingListId, timeGroup);
          if (conflict) {
            conflicts.push(conflict);
          }
        }
      }

      // Store conflicts in history
      this.conflictHistory.set(shoppingListId, conflicts);

      return conflicts;
    } catch (error) {
      console.error('Failed to detect conflicts:', error);
      return [];
    }
  }

  /**
   * Resolve a multi-device conflict
   */
  async resolveConflict(conflict: MultiDeviceConflict): Promise<ConflictResolution> {
    try {
      console.log(`Resolving conflict ${conflict.id} using available strategies`);

      // Find the best strategy for this conflict
      const strategy = this.findBestStrategy(conflict);
      
      if (!strategy) {
        throw new Error('No suitable conflict resolution strategy found');
      }

      console.log(`Using strategy: ${strategy.name}`);
      const resolution = await strategy.resolve(conflict);

      // Validate resolution
      if (!this.validateResolution(resolution)) {
        throw new Error('Invalid conflict resolution generated');
      }

      // Apply resolution if confidence is high enough
      if (resolution.confidence >= 0.8 && !resolution.requiresUserConfirmation) {
        await this.applyResolution(conflict.shoppingListId, resolution);
      }

      return resolution;
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      throw error;
    }
  }

  /**
   * Resolve conflict by timestamp (most recent wins)
   */
  private async resolveByTimestamp(conflict: MultiDeviceConflict): Promise<ConflictResolution> {
    const mostRecentDevice = conflict.devices.reduce((latest, current) => 
      current.lastModified > latest.lastModified ? current : latest
    );

    return {
      strategy: 'timestamp-based',
      resolvedData: mostRecentDevice.data,
      confidence: 0.7,
      requiresUserConfirmation: conflict.severity === 'high',
      explanation: `Applied changes from ${mostRecentDevice.deviceName} (most recent)`,
      appliedOperations: mostRecentDevice.operationHistory,
      discardedOperations: conflict.devices
        .filter(d => d.deviceId !== mostRecentDevice.deviceId)
        .flatMap(d => d.operationHistory)
    };
  }

  /**
   * Resolve conflict by intelligent merge
   */
  private async resolveByIntelligentMerge(conflict: MultiDeviceConflict): Promise<ConflictResolution> {
    try {
      const mergeResult = await this.performIntelligentMerge(conflict.devices);
      
      return {
        strategy: 'intelligent-merge',
        resolvedData: mergeResult.mergedList,
        confidence: mergeResult.success ? 0.9 : 0.6,
        requiresUserConfirmation: !mergeResult.success || mergeResult.conflicts.length > 0,
        explanation: this.generateMergeExplanation(mergeResult),
        appliedOperations: this.getAllOperations(conflict.devices),
        discardedOperations: []
      };
    } catch (error) {
      throw new Error(`Intelligent merge failed: ${error.message}`);
    }
  }

  /**
   * Perform intelligent merge of device data
   */
  private async performIntelligentMerge(devices: ConflictingDevice[]): Promise<MergeResult> {
    const result: MergeResult = {
      success: true,
      mergedList: devices[0].data, // Start with first device as base
      conflicts: [],
      warnings: []
    };

    try {
      // Create a base merged list from the first device
      const baseList = JSON.parse(JSON.stringify(devices[0].data));
      const mergedShoppingList = { ...baseList.shoppingList };

      // Track all items across devices
      const itemTracker = new Map<string, {
        category: string;
        versions: Array<{ deviceId: string; item: OfflineShoppingListItem; timestamp: Date }>;
      }>();

      // Collect all items from all devices
      for (const device of devices) {
        Object.entries(device.data.shoppingList).forEach(([category, items]) => {
          items.forEach(item => {
            const key = `${category}:${item.id}`;
            if (!itemTracker.has(key)) {
              itemTracker.set(key, { category, versions: [] });
            }
            itemTracker.get(key)!.versions.push({
              deviceId: device.deviceId,
              item,
              timestamp: device.lastModified
            });
          });
        });
      }

      // Merge each item intelligently
      for (const [itemKey, itemData] of itemTracker) {
        const { category, versions } = itemData;
        
        if (versions.length === 1) {
          // No conflict, use the single version
          if (!mergedShoppingList[category]) {
            mergedShoppingList[category] = [];
          }
          mergedShoppingList[category].push(versions[0].item);
        } else {
          // Multiple versions, need to merge
          const mergedItem = await this.mergeItemVersions(versions);
          
          if (mergedItem.conflict) {
            result.conflicts.push({
              itemId: versions[0].item.id,
              category,
              conflictType: mergedItem.conflictType!,
              devices: versions.map(v => v.deviceId),
              resolution: mergedItem.resolution!
            });
          }

          if (!mergedShoppingList[category]) {
            mergedShoppingList[category] = [];
          }
          mergedShoppingList[category].push(mergedItem.item);
        }
      }

      // Update the merged list
      result.mergedList = {
        ...baseList,
        shoppingList: mergedShoppingList,
        metadata: {
          ...baseList.metadata,
          lastModified: new Date(),
          syncStatus: 'synced' as const,
          version: Math.max(...devices.map(d => d.data.metadata.version || 0)) + 1
        }
      };

      result.success = result.conflicts.length === 0;
      return result;
    } catch (error) {
      result.success = false;
      result.warnings.push(`Merge failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Merge multiple versions of the same item
   */
  private async mergeItemVersions(versions: Array<{
    deviceId: string;
    item: OfflineShoppingListItem;
    timestamp: Date;
  }>): Promise<{
    item: OfflineShoppingListItem;
    conflict: boolean;
    conflictType?: 'state' | 'quantity' | 'existence';
    resolution?: 'merged' | 'device-priority' | 'user-required';
  }> {
    // Sort versions by timestamp (most recent first)
    const sortedVersions = versions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const mostRecent = sortedVersions[0];
    
    // Check for conflicts
    const hasStateConflict = versions.some(v => v.item.checked !== mostRecent.item.checked);
    const hasQuantityConflict = versions.some(v => 
      v.item.quantity !== mostRecent.item.quantity || v.item.unit !== mostRecent.item.unit
    );

    if (!hasStateConflict && !hasQuantityConflict) {
      // No conflicts, use most recent
      return {
        item: mostRecent.item,
        conflict: false
      };
    }

    // Resolve conflicts based on preferences
    let resolvedItem = { ...mostRecent.item };
    let conflictType: 'state' | 'quantity' | 'existence' = 'state';
    let resolution: 'merged' | 'device-priority' | 'user-required' = 'merged';

    if (hasStateConflict) {
      // For checked state conflicts, prefer checked items if user preference is set
      if (this.userPreferences.preserveCheckedItems) {
        const checkedVersion = versions.find(v => v.item.checked);
        if (checkedVersion) {
          resolvedItem.checked = true;
          resolvedItem.lastModified = checkedVersion.timestamp;
        }
      }
      conflictType = 'state';
    }

    if (hasQuantityConflict) {
      // For quantity conflicts, use the most recent non-zero quantity
      const nonZeroQuantity = sortedVersions.find(v => 
        v.item.quantity && v.item.quantity !== '0' && v.item.quantity !== ''
      );
      if (nonZeroQuantity) {
        resolvedItem.quantity = nonZeroQuantity.item.quantity;
        resolvedItem.unit = nonZeroQuantity.item.unit;
      }
      conflictType = 'quantity';
    }

    return {
      item: resolvedItem,
      conflict: true,
      conflictType,
      resolution
    };
  }

  /**
   * Resolve conflict by operational transformation
   */
  private async resolveByOperationalTransform(conflict: MultiDeviceConflict): Promise<ConflictResolution> {
    if (conflict.devices.length !== 2) {
      throw new Error('Operational transformation requires exactly 2 devices');
    }

    const [device1, device2] = conflict.devices;
    const transformedOperations = await this.transformOperations(
      device1.operationHistory,
      device2.operationHistory
    );

    // Apply transformed operations to create resolved state
    const resolvedData = await this.applyTransformedOperations(
      device1.data,
      transformedOperations
    );

    return {
      strategy: 'operational-transform',
      resolvedData,
      confidence: 0.85,
      requiresUserConfirmation: false,
      explanation: 'Applied operational transformation to merge concurrent edits',
      appliedOperations: transformedOperations,
      discardedOperations: []
    };
  }

  /**
   * Transform operations for concurrent execution
   */
  private async transformOperations(
    ops1: DeviceOperation[],
    ops2: DeviceOperation[]
  ): Promise<DeviceOperation[]> {
    // Simplified operational transformation
    // In a real implementation, this would be more sophisticated
    const allOps = [...ops1, ...ops2].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Remove duplicate operations on the same item
    const uniqueOps = allOps.filter((op, index, arr) => {
      const laterOp = arr.slice(index + 1).find(laterOp => 
        laterOp.itemId === op.itemId && laterOp.type === op.type
      );
      return !laterOp;
    });

    return uniqueOps;
  }

  /**
   * Apply transformed operations to base data
   */
  private async applyTransformedOperations(
    baseData: OfflineShoppingListEntry,
    operations: DeviceOperation[]
  ): Promise<OfflineShoppingListEntry> {
    const result = JSON.parse(JSON.stringify(baseData));
    
    for (const op of operations) {
      switch (op.type) {
        case 'item_check':
        case 'item_uncheck':
          await this.applyItemStateOperation(result, op);
          break;
        case 'item_add':
          await this.applyItemAddOperation(result, op);
          break;
        case 'item_remove':
          await this.applyItemRemoveOperation(result, op);
          break;
        case 'item_modify':
          await this.applyItemModifyOperation(result, op);
          break;
      }
    }

    result.metadata.lastModified = new Date();
    result.metadata.version = (result.metadata.version || 0) + 1;
    
    return result;
  }

  /**
   * Apply item state operation (check/uncheck)
   */
  private async applyItemStateOperation(
    data: OfflineShoppingListEntry,
    operation: DeviceOperation
  ): Promise<void> {
    if (!operation.itemId || !operation.category) return;

    const category = data.shoppingList[operation.category];
    if (!category) return;

    const item = category.find(item => item.id === operation.itemId);
    if (item) {
      item.checked = operation.type === 'item_check';
      item.lastModified = operation.timestamp;
      item.syncStatus = 'pending';
    }
  }

  /**
   * Apply item add operation
   */
  private async applyItemAddOperation(
    data: OfflineShoppingListEntry,
    operation: DeviceOperation
  ): Promise<void> {
    if (!operation.category || !operation.data) return;

    if (!data.shoppingList[operation.category]) {
      data.shoppingList[operation.category] = [];
    }

    // Check if item already exists
    const existingItem = data.shoppingList[operation.category].find(
      item => item.id === operation.data.id
    );

    if (!existingItem) {
      data.shoppingList[operation.category].push({
        ...operation.data,
        lastModified: operation.timestamp,
        syncStatus: 'pending' as const
      });
    }
  }

  /**
   * Apply item remove operation
   */
  private async applyItemRemoveOperation(
    data: OfflineShoppingListEntry,
    operation: DeviceOperation
  ): Promise<void> {
    if (!operation.itemId || !operation.category) return;

    const category = data.shoppingList[operation.category];
    if (!category) return;

    const itemIndex = category.findIndex(item => item.id === operation.itemId);
    if (itemIndex >= 0) {
      category.splice(itemIndex, 1);
    }
  }

  /**
   * Apply item modify operation
   */
  private async applyItemModifyOperation(
    data: OfflineShoppingListEntry,
    operation: DeviceOperation
  ): Promise<void> {
    if (!operation.itemId || !operation.category || !operation.data) return;

    const category = data.shoppingList[operation.category];
    if (!category) return;

    const item = category.find(item => item.id === operation.itemId);
    if (item) {
      Object.assign(item, operation.data, {
        lastModified: operation.timestamp,
        syncStatus: 'pending' as const
      });
    }
  }

  /**
   * Resolve conflict by device priority
   */
  private async resolveByDevicePriority(conflict: MultiDeviceConflict): Promise<ConflictResolution> {
    const priorityOrder = this.userPreferences.devicePriority;
    
    // Find the highest priority device in the conflict
    let highestPriorityDevice = conflict.devices[0];
    let highestPriority = priorityOrder.indexOf(highestPriorityDevice.deviceId);
    
    for (const device of conflict.devices) {
      const priority = priorityOrder.indexOf(device.deviceId);
      if (priority >= 0 && (highestPriority < 0 || priority < highestPriority)) {
        highestPriorityDevice = device;
        highestPriority = priority;
      }
    }

    return {
      strategy: 'device-priority',
      resolvedData: highestPriorityDevice.data,
      confidence: 0.8,
      requiresUserConfirmation: false,
      explanation: `Applied changes from ${highestPriorityDevice.deviceName} (highest priority)`,
      appliedOperations: highestPriorityDevice.operationHistory,
      discardedOperations: conflict.devices
        .filter(d => d.deviceId !== highestPriorityDevice.deviceId)
        .flatMap(d => d.operationHistory)
    };
  }

  /**
   * Resolve conflict by user preference
   */
  private async resolveByUserPreference(conflict: MultiDeviceConflict): Promise<ConflictResolution> {
    switch (this.userPreferences.preferredStrategy) {
      case 'timestamp':
        return this.resolveByTimestamp(conflict);
      case 'device-priority':
        return this.resolveByDevicePriority(conflict);
      case 'merge':
        return this.resolveByIntelligentMerge(conflict);
      default:
        return {
          strategy: 'user-choice',
          resolvedData: conflict.devices[0].data,
          confidence: 0.5,
          requiresUserConfirmation: true,
          explanation: 'Manual user resolution required',
          appliedOperations: [],
          discardedOperations: []
        };
    }
  }

  /**
   * Group devices by modification time
   */
  private groupDevicesByTime(devices: ConflictingDevice[], windowMs: number): ConflictingDevice[][] {
    const groups: ConflictingDevice[][] = [];
    const sortedDevices = devices.sort((a, b) => a.lastModified.getTime() - b.lastModified.getTime());

    let currentGroup: ConflictingDevice[] = [];
    let groupStartTime = 0;

    for (const device of sortedDevices) {
      const deviceTime = device.lastModified.getTime();
      
      if (currentGroup.length === 0 || deviceTime - groupStartTime <= windowMs) {
        if (currentGroup.length === 0) {
          groupStartTime = deviceTime;
        }
        currentGroup.push(device);
      } else {
        groups.push(currentGroup);
        currentGroup = [device];
        groupStartTime = deviceTime;
      }
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Analyze device conflict to create conflict object
   */
  private async analyzeDeviceConflict(
    shoppingListId: string,
    devices: ConflictingDevice[]
  ): Promise<MultiDeviceConflict | null> {
    try {
      // Determine conflict type and severity
      const conflictType = this.determineConflictType(devices);
      const severity = this.calculateConflictSeverity(devices);
      const context = this.buildConflictContext(devices);

      return {
        id: `conflict_${shoppingListId}_${Date.now()}`,
        shoppingListId,
        conflictType,
        devices,
        timestamp: new Date(),
        severity,
        autoResolvable: severity !== 'high',
        context
      };
    } catch (error) {
      console.error('Failed to analyze device conflict:', error);
      return null;
    }
  }

  /**
   * Determine the type of conflict
   */
  private determineConflictType(devices: ConflictingDevice[]): MultiDeviceConflict['conflictType'] {
    // Analyze the differences between device data
    const firstDevice = devices[0];
    
    for (let i = 1; i < devices.length; i++) {
      const otherDevice = devices[i];
      
      // Check for structural differences
      const firstCategories = Object.keys(firstDevice.data.shoppingList);
      const otherCategories = Object.keys(otherDevice.data.shoppingList);
      
      if (firstCategories.length !== otherCategories.length) {
        return 'list-structure';
      }
      
      // Check for item-level differences
      for (const category of firstCategories) {
        const firstItems = firstDevice.data.shoppingList[category] || [];
        const otherItems = otherDevice.data.shoppingList[category] || [];
        
        if (firstItems.length !== otherItems.length) {
          return 'item-addition';
        }
        
        // Check for state differences
        for (const item of firstItems) {
          const otherItem = otherItems.find(other => other.id === item.id);
          if (otherItem && item.checked !== otherItem.checked) {
            return 'item-state';
          }
        }
      }
    }
    
    return 'metadata';
  }

  /**
   * Calculate conflict severity
   */
  private calculateConflictSeverity(devices: ConflictingDevice[]): 'low' | 'medium' | 'high' {
    const deviceCount = devices.length;
    const timeSpread = Math.max(...devices.map(d => d.lastModified.getTime())) - 
                     Math.min(...devices.map(d => d.lastModified.getTime()));
    
    // High severity: many devices or very close timing
    if (deviceCount > 3 || timeSpread < 5000) { // 5 seconds
      return 'high';
    }
    
    // Medium severity: moderate conditions
    if (deviceCount > 2 || timeSpread < 30000) { // 30 seconds
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Build conflict context
   */
  private buildConflictContext(devices: ConflictingDevice[]): ConflictContext {
    const timeSpread = Math.max(...devices.map(d => d.lastModified.getTime())) - 
                      Math.min(...devices.map(d => d.lastModified.getTime()));
    
    const affectedItems = new Set<string>();
    const affectedCategories = new Set<string>();
    
    devices.forEach(device => {
      Object.entries(device.data.shoppingList).forEach(([category, items]) => {
        affectedCategories.add(category);
        items.forEach(item => affectedItems.add(item.id));
      });
    });
    
    return {
      timeWindow: timeSpread,
      affectedItems: Array.from(affectedItems),
      affectedCategories: Array.from(affectedCategories),
      userPreferences: this.userPreferences
    };
  }

  /**
   * Find the best strategy for resolving a conflict
   */
  private findBestStrategy(conflict: MultiDeviceConflict): ConflictResolutionStrategy | null {
    return this.strategies.find(strategy => strategy.canResolve(conflict)) || null;
  }

  /**
   * Validate conflict resolution
   */
  private validateResolution(resolution: ConflictResolution): boolean {
    return (
      resolution.resolvedData &&
      resolution.resolvedData.metadata &&
      resolution.resolvedData.shoppingList &&
      resolution.confidence >= 0 &&
      resolution.confidence <= 1 &&
      resolution.explanation &&
      resolution.strategy
    );
  }

  /**
   * Apply resolution to storage
   */
  private async applyResolution(shoppingListId: string, resolution: ConflictResolution): Promise<void> {
    try {
      await offlineStorageManager.updateShoppingList(shoppingListId, resolution.resolvedData);
      console.log(`Applied conflict resolution for shopping list ${shoppingListId}`);
    } catch (error) {
      console.error('Failed to apply conflict resolution:', error);
      throw error;
    }
  }

  /**
   * Generate merge explanation
   */
  private generateMergeExplanation(mergeResult: MergeResult): string {
    if (mergeResult.success && mergeResult.conflicts.length === 0) {
      return 'Successfully merged all changes without conflicts';
    }
    
    const conflictCount = mergeResult.conflicts.length;
    const warningCount = mergeResult.warnings.length;
    
    let explanation = `Merged changes with ${conflictCount} conflicts`;
    if (warningCount > 0) {
      explanation += ` and ${warningCount} warnings`;
    }
    
    return explanation;
  }

  /**
   * Get all operations from devices
   */
  private getAllOperations(devices: ConflictingDevice[]): DeviceOperation[] {
    return devices.flatMap(device => device.operationHistory);
  }

  /**
   * Configuration methods
   */
  setUserPreferences(preferences: Partial<ConflictResolutionPreferences>): void {
    this.userPreferences = { ...this.userPreferences, ...preferences };
  }

  getUserPreferences(): ConflictResolutionPreferences {
    return { ...this.userPreferences };
  }

  getConflictHistory(shoppingListId?: string): MultiDeviceConflict[] {
    if (shoppingListId) {
      return this.conflictHistory.get(shoppingListId) || [];
    }
    
    return Array.from(this.conflictHistory.values()).flat();
  }

  clearConflictHistory(shoppingListId?: string): void {
    if (shoppingListId) {
      this.conflictHistory.delete(shoppingListId);
    } else {
      this.conflictHistory.clear();
    }
  }
}

// Export singleton instance
export const multiDeviceConflictResolver = new MultiDeviceConflictResolver();
export default multiDeviceConflictResolver;