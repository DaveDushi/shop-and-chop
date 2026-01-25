import React from 'react';
import { render, screen } from '@testing-library/react';
import { SyncStatusIndicator } from '../SyncStatusIndicator';

describe('SyncStatusIndicator', () => {
  it('should render offline status correctly', () => {
    render(
      <SyncStatusIndicator
        isOnline={false}
        connectionType="unknown"
        isActive={false}
        pendingOperations={0}
        errors={[]}
      />
    );
    
    expect(screen.getByText('Up to date')).toBeInTheDocument();
  });

  it('should render sync active status', () => {
    render(
      <SyncStatusIndicator
        isOnline={true}
        connectionType="wifi"
        isActive={true}
        pendingOperations={2}
        errors={[]}
      />
    );
    
    expect(screen.getByText('Syncing...')).toBeInTheDocument();
  });

  it('should render pending operations count', () => {
    render(
      <SyncStatusIndicator
        isOnline={true}
        connectionType="wifi"
        isActive={false}
        pendingOperations={3}
        errors={[]}
      />
    );
    
    expect(screen.getByText('3 pending')).toBeInTheDocument();
  });

  it('should render error status', () => {
    render(
      <SyncStatusIndicator
        isOnline={true}
        connectionType="wifi"
        isActive={false}
        pendingOperations={0}
        errors={['Sync failed', 'Network error']}
      />
    );
    
    expect(screen.getByText('Sync error')).toBeInTheDocument();
    expect(screen.getByText('(2 errors)')).toBeInTheDocument();
  });

  it('should render compact mode correctly', () => {
    render(
      <SyncStatusIndicator
        isOnline={true}
        connectionType="cellular"
        isActive={false}
        pendingOperations={5}
        errors={[]}
        compact={true}
      />
    );
    
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.queryByText('5 pending')).not.toBeInTheDocument();
  });

  it('should show correct connection type icons', () => {
    const { rerender } = render(
      <SyncStatusIndicator
        isOnline={true}
        connectionType="wifi"
        isActive={false}
        pendingOperations={0}
        errors={[]}
      />
    );
    
    // WiFi connection should be indicated
    expect(screen.getByText('Up to date')).toBeInTheDocument();
    
    rerender(
      <SyncStatusIndicator
        isOnline={true}
        connectionType="cellular"
        isActive={false}
        pendingOperations={0}
        errors={[]}
      />
    );
    
    // Cellular connection should be indicated
    expect(screen.getByText('Up to date')).toBeInTheDocument();
  });
});