import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.tsx';
import './styles/globals.css';

// Initialize PWA functionality in the background (only in production)
if (import.meta.env.PROD) {
  setTimeout(() => {
    console.log('🚀 Initializing PWA services...');
    import('./services/pwaManager').then(({ pwaManager }) => {
      console.log('✅ PWA Manager loaded, initializing...');
      pwaManager.initialize().catch((error) => {
        console.warn('PWA initialization failed:', error);
      });
    });
    
    // Initialize shopping list service for offline capabilities
    setTimeout(() => {
      console.log('🛒 Initializing Shopping List Service...');
      import('./services/shoppingListService').then(({ ShoppingListService }) => {
        console.log('✅ Shopping List Service loaded, initializing...');
        ShoppingListService.initialize().catch((error) => {
          console.warn('Shopping List Service initialization failed:', error);
        });
      }).catch((error) => {
        console.warn('Shopping List Service import failed:', error);
      });
    }, 50);
    
    // Initialize sync queue manager after other services are loaded
    setTimeout(() => {
      console.log('🔄 Initializing Sync Queue Manager...');
      import('./services/syncQueueManager').then(({ syncQueueManager }) => {
        console.log('✅ Sync Queue Manager loaded, initializing...');
        syncQueueManager.initialize();
      }).catch((error) => {
        console.warn('Sync queue manager initialization failed:', error);
      });
    }, 100);
  }, 1000);
} else {
  console.log('🔧 Development mode: PWA services disabled');
  // Initialize services in development mode too for testing offline features
  setTimeout(() => {
    console.log('🛒 Initializing Shopping List Service (dev mode)...');
    import('./services/shoppingListService').then(({ ShoppingListService }) => {
      console.log('✅ Shopping List Service loaded, initializing...');
      ShoppingListService.initialize().catch((error) => {
        console.warn('Shopping List Service initialization failed:', error);
      });
    }).catch((error) => {
      console.warn('Shopping List Service import failed:', error);
    });
  }, 500);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
);