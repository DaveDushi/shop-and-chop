import { renderHook, act } from '@testing-library/react';
import { useCalendarState } from './useCalendarState';
import { startOfWeek, addWeeks, subWeeks } from 'date-fns';

describe('useCalendarState', () => {
  it('should initialize with current week', () => {
    const { result } = renderHook(() => useCalendarState());
    
    const expectedWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
    expect(result.current.currentWeek).toEqual(expectedWeek);
  });

  it('should navigate to previous week', () => {
    const { result } = renderHook(() => useCalendarState());
    const initialWeek = result.current.currentWeek;
    
    act(() => {
      result.current.goToPreviousWeek();
    });
    
    const expectedWeek = subWeeks(initialWeek, 1);
    expect(result.current.currentWeek).toEqual(expectedWeek);
  });

  it('should navigate to next week', () => {
    const { result } = renderHook(() => useCalendarState());
    const initialWeek = result.current.currentWeek;
    
    act(() => {
      result.current.goToNextWeek();
    });
    
    const expectedWeek = addWeeks(initialWeek, 1);
    expect(result.current.currentWeek).toEqual(expectedWeek);
  });

  it('should toggle sidebar', () => {
    const { result } = renderHook(() => useCalendarState());
    
    expect(result.current.uiState.sidebarCollapsed).toBe(false);
    
    act(() => {
      result.current.toggleSidebar();
    });
    
    expect(result.current.uiState.sidebarCollapsed).toBe(true);
  });

  it('should manage drag state', () => {
    const { result } = renderHook(() => useCalendarState());
    
    expect(result.current.uiState.dragState.isDragging).toBe(false);
    
    const mockDragItem = {
      type: 'RECIPE' as const,
      recipe: { id: '1', name: 'Test Recipe' } as any,
      sourceType: 'SIDEBAR' as const,
    };
    
    act(() => {
      result.current.startDrag(mockDragItem);
    });
    
    expect(result.current.uiState.dragState.isDragging).toBe(true);
    expect(result.current.uiState.dragState.draggedItem).toEqual(mockDragItem);
    
    act(() => {
      result.current.endDrag();
    });
    
    expect(result.current.uiState.dragState.isDragging).toBe(false);
    expect(result.current.uiState.dragState.draggedItem).toBeUndefined();
  });
});