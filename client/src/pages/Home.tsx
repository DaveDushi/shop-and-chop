import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { HouseholdSizeSettings } from '../components/common/HouseholdSizeSettings';
import { 
  Calendar, 
  BookOpen, 
  ShoppingCart, 
  Clock, 
  Users, 
  ChefHat,
  ArrowRight
} from 'lucide-react';

export const Home: React.FC = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: Calendar,
      title: 'Weekly Meal Planning',
      description: 'Drag and drop meals onto your weekly calendar',
      href: '/meal-planner',
      color: 'bg-blue-500'
    },
    {
      icon: BookOpen,
      title: 'Recipe Collection',
      description: 'Browse 100+ curated recipes with dietary filters',
      href: '/recipes',
      color: 'bg-green-500'
    },
    {
      icon: ShoppingCart,
      title: 'Smart Shopping Lists',
      description: 'Auto-generated lists organized by store sections',
      href: '/shopping-list',
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="text-primary-100 text-lg">
          Ready to plan your meals and shop smarter this week?
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Time Saved Stat */}
        <div className="card">
          <div className="card-content">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Clock className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Time Saved</p>
                <p className="text-2xl font-bold text-gray-900">2+ hours/week</p>
              </div>
            </div>
          </div>
        </div>

        {/* Household Size Settings */}
        <div className="card">
          <div className="card-content">
            <HouseholdSizeSettings 
              compact={true}
              onUpdate={(newSize) => {
                console.log('Household size updated from Home page:', newSize);
              }}
            />
          </div>
        </div>

        {/* Recipes Available Stat */}
        <div className="card">
          <div className="card-content">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <ChefHat className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Recipes Available</p>
                <p className="text-2xl font-bold text-gray-900">100+</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.title}
                to={feature.href}
                className="card hover:shadow-md transition-shadow group"
              >
                <div className="card-content">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg ${feature.color}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 mb-4">{feature.description}</p>
                      <div className="flex items-center text-primary-600 group-hover:text-primary-700">
                        <span className="text-sm font-medium">Get started</span>
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-gray-100 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          How Shop&Chop Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              1
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Plan Your Week</h3>
            <p className="text-gray-600 text-sm">
              Browse recipes and drag them onto your weekly meal calendar
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              2
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Generate List</h3>
            <p className="text-gray-600 text-sm">
              Get an organized shopping list with ingredients grouped by store section
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              3
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Shop & Cook</h3>
            <p className="text-gray-600 text-sm">
              Use your mobile-optimized list in-store and follow recipe instructions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};