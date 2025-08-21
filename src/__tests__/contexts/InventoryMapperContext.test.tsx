import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { 
  InventoryMapperProvider, 
  useInventoryMapperContext 
} from '@/contexts/InventoryMapperContext';
import { createMockConflict, createMockAllocation } from '../utils/test-utils';

describe('InventoryMapperContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <InventoryMapperProvider>{children}</InventoryMapperProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Context Provider', () => {
    it('should throw error when used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useInventoryMapperContext());
      }).toThrow('useInventoryMapperContext must be used within InventoryMapperProvider');
      
      consoleError.mockRestore();
    });

    it('should provide context value when used within provider', () => {
      const { result } = renderHook(() => useInventoryMapperContext(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.sharedEquipmentState).toBeDefined();
      expect(result.current.conflicts).toEqual([]);
      expect(result.current.allocations).toBeDefined();
      expect(result.current.syncStatus).toBe('idle');
    });
  });

  describe('Shared Equipment State Management', () => {
    it('should update shared equipment state', () => {
      const { result } = renderHook(() => useInventoryMapperContext(), { wrapper });

      act(() => {
        result.current.updateSharedEquipment('eq-1', {
          status: 'deployed',
          jobId: 'job-1',
        });
      });

      const state = result.current.sharedEquipmentState.get('eq-1');
      expect(state).toMatchObject({
        status: 'deployed',
        jobId: 'job-1',
        lastUpdated: expect.any(Date),
      });
    });

    it('should merge partial updates with existing state', () => {
      const { result } = renderHook(() => useInventoryMapperContext(), { wrapper });

      act(() => {
        result.current.updateSharedEquipment('eq-1', {
          status: 'deployed',
          jobId: 'job-1',
        });
      });

      act(() => {
        result.current.updateSharedEquipment('eq-1', {
          status: 'available',
        });
      });

      const state = result.current.sharedEquipmentState.get('eq-1');
      expect(state).toMatchObject({
        status: 'available',
        jobId: 'job-1', // Should retain previous jobId
        lastUpdated: expect.any(Date),
      });
    });

    it('should create new state for non-existent equipment', () => {
      const { result } = renderHook(() => useInventoryMapperContext(), { wrapper });

      act(() => {
        result.current.updateSharedEquipment('new-eq', {
          status: 'available',
        });
      });

      const state = result.current.sharedEquipmentState.get('new-eq');
      expect(state).toMatchObject({
        status: 'available',
        lastUpdated: expect.any(Date),
      });
    });

    it('should batch update multiple equipment', () => {
      const { result } = renderHook(() => useInventoryMapperContext(), { wrapper });

      const updates = [
        { equipmentId: 'eq-1', state: { status: 'deployed', jobId: 'job-1' } },
        { equipmentId: 'eq-2', state: { status: 'available' } },
        { equipmentId: 'eq-3', state: { status: 'maintenance' } },
      ];

      act(() => {
        result.current.batchUpdateEquipment(updates);
      });

      expect(result.current.sharedEquipmentState.get('eq-1')?.status).toBe('deployed');
      expect(result.current.sharedEquipmentState.get('eq-2')?.status).toBe('available');
      expect(result.current.sharedEquipmentState.get('eq-3')?.status).toBe('maintenance');
    });
  });

  describe('Conflict Management', () => {
    it('should add new conflict', () => {
      const { result } = renderHook(() => useInventoryMapperContext(), { wrapper });
      const conflict = createMockConflict();

      act(() => {
        result.current.addConflict(conflict);
      });

      expect(result.current.conflicts).toHaveLength(1);
      expect(result.current.conflicts[0]).toEqual(conflict);
    });

    it('should update existing conflict', () => {
      const { result } = renderHook(() => useInventoryMapperContext(), { wrapper });
      const conflict1 = createMockConflict({ equipmentId: 'eq-1', currentJobName: 'Job 1' });
      const conflict2 = createMockConflict({ equipmentId: 'eq-1', currentJobName: 'Job 1 Updated' });

      act(() => {
        result.current.addConflict(conflict1);
      });

      act(() => {
        result.current.addConflict(conflict2);
      });

      expect(result.current.conflicts).toHaveLength(1);
      expect(result.current.conflicts[0].currentJobName).toBe('Job 1 Updated');
    });

    it('should remove conflict by equipment ID', () => {
      const { result } = renderHook(() => useInventoryMapperContext(), { wrapper });
      const conflict1 = createMockConflict({ equipmentId: 'eq-1' });
      const conflict2 = createMockConflict({ equipmentId: 'eq-2' });

      act(() => {
        result.current.addConflict(conflict1);
        result.current.addConflict(conflict2);
      });

      act(() => {
        result.current.removeConflict('eq-1');
      });

      expect(result.current.conflicts).toHaveLength(1);
      expect(result.current.conflicts[0].equipmentId).toBe('eq-2');
    });

    it('should clear all conflicts', () => {
      const { result } = renderHook(() => useInventoryMapperContext(), { wrapper });

      act(() => {
        result.current.addConflict(createMockConflict({ equipmentId: 'eq-1' }));
        result.current.addConflict(createMockConflict({ equipmentId: 'eq-2' }));
        result.current.addConflict(createMockConflict({ equipmentId: 'eq-3' }));
      });

      expect(result.current.conflicts).toHaveLength(3);

      act(() => {
        result.current.clearConflicts();
      });

      expect(result.current.conflicts).toHaveLength(0);
    });
  });

  describe('Allocation Management', () => {
    it('should set allocation and update shared state', () => {
      const { result } = renderHook(() => useInventoryMapperContext(), { wrapper });
      const allocation = createMockAllocation();

      act(() => {
        result.current.setAllocation('eq-1', allocation);
      });

      expect(result.current.allocations.get('eq-1')).toEqual(allocation);
      expect(result.current.sharedEquipmentState.get('eq-1')).toMatchObject({
        status: allocation.status,
        jobId: allocation.jobId,
      });
    });

    it('should remove allocation and update shared state', () => {
      const { result } = renderHook(() => useInventoryMapperContext(), { wrapper });
      const allocation = createMockAllocation();

      act(() => {
        result.current.setAllocation('eq-1', allocation);
      });

      act(() => {
        result.current.removeAllocation('eq-1');
      });

      expect(result.current.allocations.has('eq-1')).toBe(false);
      expect(result.current.sharedEquipmentState.get('eq-1')).toMatchObject({
        status: 'available',
        jobId: undefined,
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should subscribe to equipment changes', () => {
      const { result } = renderHook(() => useInventoryMapperContext(), { wrapper });
      const callback = vi.fn();

      act(() => {
        const unsubscribe = result.current.subscribeToEquipmentChanges('eq-1', callback);
        
        // Trigger an update
        result.current.updateSharedEquipment('eq-1', {
          status: 'deployed',
          jobId: 'job-1',
        });
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'deployed',
          jobId: 'job-1',
        })
      );
    });

    it('should handle multiple subscribers for same equipment', () => {
      const { result } = renderHook(() => useInventoryMapperContext(), { wrapper });
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      act(() => {
        result.current.subscribeToEquipmentChanges('eq-1', callback1);
        result.current.subscribeToEquipmentChanges('eq-1', callback2);
        
        result.current.updateSharedEquipment('eq-1', {
          status: 'deployed',
        });
      });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should unsubscribe from equipment changes', () => {
      const { result } = renderHook(() => useInventoryMapperContext(), { wrapper });
      const callback = vi.fn();

      let unsubscribe: () => void;
      act(() => {
        unsubscribe = result.current.subscribeToEquipmentChanges('eq-1', callback);
      });

      act(() => {
        unsubscribe();
        
        // Update after unsubscribe
        result.current.updateSharedEquipment('eq-1', {
          status: 'deployed',
        });
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should clean up empty subscriber sets', () => {
      const { result } = renderHook(() => useInventoryMapperContext(), { wrapper });
      const callback = vi.fn();

      let unsubscribe: () => void;
      act(() => {
        unsubscribe = result.current.subscribeToEquipmentChanges('eq-1', callback);
      });

      act(() => {
        unsubscribe();
      });

      // Internal check - this would require exposing subscribers or checking behavior
      // In this case, we verify that re-subscribing works correctly
      act(() => {
        const newUnsubscribe = result.current.subscribeToEquipmentChanges('eq-1', callback);
        result.current.updateSharedEquipment('eq-1', { status: 'available' });
      });

      expect(callback).toHaveBeenCalledOnce();
    });
  });

  describe('Sync Status Management', () => {
    it('should update sync status', () => {
      const { result } = renderHook(() => useInventoryMapperContext(), { wrapper });

      expect(result.current.syncStatus).toBe('idle');

      act(() => {
        result.current.setSyncStatus('syncing');
      });

      expect(result.current.syncStatus).toBe('syncing');

      act(() => {
        result.current.setSyncStatus('error');
      });

      expect(result.current.syncStatus).toBe('error');
    });

    it('should update last sync time', () => {
      const { result } = renderHook(() => useInventoryMapperContext(), { wrapper });
      const syncTime = new Date();

      expect(result.current.lastSyncTime).toBeUndefined();

      act(() => {
        result.current.setLastSyncTime(syncTime);
      });

      expect(result.current.lastSyncTime).toEqual(syncTime);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete equipment lifecycle', () => {
      const { result } = renderHook(() => useInventoryMapperContext(), { wrapper });
      const callback = vi.fn();

      // Subscribe to changes
      act(() => {
        result.current.subscribeToEquipmentChanges('eq-1', callback);
      });

      // Allocate equipment
      act(() => {
        const allocation = createMockAllocation({
          equipmentId: 'eq-1',
          jobId: 'job-1',
          status: 'allocated',
        });
        result.current.setAllocation('eq-1', allocation);
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'allocated',
          jobId: 'job-1',
        })
      );

      // Create conflict
      act(() => {
        result.current.addConflict(createMockConflict({
          equipmentId: 'eq-1',
          currentJobId: 'job-1',
          requestedJobId: 'job-2',
        }));
      });

      expect(result.current.conflicts).toHaveLength(1);

      // Resolve conflict and reallocate
      act(() => {
        result.current.removeConflict('eq-1');
        result.current.removeAllocation('eq-1');
        
        const newAllocation = createMockAllocation({
          equipmentId: 'eq-1',
          jobId: 'job-2',
          status: 'allocated',
        });
        result.current.setAllocation('eq-1', newAllocation);
      });

      expect(result.current.conflicts).toHaveLength(0);
      expect(result.current.allocations.get('eq-1')?.jobId).toBe('job-2');
      expect(callback).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: 'allocated',
          jobId: 'job-2',
        })
      );
    });

    it('should maintain consistency across batch operations', () => {
      const { result } = renderHook(() => useInventoryMapperContext(), { wrapper });
      const subscribers = new Map<string, vi.Mock>();

      // Set up subscribers for multiple equipment
      ['eq-1', 'eq-2', 'eq-3'].forEach(id => {
        const callback = vi.fn();
        subscribers.set(id, callback);
        act(() => {
          result.current.subscribeToEquipmentChanges(id, callback);
        });
      });

      // Batch update
      act(() => {
        result.current.batchUpdateEquipment([
          { equipmentId: 'eq-1', state: { status: 'deployed', jobId: 'job-1' } },
          { equipmentId: 'eq-2', state: { status: 'deployed', jobId: 'job-1' } },
          { equipmentId: 'eq-3', state: { status: 'maintenance' } },
        ]);
      });

      // Verify all subscribers were notified
      expect(subscribers.get('eq-1')).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'deployed', jobId: 'job-1' })
      );
      expect(subscribers.get('eq-2')).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'deployed', jobId: 'job-1' })
      );
      expect(subscribers.get('eq-3')).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'maintenance' })
      );

      // Add conflicts for deployed equipment
      act(() => {
        result.current.addConflict(createMockConflict({ equipmentId: 'eq-1' }));
        result.current.addConflict(createMockConflict({ equipmentId: 'eq-2' }));
      });

      expect(result.current.conflicts).toHaveLength(2);

      // Clear all conflicts
      act(() => {
        result.current.clearConflicts();
      });

      expect(result.current.conflicts).toHaveLength(0);
    });
  });
});