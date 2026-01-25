import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { 
  Home, 
  Calendar, 
  BookOpen, 
  ShoppingCart, 
  User, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { OfflineBanner } from './OfflineBanner';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { SyncProgressIndicator } from './SyncProgressIndicator';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Offline status hook
  const {
    isOnline,
    connectionType,
    isActive: isSyncActive,
    pendingOperations,
    lastSync,
    errors: syncErrors,
    triggerManualSync
  } = useOfflineStatus();

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Meal Planner', href: '/meal-planner', icon: Calendar },
    { name: 'Recipes', href: '/recipes', icon: BookOpen },
    { name: 'Shopping List', href: '/shopping-list', icon: ShoppingCart },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">S&C</span>
                </div>
                <span className="text-lg xs:text-xl font-bold text-gray-900 hidden xs:block">Shop&Chop</span>
                <span className="text-lg font-bold text-gray-900 xs:hidden">S&C</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={clsx(
                      'flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-touch',
                      isActive(item.href)
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-2 xs:space-x-4">
              {/* Sync Status Indicator */}
              <SyncStatusIndicator
                isOnline={isOnline}
                connectionType={connectionType}
                isActive={isSyncActive}
                pendingOperations={pendingOperations}
                errors={syncErrors}
                compact={true}
                className="hidden sm:flex"
              />
              
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{user?.name}</span>
              </div>
              
              <button
                onClick={logout}
                className="flex items-center space-x-1 px-2 xs:px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors min-h-touch min-w-touch"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Logout</span>
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 min-h-touch min-w-touch flex items-center justify-center"
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white shadow-lg">
            <div className="px-2 pt-2 pb-safe-bottom space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={clsx(
                      'flex items-center space-x-3 px-4 py-3 rounded-md text-base font-medium transition-colors min-h-touch',
                      isActive(item.href)
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="px-4 py-2 text-sm text-gray-500">
                  Signed in as {user?.name}
                </div>
                <button
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-3 px-4 py-3 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200 w-full min-h-touch"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 py-4 xs:py-6 md:py-8">
        {/* Offline Banner */}
        <OfflineBanner
          isOnline={isOnline}
          pendingOperations={pendingOperations}
          lastSync={lastSync}
          onManualSync={triggerManualSync}
          className="mb-4"
        />
        
        {children}
      </main>

      {/* Sync Progress Indicator */}
      <SyncProgressIndicator
        isActive={isSyncActive}
        totalOperations={pendingOperations}
        completedOperations={0} // This would be calculated from sync progress
        errors={syncErrors}
      />
    </div>
  );
};