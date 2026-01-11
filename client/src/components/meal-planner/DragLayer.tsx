import React from 'react';
import { useDragLayer, XYCoord } from 'react-dnd';
import { DragItemTypes, DragItem } from '../../types/DragDrop.types';
import { Recipe } from '../../types/Recipe.types';

interface DragLayerProps {}

interface DragLayerCollectedProps {
  item: DragItem | null;
  itemType: string | symbol | null;
  initialOffset: XYCoord | null;
  currentOffset: XYCoord | null;
  isDragging: boolean;
}

const layerStyles: React.CSSProperties = {
  position: 'fixed',
  pointerEvents: 'none',
  zIndex: 100,
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
};

function getItemStyles(
  initialOffset: XYCoord | null,
  currentOffset: XYCoord | null,
) {
  if (!initialOffset || !currentOffset) {
    return {
      display: 'none',
    };
  }

  const { x, y } = currentOffset;

  const transform = `translate(${x}px, ${y}px)`;
  return {
    transform,
    WebkitTransform: transform,
  };
}

const RecipeDragPreview: React.FC<{ recipe: Recipe }> = ({ recipe }) => {
  return (
    <div className="bg-white border-2 border-blue-400 rounded-lg shadow-lg p-3 max-w-xs opacity-90">
      <div className="flex items-center space-x-3">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.name}
            className="w-12 h-12 object-cover rounded-lg"
          />
        ) : (
          <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
            <span className="text-lg text-gray-400">🍽️</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 text-sm truncate">
            {recipe.name}
          </h3>
          <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
            <span>{recipe.prepTime + recipe.cookTime}m</span>
            <span>•</span>
            <span>{recipe.servings} servings</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DragLayer: React.FC<DragLayerProps> = () => {
  const {
    item,
    itemType,
    initialOffset,
    currentOffset,
    isDragging,
  } = useDragLayer<DragLayerCollectedProps>((monitor) => ({
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    initialOffset: monitor.getInitialSourceClientOffset(),
    currentOffset: monitor.getSourceClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  function renderItem() {
    if (!item) {
      return null;
    }

    switch (itemType) {
      case DragItemTypes.RECIPE:
      case DragItemTypes.MEAL:
        return <RecipeDragPreview recipe={item.recipe} />;
      default:
        return null;
    }
  }

  if (!isDragging) {
    return null;
  }

  return (
    <div style={layerStyles}>
      <div style={getItemStyles(initialOffset, currentOffset)}>
        {renderItem()}
      </div>
    </div>
  );
};