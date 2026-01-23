import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ 
  items, 
  className = '' 
}) => {
  return (
    <nav 
      aria-label="Breadcrumb" 
      className={`flex items-center space-x-1 text-sm text-gray-500 ${className}`}
    >
      <Link 
        to="/" 
        className="flex items-center hover:text-gray-700 transition-colors"
        aria-label="Home"
      >
        <Home className="w-4 h-4" />
      </Link>
      
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          
          {item.current || !item.href ? (
            <span 
              className={`font-medium ${item.current ? 'text-gray-900' : 'text-gray-500'}`}
              aria-current={item.current ? 'page' : undefined}
            >
              {item.label}
            </span>
          ) : (
            <Link 
              to={item.href} 
              className="hover:text-gray-700 transition-colors"
            >
              {item.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};