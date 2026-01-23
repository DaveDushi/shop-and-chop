import React, { useEffect, useRef } from 'react';

export interface LiveRegionProps {
  message: string;
  priority?: 'polite' | 'assertive';
  clearAfter?: number; // Clear message after X milliseconds
  className?: string;
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
  message,
  priority = 'polite',
  clearAfter = 5000,
  className = '',
}) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout to clear message
    if (message && clearAfter > 0) {
      timeoutRef.current = setTimeout(() => {
        // Message will be cleared by parent component
      }, clearAfter);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, clearAfter]);

  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className={`sr-only ${className}`}
      role="status"
    >
      {message}
    </div>
  );
};

// Hook for managing live region announcements
export const useLiveRegion = () => {
  const [message, setMessage] = React.useState('');
  const [priority, setPriority] = React.useState<'polite' | 'assertive'>('polite');

  const announce = React.useCallback((
    text: string, 
    announcementPriority: 'polite' | 'assertive' = 'polite'
  ) => {
    setPriority(announcementPriority);
    setMessage(text);
    
    // Clear message after announcement
    setTimeout(() => setMessage(''), 100);
  }, []);

  const clear = React.useCallback(() => {
    setMessage('');
  }, []);

  return {
    message,
    priority,
    announce,
    clear,
    LiveRegionComponent: () => (
      <LiveRegion message={message} priority={priority} />
    ),
  };
};