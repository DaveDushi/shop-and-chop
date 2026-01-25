import { useState, useEffect, useCallback } from 'react';
import { PWAInstallationState } from '../types/OfflineStorage.types';
import { pwaManager } from '../services/pwaManager';

interface UsePWAInstallationReturn {
  // Installation state
  canInstall: boolean;
  isInstalled: boolean;
  isInstallationRecommended: boolean;
  
  // Actions
  showInstallPrompt: () => Promise<boolean>;
  incrementUsageCount: () => void;
  resetPromptAttempts: () => void;
  
  // Metrics
  getInstallationMetrics: () => any;
  
  // State
  installationState: PWAInstallationState;
}

export const usePWAInstallation = (): UsePWAInstallationReturn => {
  const [installationState, setInstallationState] = useState<PWAInstallationState>({
    canInstall: false,
    isInstalled: false
  });

  // Handle installation state changes
  const handleInstallationStateChange = useCallback((state: PWAInstallationState) => {
    setInstallationState(state);
  }, []);

  // Show installation prompt
  const showInstallPrompt = useCallback(async (): Promise<boolean> => {
    try {
      return await pwaManager.showInstallPrompt();
    } catch (error) {
      console.error('Failed to show install prompt:', error);
      return false;
    }
  }, []);

  // Increment usage count
  const incrementUsageCount = useCallback(() => {
    pwaManager.incrementUsageCount();
  }, []);

  // Reset prompt attempts
  const resetPromptAttempts = useCallback(() => {
    pwaManager.resetPromptAttempts();
  }, []);

  // Get installation metrics
  const getInstallationMetrics = useCallback(() => {
    return pwaManager.getInstallationMetrics();
  }, []);

  // Check if installation is recommended
  const isInstallationRecommended = useCallback(() => {
    return pwaManager.isInstallationRecommended();
  }, []);

  useEffect(() => {
    // Get initial state
    setInstallationState(pwaManager.getInstallationState());

    // Listen for state changes
    pwaManager.onInstallationStateChange(handleInstallationStateChange);

    // Increment usage count on mount
    pwaManager.incrementUsageCount();

    // Cleanup listener on unmount
    return () => {
      pwaManager.offInstallationStateChange(handleInstallationStateChange);
    };
  }, [handleInstallationStateChange]);

  return {
    // Installation state
    canInstall: installationState.canInstall,
    isInstalled: installationState.isInstalled,
    isInstallationRecommended: isInstallationRecommended(),
    
    // Actions
    showInstallPrompt,
    incrementUsageCount,
    resetPromptAttempts,
    
    // Metrics
    getInstallationMetrics,
    
    // State
    installationState
  };
};

export default usePWAInstallation;