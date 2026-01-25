import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor, Wifi } from 'lucide-react';
import { usePWAInstallation } from '../../hooks/usePWAInstallation';

interface PWAInstallPromptProps {
  autoShow?: boolean;
  showDelay?: number;
  className?: string;
  onInstall?: () => void;
  onDismiss?: () => void;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  autoShow = true,
  showDelay = 5000,
  className = '',
  onInstall,
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  
  const {
    canInstall,
    isInstalled,
    isInstallationRecommended,
    showInstallPrompt
  } = usePWAInstallation();

  // Handle install button click
  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await showInstallPrompt();
      if (success) {
        setIsVisible(false);
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
    setIsVisible(false);
    setIsDismissed(true);
    onDismiss?.();
  };

  // Auto-show logic
  useEffect(() => {
    if (!autoShow || isDismissed || isInstalled || !canInstall) return;
    
    if (isInstallationRecommended) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, showDelay);
      
      return () => clearTimeout(timer);
    }
  }, [autoShow, showDelay, isDismissed, isInstalled, canInstall, isInstallationRecommended]);

  // Don't render if not installable or already installed
  if (!canInstall || isInstalled || isDismissed) {
    return null;
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`
      fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm
      bg-white border border-gray-200 rounded-xl shadow-lg p-4
      transform transition-all duration-300 ease-in-out
      z-50 ${className}
    `}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-primary-600" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Install Shop&Chop
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            Add to your home screen for quick access to your shopping lists, even offline!
          </p>
          
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Wifi className="w-3 h-3" />
              <span>Works offline</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Monitor className="w-3 h-3" />
              <span>Native experience</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="
                flex items-center gap-1 px-3 py-1.5 
                bg-primary-600 text-white text-xs font-medium rounded-lg
                hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-200
              "
            >
              <Download className="w-3 h-3" />
              {isInstalling ? 'Installing...' : 'Install'}
            </button>
            
            <button
              onClick={handleDismiss}
              className="
                px-3 py-1.5 text-xs font-medium text-gray-600 
                hover:text-gray-800 transition-colors duration-200
              "
            >
              Not now
            </button>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="
            flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 
            transition-colors duration-200
          "
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;