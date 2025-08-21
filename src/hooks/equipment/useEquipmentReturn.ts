import { useCallback } from 'react';
import { useInventory } from '@/contexts/InventoryContext';
import { toast } from 'sonner';

export const useEquipmentReturn = () => {
  const { data, updateIndividualEquipment } = useInventory();

  const returnAllEquipmentFromJob = useCallback(async (jobId: string) => {
    console.log(`🔄 Returning all equipment from job: ${jobId}`);
    
    try {
      // Return individual equipment (tracked items)
      const deployedIndividualEquipment = data.individualEquipment.filter(
        eq => eq.jobId === jobId && eq.status === 'deployed'
      );

      console.log(`📦 Found ${deployedIndividualEquipment.length} individual items to return`);

      // Return each individual item to its original location
      const individualReturnPromises = deployedIndividualEquipment.map(async (equipment) => {
        // Find the original storage location (not the job location)
        const originalLocation = data.storageLocations.find(loc => 
          loc.locationType === 'storage' && loc.isDefault
        );

        if (!originalLocation) {
          console.error('No default storage location found');
          return;
        }

        await updateIndividualEquipment(equipment.id, {
          status: 'available',
          jobId: null,
          locationId: originalLocation.id,
          locationType: 'storage'
        });
      });

      await Promise.all(individualReturnPromises);

      toast.success('All equipment returned to storage');
      console.log('✅ Equipment return completed');
      
    } catch (error) {
      console.error('❌ Failed to return equipment:', error);
      toast.error('Failed to return some equipment');
      throw error;
    }
  }, [data.individualEquipment, data.storageLocations, updateIndividualEquipment]);

  const returnSpecificEquipment = useCallback(async (equipmentId: string) => {
    try {
      const equipment = data.individualEquipment.find(eq => eq.id === equipmentId);
      
      if (!equipment) {
        throw new Error('Equipment not found');
      }

      // Find default storage location
      const defaultLocation = data.storageLocations.find(loc => 
        loc.locationType === 'storage' && loc.isDefault
      );

      if (!defaultLocation) {
        throw new Error('No default storage location found');
      }

      await updateIndividualEquipment(equipmentId, {
        status: 'available',
        jobId: null,
        locationId: defaultLocation.id,
        locationType: 'storage'
      });

      toast.success(`${equipment.name} returned to storage`);
      
    } catch (error) {
      console.error('Failed to return equipment:', error);
      toast.error('Failed to return equipment');
      throw error;
    }
  }, [data.individualEquipment, data.storageLocations, updateIndividualEquipment]);

  return {
    returnAllEquipmentFromJob,
    returnSpecificEquipment
  };
};