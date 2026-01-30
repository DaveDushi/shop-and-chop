import React from 'react';
import { render, screen } from '@testing-library/react';
import { ScalingIndicator } from '../ScalingIndicator';

describe('ScalingIndicator', () => {
  it('renders no scaling indicator when factor is 1', () => {
    render(
      <ScalingIndicator
        originalServings={4}
        currentServings={4}
        scalingFactor={1}
        scalingSource="household"
      />
    );
    
    expect(screen.getByText('(1×)')).toBeInTheDocument();
  });

  it('renders household scaling indicator', () => {
    render(
      <ScalingIndicator
        originalServings={4}
        currentServings={8}
        scalingFactor={2}
        scalingSource="household"
      />
    );
    
    expect(screen.getByText('(2.0×)')).toBeInTheDocument();
    expect(screen.getByText('4 → 8')).toBeInTheDocument();
  });

  it('renders manual override indicator', () => {
    render(
      <ScalingIndicator
        originalServings={4}
        currentServings={6}
        scalingFactor={1.5}
        scalingSource="manual"
      />
    );
    
    expect(screen.getByText('(1.5×)')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
  });

  it('renders compact version', () => {
    render(
      <ScalingIndicator
        originalServings={4}
        currentServings={8}
        scalingFactor={2}
        scalingSource="household"
        compact={true}
      />
    );
    
    expect(screen.getByText('2.0×')).toBeInTheDocument();
    // Compact version should not show the full "4 → 8" text
    expect(screen.queryByText('4 → 8')).not.toBeInTheDocument();
  });
});