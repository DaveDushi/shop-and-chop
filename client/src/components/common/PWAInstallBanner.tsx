import React, { useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { usePWAInstallation } from '../../hooks/usePWAInstallation';

interface PWAInstallBannerProps {
  className?: string;
  onInstall?: () => void;
  onDismiss?: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  className = '',
  onInstall,
  onDismiss
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  
  const {
    canInstall,
    isInstalled,
    showInstallPrompt
  } = usePWAInstallation();

  // Handle install button click
  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await showInstallPrompt();
      if (success) {
        onInstall?.();
      }
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  // Handle dismiss
  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  // Don't render if not installable, already installed, or dismissed
  if (!canInstall || isInstalled || isDismissed) {
    return null;
  }

  return (
    <div className={`
      bg-primary-50 border-b border-primary-100 px-4 py-2
      ${className}
    `}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <Smartphone className="w-5 h-5 text-primary-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-primary-800">
              <span className="font-medium">Install Shop&Chop</span> for quick access to your shopping lists, even offline!
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className="
              flex items-center gap-1 px-3 py-1.5 
              bg-primary-600 text-white text-sm font-medium rounded-lg
              hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
            "
          >
            <Download className="w-4 h-4" />
            {isInstalling ? 'Installing...' : 'Install'}
          </button>
          
          <button
            onClick={handleDismiss}
            className="
              p-1.5 text-primary-600 hover:text-primary-800 
              transition-colors duration-200
            "
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallBanner;