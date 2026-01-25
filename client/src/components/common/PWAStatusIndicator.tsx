import React from 'react';
import { Smartphone, Download, CheckCircle, WifiOff } from 'lucide-react';
import { usePWAInstallation } from '../../hooks/usePWAInstallation';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';

interface PWAStatusIndicatorProps {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PWAStatusIndicator: React.FC<PWAStatusIndicatorProps> = ({
  showLabel = false,
  size = 'md',
  className = ''
}) => {
  const { canInstall, isInstalled } = usePWAInstallation();
  const { isOnline } = useOfflineStatus();

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'lg':
        return 'w-6 h-6';
      default:
        return 'w-5 h-5';
    }
  };

  const getTextSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-sm';
      default:
        return 'text-xs';
    }
  };

  const getStatus = () => {
    if (isInstalled) {
      return {
        icon: <CheckCircle className={`${getSizeClasses()} text-green-600`} />,
        label: 'Installed',
        color: 'text-green-600'
      };
    }
    
    if (canInstall) {
      return {
        icon: <Download className={`${getSizeClasses()} text-blue-600`} />,
        label: 'Can Install',
        color: 'text-blue-600'
      };
    }
    
    return {
      icon: <Smartphone className={`${getSizeClasses()} text-gray-400`} />,
      label: 'Web App',
      color: 'text-gray-400'
    };
  };

  const status = getStatus();

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="relative">
        {status.icon}
        {!isOnline && (
          <div className="absolute -top-1 -right-1">
            <WifiOff className="w-2 h-2 text-red-500" />
          </div>
        )}
      </div>
      {showLabel && (
        <span className={`${getTextSizeClasses()} ${status.color} font-medium`}>
          {status.label}
        </span>
      )}
    </div>
  );
};

export default PWAStatusIndicator;