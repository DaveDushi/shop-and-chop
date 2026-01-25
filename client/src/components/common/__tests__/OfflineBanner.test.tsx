import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { OfflineBanner } from '../OfflineBanner';

describe('OfflineBanner', () => {
  it('should not render when online with no pending operations', () => {
    const { container } = render(
      <OfflineBanner
        isOnline={true}
        pendingOperations={0}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('should render offline status when offline', () => {
    render(
      <OfflineBanner
        isOnline={false}
        pendingOperations={0}
      />
    );
    
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('should render pending operations count when offline', () => {
    render(
      <OfflineBanner
        isOnline={false}
        pendingOperations={3}
      />
    );
    
    expect(screen.getByText('Offline - 3 changes pending')).toBeInTheDocument();
    expect(screen.getByText('Changes will sync when online')).toBeInTheDocument();
  });

  it('should render syncing status when online with pending operations', () => {
    render(
      <OfflineBanner
        isOnline={true}
        pendingOperations={2}
      />
    );
    
    expect(screen.getByText('Syncing 2 changes...')).toBeInTheDocument();
  });

  it('should call onManualSync when sync button is clicked', () => {
    const mockOnManualSync = vi.fn();
    
    render(
      <OfflineBanner
        isOnline={true}
        pendingOperations={1}
        onManualSync={mockOnManualSync}
      />
    );
    
    const syncButton = screen.getByText('Sync now');
    fireEvent.click(syncButton);
    
    expect(mockOnManualSync).toHaveBeenCalledTimes(1);
  });

  it('should format last sync time correctly', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    render(
      <OfflineBanner
        isOnline={false}
        pendingOperations={1}
        lastSync={fiveMinutesAgo}
      />
    );
    
    expect(screen.getByText('Last sync: 5m ago')).toBeInTheDocument();
  });

  it('should disable sync button when no pending operations', () => {
    render(
      <OfflineBanner
        isOnline={true}
        pendingOperations={0}
        onManualSync={vi.fn()}
      />
    );
    
    // Should not render when no pending operations
    expect(screen.queryByText('Sync now')).not.toBeInTheDocument();
  });
});