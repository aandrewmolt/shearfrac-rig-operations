import { useEffect, useCallback, useRef } from 'react';
import { useInventoryMapperContext } from '@/contexts/InventoryMapperContext';
import { useInventory } from '@/contexts/InventoryContext';
import { useInventoryMapperRealtime } from './useInventoryMapperRealtime';
import { useBatchEquipmentSync } from './useBatchEquipmentSync';
import { toast } from 'sonner';
import { EquipmentItem, IndividualEquipment } from '@/types/inventory';
import { JobDiagram } from './useJobs';
import { EquipmentConflict, EquipmentAllocation } from '@/types/equipment-allocation';

export interface UseInventoryMapperSyncResult {
  // State
  isValidating: boolean;
  conflicts: EquipmentConflict[];
  allocations: Map<string, EquipmentAllocation>;
  
  // Methods
  validateEquipmentAvailability: (equipmentId: string, jobId: string) => Promise<boolean>;
  allocateEquipment: (equipmentId: string, jobId: string, jobName: string) => Promise<void>;
  releaseEquipment: (equipmentId: string, jobId: string) => Promise<void>;
  resolveConflict: (conflict: EquipmentConflict, resolution: 'current' | 'requested') => Promise<void>;
  syncInventoryStatus: () => Promise<void>;
  getEquipmentStatus: (equipmentId: string) => 'available' | 'allocated' | 'deployed' | 'unavailable';
  getJobEquipment: (jobId: string) => string[];
}

export const useInventoryMapperSync = (): UseInventoryMapperSyncResult => {
  const { 
    sharedEquipmentState, 
    updateSharedEquipment, 
    addConflict, 
    removeConflict,
    conflicts,
    allocations,
    setAllocation,
    removeAllocation,
    setSyncStatus,
    setLastSyncTime
  } = useInventoryMapperContext();
  
  const { 
    data: inventoryData,
    updateIndividualEquipment,
    updateSingleEquipmentItem,
    getAvailableQuantityByType,
    syncData
  } = useInventory();
  
  const { batchSyncInventoryStatus } = useBatchEquipmentSync();

  const isValidatingRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

  // Validate equipment availability before assignment
  const validateEquipmentAvailability = useCallback(async (
    equipmentId: string, 
    jobId: string
  ): Promise<boolean> => {
    try {
      isValidatingRef.current = true;

      // Check individual equipment
      const individualEquipment = inventoryData.individualEquipment.find(
        item => item.equipmentId === equipmentId
      );

      if (individualEquipment) {
        // Check if already deployed
        if (individualEquipment.status === 'deployed' && individualEquipment.jobId !== jobId) {
          const existingAllocation = allocations.get(equipmentId);
          
          // Create conflict record
          const conflict: EquipmentConflict = {
            equipmentId,
            equipmentName: individualEquipment.name,
            currentJobId: individualEquipment.jobId!,
            currentJobName: existingAllocation?.jobName || 'Unknown Job',
            requestedJobId: jobId,
            requestedJobName: 'Current Job',
            timestamp: new Date()
          };
          
          addConflict(conflict);
          return false;
        }

        // Check maintenance or red-tagged status
        if (individualEquipment.status === 'maintenance' || individualEquipment.status === 'red-tagged') {
          toast.error(`Equipment ${individualEquipment.name} is not available (Status: ${individualEquipment.status})`);
          return false;
        }

        return true;
      }

      // Check regular equipment items
      const equipmentItem = inventoryData.equipmentItems.find(
        item => item.id === equipmentId
      );

      if (equipmentItem) {
        if (equipmentItem.status === 'deployed' && equipmentItem.jobId !== jobId) {
          toast.error('Equipment is already deployed to another job');
          return false;
        }

        if (equipmentItem.status === 'red-tagged') {
          toast.error('Equipment is red-tagged and unavailable');
          return false;
        }

        // Check quantity availability
        const availableQty = getAvailableQuantityByType(equipmentItem.typeId);
        if (availableQty < equipmentItem.quantity) {
          toast.error('Insufficient equipment quantity available');
          return false;
        }

        return true;
      }

      // Equipment not found
      toast.error('Equipment not found in inventory');
      return false;

    } catch (error) {
      console.error('Error validating equipment availability:', error);
      toast.error('Failed to validate equipment availability');
      return false;
    } finally {
      isValidatingRef.current = false;
    }
  }, [inventoryData, allocations, addConflict, getAvailableQuantityByType]);

  // Allocate equipment to a job
  const allocateEquipment = useCallback(async (
    equipmentId: string, 
    jobId: string,
    jobName: string
  ): Promise<void> => {
    try {
      // Validate availability first
      const isAvailable = await validateEquipmentAvailability(equipmentId, jobId);
      if (!isAvailable) {
        throw new Error('Equipment not available for allocation');
      }

      // Update allocation tracking
      const allocation: EquipmentAllocation = {
        equipmentId,
        jobId,
        jobName,
        allocatedAt: new Date(),
        status: 'allocated'
      };

      // Update shared state
      updateSharedEquipment(equipmentId, {
        status: 'allocated',
        jobId
      });

      // Update inventory status
      const individualEquipment = inventoryData.individualEquipment.find(
        item => item.equipmentId === equipmentId
      );

      if (individualEquipment) {
        await updateIndividualEquipment(individualEquipment.id, {
          status: 'deployed',
          jobId
        });
      } else {
        const equipmentItem = inventoryData.equipmentItems.find(
          item => item.id === equipmentId
        );
        
        if (equipmentItem) {
          await updateSingleEquipmentItem(equipmentId, {
            status: 'deployed',
            jobId
          });
        }
      }

      toast.success(`Equipment allocated to ${jobName}`);
      
      // Trigger sync after a delay
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => syncData(), 1000);

    } catch (error) {
      console.error('Error allocating equipment:', error);
      toast.error('Failed to allocate equipment');
      throw error;
    }
  }, [validateEquipmentAvailability, updateSharedEquipment, inventoryData, 
      updateIndividualEquipment, updateSingleEquipmentItem, syncData]);

  // Release equipment from a job
  const releaseEquipment = useCallback(async (
    equipmentId: string,
    jobId: string
  ): Promise<void> => {
    try {
      // Update shared state
      updateSharedEquipment(equipmentId, {
        status: 'available',
        jobId: null
      });

      // Update inventory status
      const individualEquipment = inventoryData.individualEquipment.find(
        item => item.equipmentId === equipmentId
      );

      if (individualEquipment) {
        await updateIndividualEquipment(individualEquipment.id, {
          status: 'available',
          jobId: null
        });
      } else {
        const equipmentItem = inventoryData.equipmentItems.find(
          item => item.id === equipmentId
        );
        
        if (equipmentItem) {
          await updateSingleEquipmentItem(equipmentId, {
            status: 'available',
            jobId: null
          });
        }
      }

      toast.success('Equipment released successfully');
      
      // Trigger sync
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => syncData(), 1000);

    } catch (error) {
      console.error('Error releasing equipment:', error);
      toast.error('Failed to release equipment');
      throw error;
    }
  }, [updateSharedEquipment, inventoryData, updateIndividualEquipment, 
      updateSingleEquipmentItem, syncData]);

  // Resolve equipment conflicts
  const resolveConflict = useCallback(async (
    conflict: EquipmentConflict,
    resolution: 'current' | 'requested'
  ): Promise<void> => {
    try {
      if (resolution === 'requested') {
        // Release from current job and allocate to requested job
        await releaseEquipment(conflict.equipmentId, conflict.currentJobId);
        await allocateEquipment(
          conflict.equipmentId, 
          conflict.requestedJobId, 
          conflict.requestedJobName
        );
      }
      
      // Remove conflict from list
      removeConflict(conflict.equipmentId);
      
      toast.success('Conflict resolved successfully');
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast.error('Failed to resolve conflict');
      throw error;
    }
  }, [releaseEquipment, allocateEquipment, removeConflict]);

  // Sync inventory status with current allocations (with batch operations)
  const syncInventoryStatus = useCallback(async (): Promise<void> => {
    try {
      setSyncStatus('syncing');
      const startTime = performance.now();
      
      // Collect all deployed equipment IDs from allocations
      const deployedEquipmentIds: string[] = [];
      allocations.forEach((allocation, equipmentId) => {
        if (allocation.status === 'allocated') {
          deployedEquipmentIds.push(equipmentId);
        }
      });

      // Use batch sync for individual equipment
      const result = await batchSyncInventoryStatus('current', deployedEquipmentIds);
      
      // Handle bulk equipment items separately
      const bulkUpdates: Promise<void>[] = [];
      for (const item of inventoryData.equipmentItems) {
        const allocation = allocations.get(item.id);
        
        if (allocation && item.status !== 'deployed') {
          bulkUpdates.push(
            updateSingleEquipmentItem(item.id, {
              status: 'deployed',
              jobId: allocation.jobId,
              lastUpdated: new Date()
            })
          );
        } else if (!allocation && item.status === 'deployed') {
          bulkUpdates.push(
            updateSingleEquipmentItem(item.id, {
              status: 'available',
              jobId: undefined,
              lastUpdated: new Date()
            })
          );
        }
      }

      await Promise.all(bulkUpdates);
      await syncData();
      
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      setSyncStatus('idle');
      setLastSyncTime(new Date());
      
      if (result.successCount > 0 || bulkUpdates.length > 0) {
        toast.success(`Inventory synced: ${result.successCount} individual, ${bulkUpdates.length} bulk items (${duration}ms)`);
      } else {
        toast.info('Inventory already in sync');
      }
    } catch (error) {
      console.error('Error syncing inventory status:', error);
      setSyncStatus('error');
      toast.error('Failed to sync inventory status');
    }
  }, [inventoryData, allocations, updateSingleEquipmentItem, syncData, 
      batchSyncInventoryStatus, setSyncStatus, setLastSyncTime]);

  // Get equipment status
  const getEquipmentStatus = useCallback((equipmentId: string): 
    'available' | 'allocated' | 'deployed' | 'unavailable' => {
    // Check shared state first
    const sharedState = sharedEquipmentState.get(equipmentId);
    if (sharedState?.status) {
      return sharedState.status as 'available' | 'deployed' | 'maintenance' | 'red-tagged' | 'retired';
    }

    // Check inventory
    const individualEquipment = inventoryData.individualEquipment.find(
      item => item.equipmentId === equipmentId
    );

    if (individualEquipment) {
      if (individualEquipment.status === 'available') return 'available';
      if (individualEquipment.status === 'deployed') return 'deployed';
      return 'unavailable';
    }

    const equipmentItem = inventoryData.equipmentItems.find(
      item => item.id === equipmentId
    );

    if (equipmentItem) {
      if (equipmentItem.status === 'available') return 'available';
      if (equipmentItem.status === 'deployed') return 'deployed';
      return 'unavailable';
    }

    return 'unavailable';
  }, [sharedEquipmentState, inventoryData]);

  // Sync job equipment with batch operations
  const syncJobEquipment = useCallback(async (job: { id: string; equipmentAssignment?: Record<string, unknown>; nodes?: Node[]; edges?: Edge[] }): Promise<void> => {
    try {
      setSyncStatus('syncing');
      const deployedEquipmentIds: string[] = [];
      
      // Collect all equipment that should be deployed to this job
      if (job.equipmentAssignment) {
        const assignment = job.equipmentAssignment;
        
        // Add ShearStream boxes
        assignment.shearstreamBoxIds?.forEach((id: string) => {
          if (id) deployedEquipmentIds.push(id);
        });
        
        // Add Starlink
        if (assignment.starlinkId) {
          deployedEquipmentIds.push(assignment.starlinkId);
        }
        
        // Add Customer Computers
        assignment.customerComputerIds?.forEach((id: string) => {
          if (id) deployedEquipmentIds.push(id);
        });
      }
      
      // Use batch sync for better performance
      const result = await batchSyncInventoryStatus(job.id, deployedEquipmentIds);
      
      // Update allocations
      deployedEquipmentIds.forEach(equipmentId => {
        setAllocation(equipmentId, {
          equipmentId: equipmentId,
          jobId: job.id,
          jobName: job.name,
          status: 'allocated',
          timestamp: new Date()
        });
      });
      
      setSyncStatus('idle');
      setLastSyncTime(new Date());
      
      if (result.successCount > 0) {
        toast.success(`Job equipment synced: ${result.successCount} items in ${result.duration}ms`);
      }
    } catch (error) {
      console.error('Failed to sync job equipment:', error);
      setSyncStatus('error');
      toast.error('Failed to sync job equipment');
    }
  }, [batchSyncInventoryStatus, setAllocation, setSyncStatus, setLastSyncTime]);

  // Get all equipment assigned to a job
  const getJobEquipment = useCallback((jobId: string): string[] => {
    const equipment: string[] = [];

    // Check allocations
    allocations.forEach((allocation, equipmentId) => {
      if (allocation.jobId === jobId) {
        equipment.push(equipmentId);
      }
    });

    // Check inventory for any missed allocations
    inventoryData.individualEquipment.forEach(item => {
      if (item.jobId === jobId && !equipment.includes(item.equipmentId)) {
        equipment.push(item.equipmentId);
      }
    });

    inventoryData.equipmentItems.forEach(item => {
      if (item.jobId === jobId && !equipment.includes(item.id)) {
        equipment.push(item.id);
      }
    });

    return equipment;
  }, [allocations, inventoryData]);

  // Set up real-time monitoring
  const { isConnected: isRealtimeConnected } = useInventoryMapperRealtime();

  useEffect(() => {
    if (isRealtimeConnected) {
      console.log('Real-time sync is active');
    }
    
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [isRealtimeConnected]);

  return {
    isValidating: isValidatingRef.current,
    conflicts,
    allocations,
    validateEquipmentAvailability,
    allocateEquipment,
    releaseEquipment,
    resolveConflict,
    syncInventoryStatus,
    syncJobEquipment,
    getEquipmentStatus,
    getJobEquipment
  };
};