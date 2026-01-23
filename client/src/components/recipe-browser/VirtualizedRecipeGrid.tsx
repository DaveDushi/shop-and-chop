import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { Recipe } from '../../types/Recipe.types';
import { RecipeCard } from './RecipeCard';
import { RecipeCardSkeleton } from './RecipeCardSkeleton';

export interface VirtualizedRecipeGridProps {
  recipes: Recipe[];
  viewMode: 'grid' | 'list';
  isLoading: boolean;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  onRecipeSelect: (recipe: Recipe) => void;
  onFavoriteToggle: (recipeId: string) => void;
  onAddToMealPlan: (recipe: Recipe) => void;
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (recipe: Recipe) => void;
  isFavorited?: (recipeId: string) => boolean;
  isFavoriteLoading?: (recipeId: string) => boolean;
  isAuthenticated?: boolean;
  currentUserId?: string;
  containerHeight?: number;
}

export const VirtualizedRecipeGrid: React.FC<VirtualizedRecipeGridProps> = ({
  recipes,
  viewMode,
  isLoading,
  hasNextPage,
  onLoadMore,
  onRecipeSelect,
  onFavoriteToggle,
  onAddToMealPlan,
  onEdit,
  onDelete,
  isFavorited,
  isFavoriteLoading,
  isAuthenticated = false,
  currentUserId,
  containerHeight = 600,
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Calculate grid dimensions based on container width and view mode
  const { columnsPerRow, itemHeight } = useMemo(() => {
    if (viewMode === 'list') {
      return {
        columnsPerRow: 1,
        itemHeight: 200, // Height for list view cards
      };
    }

    // Grid view - responsive columns
    let columns = 1;
    if (containerWidth >= 1280) columns = 4; // xl
    else if (containerWidth >= 1024) columns = 3; // lg
    else if (containerWidth >= 640) columns = 2; // sm
    
    return {
      columnsPerRow: columns,
      itemHeight: 350, // Height for grid view cards
    };
  }, [containerWidth, viewMode]);

  // Calculate total rows needed
  const totalRows = Math.ceil(recipes.length / columnsPerRow);

  // Handle scroll to update visible range
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const scrollTop = scrollRef.current.scrollTop;
    const viewportHeight = scrollRef.current.clientHeight;
    
    const startRow = Math.floor(scrollTop / itemHeight);
    const endRow = Math.min(
      totalRows,
      Math.ceil((scrollTop + viewportHeight) / itemHeight) + 2 // Buffer rows
    );

    const startIndex = startRow * columnsPerRow;
    const endIndex = Math.min(recipes.length, endRow * columnsPerRow);

    setVisibleRange({ start: startIndex, end: endIndex });

    // Load more when approaching the end
    if (hasNextPage && onLoadMore && !isLoading) {
      const threshold = Math.max(10, columnsPerRow * 2);
      if (endIndex >= recipes.length - threshold) {
        onLoadMore();
      }
    }
  }, [itemHeight, columnsPerRow, totalRows, recipes.length, hasNextPage, onLoadMore, isLoading]);

  // Set up scroll listener
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // Ref callback to measure container width
  const containerRefCallback = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const updateWidth = () => {
        setContainerWidth(node.offsetWidth);
      };
      
      updateWidth();
      
      const resizeObserver = new ResizeObserver(updateWidth);
      resizeObserver.observe(node);
      
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, []);

  // Get visible recipes
  const visibleRecipes = useMemo(() => {
    return recipes.slice(visibleRange.start, visibleRange.end);
  }, [recipes, visibleRange]);

  // Empty state
  if (!isLoading && recipes.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Recipes Found
        </h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          We couldn't find any recipes matching your criteria. Try adjusting your search or filters to discover new recipes.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRefCallback} className="w-full">
      <div
        ref={scrollRef}
        className="overflow-auto"
        style={{ height: containerHeight }}
      >
        {/* Virtual spacer for items before visible range */}
        {visibleRange.start > 0 && (
          <div style={{ height: Math.floor(visibleRange.start / columnsPerRow) * itemHeight }} />
        )}

        {/* Visible items */}
        <div className={`grid gap-6 p-6 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
            : 'grid-cols-1'
        }`}>
          {visibleRecipes.map((recipe) => {
            // Merge server-side favorite status with client-side state
            const recipeWithFavoriteState = {
              ...recipe,
              isFavorited: isFavorited ? isFavorited(recipe.id) : recipe.isFavorited,
            };

            return (
              <RecipeCard
                key={recipe.id}
                recipe={recipeWithFavoriteState}
                viewMode={viewMode}
                onSelect={() => onRecipeSelect(recipe)}
                onFavoriteToggle={() => onFavoriteToggle(recipe.id)}
                onAddToMealPlan={() => onAddToMealPlan(recipe)}
                onEdit={onEdit ? () => onEdit(recipe) : undefined}
                onDelete={onDelete ? () => onDelete(recipe) : undefined}
                isFavoriteLoading={isFavoriteLoading ? isFavoriteLoading(recipe.id) : false}
                isAuthenticated={isAuthenticated}
                currentUserId={currentUserId}
              />
            );
          })}

          {/* Loading skeletons */}
          {isLoading && Array.from({ length: columnsPerRow * 2 }).map((_, index) => (
            <RecipeCardSkeleton key={`skeleton-${index}`} viewMode={viewMode} />
          ))}
        </div>

        {/* Virtual spacer for items after visible range */}
        {visibleRange.end < recipes.length && (
          <div style={{ 
            height: Math.ceil((recipes.length - visibleRange.end) / columnsPerRow) * itemHeight 
          }} />
        )}
      </div>
    </div>
  );
};