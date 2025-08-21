
import { useCallback } from 'react';
import { useInventory } from '@/contexts/InventoryContext';
import { toast } from 'sonner';
import { DetailedEquipmentUsage } from './useEquipmentUsageAnalyzer';
import { useJobStorageIntegration } from '@/hooks/useJobStorageIntegration';
import { useJobs } from '@/hooks/useJobs';

export const useEquipmentAllocatorV2 = (jobId: string) => {
  const { data, updateIndividualEquipment } = useInventory();
  const { ensureJobLocationExists } = useJobStorageIntegration();
  const { getJobById } = useJobs();

  const allocateEquipmentFromUsage = useCallback(async (usage: DetailedEquipmentUsage, locationId: string) => {
    console.log('🔍 Allocating equipment for job:', jobId, 'from location:', locationId);
    console.log('📦 Usage requirements:', usage);
    
    // Ensure job exists as a storage location before allocating equipment
    const job = getJobById(jobId);
    if (job) {
      try {
        await ensureJobLocationExists(job.name);
      } catch (error) {
        console.error('Failed to ensure job location exists:', error);
      }
    }
    
    const allocatedItems: string[] = [];
    const updatePromises: Promise<void>[] = [];

    // Handle cables - all are now individual items
    if (usage.cables && typeof usage.cables === 'object') {
      for (const [typeId, details] of Object.entries(usage.cables)) {
        if (details.quantity > 0) {
          const availableEquipment = data.individualEquipment.filter(
            eq => eq.typeId === typeId && eq.locationId === locationId && eq.status === 'available'
          );

          if (availableEquipment.length >= details.quantity) {
            for (let i = 0; i < details.quantity; i++) {
              console.log(`📍 Allocating ${availableEquipment[i].equipmentId} to job ${jobId}`);
              updatePromises.push(
                updateIndividualEquipment(availableEquipment[i].id, {
                  status: 'deployed',
                  jobId: jobId
                  // Keep current locationId - equipment stays at physical location
                })
              );
            }
            allocatedItems.push(`${details.quantity}x ${details.typeName}`);
          } else {
            toast.error(`Insufficient ${details.typeName} at selected location`);
          }
        }
      }
    }

    // Handle gauges as individual items
    if (usage.gauges1502 > 0) {
      const availableGauges = data.individualEquipment.filter(
        eq => eq.typeId === 'pressure-gauge-1502' && eq.locationId === locationId && eq.status === 'available'
      );

      if (availableGauges.length >= usage.gauges1502) {
        for (let i = 0; i < usage.gauges1502; i++) {
          updatePromises.push(
            updateIndividualEquipment(availableGauges[i].id, {
              status: 'deployed',
              jobId: jobId
              // Keep current locationId - equipment stays at physical location
            })
          );
        }
        allocatedItems.push(`${usage.gauges1502}x 1502 Pressure Gauge`);
      } else {
        toast.error(`Insufficient 1502 Pressure Gauges at selected location`);
      }
    }
    
    if (usage.pencilGauges > 0) {
      const availablePencilGauges = data.individualEquipment.filter(
        eq => eq.typeId === 'pressure-gauge-pencil' && eq.locationId === locationId && eq.status === 'available'
      );

      if (availablePencilGauges.length >= usage.pencilGauges) {
        for (let i = 0; i < usage.pencilGauges; i++) {
          updatePromises.push(
            updateIndividualEquipment(availablePencilGauges[i].id, {
              status: 'deployed',
              jobId: jobId
              // Keep current locationId - equipment stays at physical location
            })
          );
        }
        allocatedItems.push(`${usage.pencilGauges}x Pencil Gauge`);
      } else {
        toast.error(`Insufficient Pencil Gauges at selected location`);
      }
    }

    // Allocate individual equipment types (should be tracked individually)
    const equipmentAllocations = [
      { typeId: 'shearstream-box', quantity: usage.shearstreamBoxes, name: 'ShearStream Box' },
      { typeId: 'starlink', quantity: usage.satellite, name: 'Starlink' },
    ];

    for (const { typeId, quantity, name } of equipmentAllocations) {
      if (quantity > 0) {
        const availableEquipment = data.individualEquipment.filter(
          eq => eq.typeId === typeId && eq.locationId === locationId && eq.status === 'available'
        );

        if (availableEquipment.length >= quantity) {
          for (let i = 0; i < quantity; i++) {
            updatePromises.push(
              updateIndividualEquipment(availableEquipment[i].id, {
                status: 'deployed',
                jobId: jobId
                // Keep current locationId - equipment stays at physical location
              })
            );
          }
          allocatedItems.push(`${quantity}x ${name}`);
        } else {
          toast.error(`Insufficient ${name} at selected location`);
        }
      }
    }

    // Handle Customer Computers/Tablets separately - they can be either CC or CT
    if (usage.computers > 0) {
      // Get all available customer computers and tablets
      const availableCustomerEquipment = data.individualEquipment.filter(
        eq => (eq.typeId === 'customer-computer' || eq.typeId === 'customer-tablet') && 
              eq.locationId === locationId && 
              eq.status === 'available'
      );

      if (availableCustomerEquipment.length >= usage.computers) {
        // Allocate from available customer equipment (mix of computers and tablets)
        for (let i = 0; i < usage.computers; i++) {
          updatePromises.push(
            updateIndividualEquipment(availableCustomerEquipment[i].id, {
              status: 'deployed',
              jobId: jobId
              // Keep current locationId - equipment stays at physical location
            })
          );
        }
        
        const computerCount = availableCustomerEquipment.slice(0, usage.computers)
          .filter(eq => eq.typeId === 'customer-computer').length;
        const tabletCount = availableCustomerEquipment.slice(0, usage.computers)
          .filter(eq => eq.typeId === 'customer-tablet').length;
        
        if (computerCount > 0) {
          allocatedItems.push(`${computerCount}x Customer Computer`);
        }
        if (tabletCount > 0) {
          allocatedItems.push(`${tabletCount}x Customer Tablet`);
        }
      } else {
        toast.error(`Insufficient Customer Computers/Tablets at selected location`);
      }
    }


    // Wait for all individual equipment updates to complete
    await Promise.all(updatePromises);
    
    console.log('✅ Allocation complete! Allocated items:', allocatedItems);
    console.log(`📍 Equipment allocated to job: ${jobId} (physical location unchanged)`);
    
    return allocatedItems;
  }, [jobId, data.individualEquipment, data.equipmentTypes, updateIndividualEquipment, ensureJobLocationExists, getJobById]);

  return {
    allocateEquipmentFromUsage
  };
};
