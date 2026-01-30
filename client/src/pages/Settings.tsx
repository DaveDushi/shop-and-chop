import React from 'react';
import { Settings as SettingsIcon, User, Users, Bell, Shield } from 'lucide-react';
import { HouseholdSizeSettings } from '../components/common/HouseholdSizeSettings';
import { useAuth } from '../hooks/useAuth';

/**
 * Settings Page Component
 * 
 * Provides a centralized location for users to manage their preferences
 * and account settings. Currently includes household size management
 * with room for future settings categories.
 */
export const Settings: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3">
          <SettingsIcon className="w-6 h-6 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your account preferences and meal planning settings</p>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        
        {/* Profile Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <User className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <p className="mt-1 text-sm text-gray-900">{user?.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Member Since</label>
              <p className="mt-1 text-sm text-gray-900">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* Household Size Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <HouseholdSizeSettings 
            onUpdate={(newSize) => {
              console.log('Household size updated to:', newSize);
            }}
          />
        </div>

        {/* Dietary Preferences */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Bell className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Dietary Preferences</h2>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Dietary Restrictions</label>
              <div className="mt-1">
                {user?.dietaryRestrictions && user.dietaryRestrictions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.dietaryRestrictions.map((restriction, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {restriction}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No dietary restrictions set</p>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Favorite Cuisines</label>
              <div className="mt-1">
                {user?.favoriteCuisines && user.favoriteCuisines.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.favoriteCuisines.map((cuisine, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      >
                        {cuisine}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No favorite cuisines set</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Dietary preferences can be updated during registration. 
              Full preference editing will be available in a future update.
            </p>
          </div>
        </div>

        {/* Account Security */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Account Security</h2>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <p className="mt-1 text-sm text-gray-500">••••••••</p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Password management and additional security features will be available in a future update.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <SettingsIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-blue-900">Settings Impact</h3>
            <p className="text-sm text-blue-700 mt-1">
              Changes to your household size will automatically update ingredient quantities 
              in all your meal plans and shopping lists. Manual serving overrides for specific 
              recipes will be preserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};