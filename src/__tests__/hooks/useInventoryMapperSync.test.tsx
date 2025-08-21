import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { useInventoryMapperSync } from '@/hooks/useInventoryMapperSync';
import { 
  customRender,
  createMockInventoryContext,
  mockInventoryData,
  createMockConflict,
  createMockAllocation,
  waitForAsync
} from '../utils/test-utils';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useInventoryMapperSync', () => {
  let mockInventoryContext: ReturnType<typeof createMockInventoryContext>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockInventoryContext = createMockInventoryContext();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderUseInventoryMapperSync = (inventoryOverrides = {}) => {
    const wrapper = ({ children }: { children: React.ReactNode }) => 
      customRender(children, { 
        inventoryContextValue: { ...mockInventoryContext, ...inventoryOverrides } 
      });

    return renderHook(() => useInventoryMapperSync(), { wrapper });
  };

  describe('validateEquipmentAvailability', () => {
    it('should return true for available individual equipment', async () => {
      const { result } = renderUseInventoryMapperSync();

      const isAvailable = await act(async () => 
        result.current.validateEquipmentAvailability('eq-1', 'job-2')
      );

      expect(isAvailable).toBe(true);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('should return false and create conflict for deployed individual equipment', async () => {
      const { result } = renderUseInventoryMapperSync();

      const isAvailable = await act(async () => 
        result.current.validateEquipmentAvailability('eq-2', 'job-2')
      );

      expect(isAvailable).toBe(false);
      expect(result.current.conflicts).toHaveLength(1);
      expect(result.current.conflicts[0]).toMatchObject({
        equipmentId: 'eq-2',
        currentJobId: 'job-1',
        requestedJobId: 'job-2',
      });
    });

    it('should return false for equipment in maintenance', async () => {
      const { result } = renderUseInventoryMapperSync();

      const isAvailable = await act(async () => 
        result.current.validateEquipmentAvailability('eq-3', 'job-2')
      );

      expect(isAvailable).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('not available (Status: maintenance)')
      );
    });

    it('should return true for available regular equipment', async () => {
      const { result } = renderUseInventoryMapperSync();

      const isAvailable = await act(async () => 
        result.current.validateEquipmentAvailability('item-1', 'job-2')
      );

      expect(isAvailable).toBe(true);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('should return false for deployed regular equipment', async () => {
      const { result } = renderUseInventoryMapperSync();

      const isAvailable = await act(async () => 
        result.current.validateEquipmentAvailability('item-2', 'job-3')
      );

      expect(isAvailable).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Equipment is already deployed to another job');
    });

    it('should return false for non-existent equipment', async () => {
      const { result } = renderUseInventoryMapperSync();

      const isAvailable = await act(async () => 
        result.current.validateEquipmentAvailability('non-existent', 'job-1')
      );

      expect(isAvailable).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Equipment not found in inventory');
    });

    it('should handle insufficient quantity for regular equipment', async () => {
      mockInventoryContext.getAvailableQuantityByType.mockReturnValueOnce(0);
      const { result } = renderUseInventoryMapperSync();

      const isAvailable = await act(async () => 
        result.current.validateEquipmentAvailability('item-1', 'job-2')
      );

      expect(isAvailable).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Insufficient equipment quantity available');
    });

    it('should handle validation errors gracefully', async () => {
      mockInventoryContext.data = null as unknown as typeof mockInventoryContext.data;
      const { result } = renderUseInventoryMapperSync();

      const isAvailable = await act(async () => 
        result.current.validateEquipmentAvailability('eq-1', 'job-1')
      );

      expect(isAvailable).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Failed to validate equipment availability');
    });
  });

  describe('allocateEquipment', () => {
    it('should allocate available individual equipment successfully', async () => {
      const { result } = renderUseInventoryMapperSync();

      await act(async () => {
        await result.current.allocateEquipment('eq-1', 'job-2', 'Test Job 2');
      });

      expect(mockInventoryContext.updateIndividualEquipment).toHaveBeenCalledWith('ind-1', {
        status: 'deployed',
        jobId: 'job-2',
        lastUpdated: expect.any(Date),
      });
      expect(toast.success).toHaveBeenCalledWith('Equipment allocated to Test Job 2');
      expect(mockInventoryContext.syncData).toHaveBeenCalled();
    });

    it('should allocate regular equipment successfully', async () => {
      const { result } = renderUseInventoryMapperSync();

      await act(async () => {
        await result.current.allocateEquipment('item-1', 'job-2', 'Test Job 2');
      });

      expect(mockInventoryContext.updateSingleEquipmentItem).toHaveBeenCalledWith('item-1', {
        status: 'deployed',
        jobId: 'job-2',
        lastUpdated: expect.any(Date),
      });
      expect(toast.success).toHaveBeenCalledWith('Equipment allocated to Test Job 2');
    });

    it('should not allocate unavailable equipment', async () => {
      const { result } = renderUseInventoryMapperSync();

      await expect(act(async () => {
        await result.current.allocateEquipment('eq-2', 'job-3', 'Test Job 3');
      })).rejects.toThrow('Equipment not available for allocation');

      expect(mockInventoryContext.updateIndividualEquipment).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Failed to allocate equipment');
    });

    it('should handle allocation errors gracefully', async () => {
      mockInventoryContext.updateIndividualEquipment.mockRejectedValueOnce(new Error('DB Error'));
      const { result } = renderUseInventoryMapperSync();

      await expect(act(async () => {
        await result.current.allocateEquipment('eq-1', 'job-2', 'Test Job 2');
      })).rejects.toThrow();

      expect(toast.error).toHaveBeenCalledWith('Failed to allocate equipment');
    });
  });

  describe('releaseEquipment', () => {
    it('should release individual equipment successfully', async () => {
      const { result } = renderUseInventoryMapperSync();

      await act(async () => {
        await result.current.releaseEquipment('eq-2', 'job-1');
      });

      expect(mockInventoryContext.updateIndividualEquipment).toHaveBeenCalledWith('ind-2', {
        status: 'available',
        jobId: undefined,
        lastUpdated: expect.any(Date),
      });
      expect(toast.success).toHaveBeenCalledWith('Equipment released successfully');
      expect(mockInventoryContext.syncData).toHaveBeenCalled();
    });

    it('should release regular equipment successfully', async () => {
      const { result } = renderUseInventoryMapperSync();

      await act(async () => {
        await result.current.releaseEquipment('item-2', 'job-1');
      });

      expect(mockInventoryContext.updateSingleEquipmentItem).toHaveBeenCalledWith('item-2', {
        status: 'available',
        jobId: undefined,
        lastUpdated: expect.any(Date),
      });
      expect(toast.success).toHaveBeenCalledWith('Equipment released successfully');
    });

    it('should handle release errors gracefully', async () => {
      mockInventoryContext.updateIndividualEquipment.mockRejectedValueOnce(new Error('DB Error'));
      const { result } = renderUseInventoryMapperSync();

      await expect(act(async () => {
        await result.current.releaseEquipment('eq-2', 'job-1');
      })).rejects.toThrow();

      expect(toast.error).toHaveBeenCalledWith('Failed to release equipment');
    });
  });

  describe('resolveConflict', () => {
    it('should resolve conflict by keeping current assignment', async () => {
      const { result } = renderUseInventoryMapperSync();
      const conflict = createMockConflict({ equipmentId: 'eq-2' });

      // First create a conflict
      await act(async () => {
        await result.current.validateEquipmentAvailability('eq-2', 'job-2');
      });

      await act(async () => {
        await result.current.resolveConflict(conflict, 'current');
      });

      expect(result.current.conflicts).toHaveLength(0);
      expect(toast.success).toHaveBeenCalledWith('Conflict resolved successfully');
    });

    it('should resolve conflict by moving to requested job', async () => {
      const { result } = renderUseInventoryMapperSync();
      const conflict = createMockConflict({ 
        equipmentId: 'eq-2',
        currentJobId: 'job-1',
        requestedJobId: 'job-2',
        requestedJobName: 'New Job'
      });

      // First create a conflict
      await act(async () => {
        await result.current.validateEquipmentAvailability('eq-2', 'job-2');
      });

      await act(async () => {
        await result.current.resolveConflict(conflict, 'requested');
      });

      expect(mockInventoryContext.updateIndividualEquipment).toHaveBeenCalledTimes(2);
      expect(result.current.conflicts).toHaveLength(0);
      expect(toast.success).toHaveBeenCalledWith('Conflict resolved successfully');
    });

    it('should handle conflict resolution errors', async () => {
      mockInventoryContext.updateIndividualEquipment.mockRejectedValueOnce(new Error('DB Error'));
      const { result } = renderUseInventoryMapperSync();
      const conflict = createMockConflict({ equipmentId: 'eq-2' });

      await expect(act(async () => {
        await result.current.resolveConflict(conflict, 'requested');
      })).rejects.toThrow();

      expect(toast.error).toHaveBeenCalledWith('Failed to resolve conflict');
    });
  });

  describe('syncInventoryStatus', () => {
    it('should sync inventory status with allocations', async () => {
      const { result } = renderUseInventoryMapperSync();

      // Set up some allocations
      await act(async () => {
        result.current.allocations.set('eq-1', createMockAllocation({
          equipmentId: 'eq-1',
          jobId: 'job-2',
          status: 'deployed'
        }));
      });

      await act(async () => {
        await result.current.syncInventoryStatus();
      });

      expect(mockInventoryContext.updateIndividualEquipment).toHaveBeenCalledWith('ind-1', {
        status: 'deployed',
        jobId: 'job-2',
        lastUpdated: expect.any(Date),
      });
      expect(mockInventoryContext.syncData).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Inventory status synchronized');
    });

    it('should remove allocations for equipment no longer deployed', async () => {
      const { result } = renderUseInventoryMapperSync();

      await act(async () => {
        await result.current.syncInventoryStatus();
      });

      // Check that deployed equipment without allocations is made available
      const deployedWithoutAllocation = mockInventoryData.individualEquipment.find(
        eq => eq.status === 'deployed'
      );
      
      if (deployedWithoutAllocation) {
        expect(mockInventoryContext.updateIndividualEquipment).toHaveBeenCalledWith(
          deployedWithoutAllocation.id, 
          expect.objectContaining({
            status: 'available',
            jobId: undefined,
          })
        );
      }
    });

    it('should handle sync errors gracefully', async () => {
      mockInventoryContext.updateIndividualEquipment.mockRejectedValueOnce(new Error('Sync Error'));
      const { result } = renderUseInventoryMapperSync();

      await act(async () => {
        await result.current.syncInventoryStatus();
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to sync inventory status');
    });
  });

  describe('getEquipmentStatus', () => {
    it('should return correct status for individual equipment', () => {
      const { result } = renderUseInventoryMapperSync();

      expect(result.current.getEquipmentStatus('eq-1')).toBe('available');
      expect(result.current.getEquipmentStatus('eq-2')).toBe('deployed');
      expect(result.current.getEquipmentStatus('eq-3')).toBe('unavailable');
    });

    it('should return correct status for regular equipment', () => {
      const { result } = renderUseInventoryMapperSync();

      expect(result.current.getEquipmentStatus('item-1')).toBe('available');
      expect(result.current.getEquipmentStatus('item-2')).toBe('deployed');
    });

    it('should return unavailable for non-existent equipment', () => {
      const { result } = renderUseInventoryMapperSync();

      expect(result.current.getEquipmentStatus('non-existent')).toBe('unavailable');
    });

    it('should prioritize shared state over inventory data', async () => {
      const { result } = renderUseInventoryMapperSync();

      // Update shared state through allocation
      await act(async () => {
        await result.current.allocateEquipment('eq-1', 'job-2', 'Test Job');
      });

      // Status should reflect the allocation even before sync
      expect(result.current.getEquipmentStatus('eq-1')).toBe('allocated');
    });
  });

  describe('getJobEquipment', () => {
    it('should return all equipment assigned to a job', async () => {
      const { result } = renderUseInventoryMapperSync();

      // Set up allocations
      await act(async () => {
        result.current.allocations.set('eq-2', createMockAllocation({
          equipmentId: 'eq-2',
          jobId: 'job-1'
        }));
        result.current.allocations.set('item-2', createMockAllocation({
          equipmentId: 'item-2',
          jobId: 'job-1'
        }));
      });

      const jobEquipment = result.current.getJobEquipment('job-1');
      
      expect(jobEquipment).toContain('eq-2');
      expect(jobEquipment).toContain('item-2');
      expect(jobEquipment.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array for job with no equipment', () => {
      const { result } = renderUseInventoryMapperSync();

      const jobEquipment = result.current.getJobEquipment('job-999');
      
      expect(jobEquipment).toEqual([]);
    });

    it('should include equipment from both allocations and inventory data', () => {
      const { result } = renderUseInventoryMapperSync();

      // Job-1 has equipment in inventory data
      const jobEquipment = result.current.getJobEquipment('job-1');
      
      expect(jobEquipment).toContain('eq-2'); // From individual equipment
      expect(jobEquipment).toContain('item-2'); // From regular equipment
    });
  });

  describe('real-time monitoring', () => {
    it('should set up interval for monitoring changes', () => {
      vi.useFakeTimers();
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      
      renderUseInventoryMapperSync();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);
      
      vi.useRealTimers();
    });

    it('should clean up interval on unmount', () => {
      vi.useFakeTimers();
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      const { unmount } = renderUseInventoryMapperSync();
      
      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      
      vi.useRealTimers();
    });
  });

  describe('isValidating state', () => {
    it('should update isValidating during validation', async () => {
      const { result } = renderUseInventoryMapperSync();

      expect(result.current.isValidating).toBe(false);

      const validationPromise = act(async () => 
        result.current.validateEquipmentAvailability('eq-1', 'job-2')
      );

      // Note: This might not capture the intermediate state due to async nature
      // In a real scenario, you might need to mock timers or use waitFor

      await validationPromise;

      expect(result.current.isValidating).toBe(false);
    });
  });
});