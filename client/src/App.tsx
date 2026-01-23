import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Layout } from './components/common/Layout';
import { ToastProvider } from './components/common/Toast';
import { queryClient } from './config/queryClient';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { MealPlanner } from './pages/MealPlanner';
import { Recipes } from './pages/Recipes';
import { ShoppingList } from './pages/ShoppingList';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DndProvider backend={HTML5Backend}>
        <AuthProvider>
          <ToastProvider>
            <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <Home />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/meal-planner" element={
              <ProtectedRoute>
                <Layout>
                  <MealPlanner />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/recipes" element={
              <ProtectedRoute>
                <Layout>
                  <Recipes />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/shopping-list/:mealPlanId?" element={
              <ProtectedRoute>
                <Layout>
                  <ShoppingList />
                </Layout>
              </ProtectedRoute>
            } />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </ToastProvider>
        </AuthProvider>
      </DndProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;