import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounce } from './useDebounce';

export interface AutoSaveStatus {
  status: 'idle' | 'saving' | 'saved' | 'error' | 'offline';
  lastSaved: Date | null;
  error: string | null;
  pendingChanges: boolean;
}

export interface UseAutoSaveOptions {
  debounceMs?: number;
  onSave: () => Promise<void>;
  onError?: (error: any) => void;
  enabled?: boolean;
}

export const useAutoSave = ({
  debounceMs = 2000,
  onSave,
  onError,
  enabled = true,
}: UseAutoSaveOptions) => {
  const [status, setStatus] = useState<AutoSaveStatus>({
    status: 'idle',
    lastSaved: null,
    error: null,
    pendingChanges: false,
  });

  const [pendingChanges, setPendingChanges] = useState(false);
  const debouncedPendingChanges = useDebounce(pendingChanges, debounceMs);
  
  // Track if we're currently online
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Track the last save attempt to prevent duplicate saves
  const lastSaveAttemptRef = useRef<number>(0);
  const saveInProgressRef = useRef(false);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setStatus(prev => ({
        ...prev,
        status: prev.status === 'offline' ? 'idle' : prev.status,
        error: prev.status === 'offline' ? null : prev.error,
      }));
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatus(prev => ({
        ...prev,
        status: 'offline',
        error: 'You are currently offline. Changes will be saved when connection is restored.',
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-save when debounced changes are detected
  useEffect(() => {
    if (!enabled || !debouncedPendingChanges || !isOnline || saveInProgressRef.current) {
      return;
    }

    const saveChanges = async () => {
      const saveAttemptTime = Date.now();
      lastSaveAttemptRef.current = saveAttemptTime;
      saveInProgressRef.current = true;

      setStatus(prev => ({
        ...prev,
        status: 'saving',
        error: null,
      }));

      try {
        await onSave();
        
        // Only update status if this is still the latest save attempt
        if (lastSaveAttemptRef.current === saveAttemptTime) {
          setStatus(prev => ({
            ...prev,
            status: 'saved',
            lastSaved: new Date(),
            error: null,
            pendingChanges: false,
          }));
          setPendingChanges(false);
        }
      } catch (error) {
        // Only update status if this is still the latest save attempt
        if (lastSaveAttemptRef.current === saveAttemptTime) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to save changes';
          setStatus(prev => ({
            ...prev,
            status: 'error',
            error: errorMessage,
          }));
          
          if (onError) {
            onError(error);
          }
        }
      } finally {
        saveInProgressRef.current = false;
      }
    };

    saveChanges();
  }, [debouncedPendingChanges, enabled, isOnline, onSave, onError]);

  // Function to trigger a save (mark as having pending changes)
  const triggerSave = useCallback(() => {
    if (!enabled) return;
    
    setPendingChanges(true);
    setStatus(prev => ({
      ...prev,
      pendingChanges: true,
      status: prev.status === 'saved' ? 'idle' : prev.status,
    }));
  }, [enabled]);

  // Function to manually force a save (bypasses debounce)
  const forceSave = useCallback(async () => {
    if (!enabled || !isOnline || saveInProgressRef.current) {
      return;
    }

    const saveAttemptTime = Date.now();
    lastSaveAttemptRef.current = saveAttemptTime;
    saveInProgressRef.current = true;

    setStatus(prev => ({
      ...prev,
      status: 'saving',
      error: null,
    }));

    try {
      await onSave();
      
      if (lastSaveAttemptRef.current === saveAttemptTime) {
        setStatus(prev => ({
          ...prev,
          status: 'saved',
          lastSaved: new Date(),
          error: null,
          pendingChanges: false,
        }));
        setPendingChanges(false);
      }
    } catch (error) {
      if (lastSaveAttemptRef.current === saveAttemptTime) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to save changes';
        setStatus(prev => ({
          ...prev,
          status: 'error',
          error: errorMessage,
        }));
        
        if (onError) {
          onError(error);
        }
      }
    } finally {
      saveInProgressRef.current = false;
    }
  }, [enabled, isOnline, onSave, onError]);

  // Function to clear the error state
  const clearError = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      status: prev.status === 'error' ? 'idle' : prev.status,
      error: null,
    }));
  }, []);

  // Function to reset the auto-save state
  const reset = useCallback(() => {
    setPendingChanges(false);
    setStatus({
      status: 'idle',
      lastSaved: null,
      error: null,
      pendingChanges: false,
    });
  }, []);

  return {
    status,
    isOnline,
    triggerSave,
    forceSave,
    clearError,
    reset,
  };
};