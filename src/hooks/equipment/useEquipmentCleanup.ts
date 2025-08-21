import { useCallback } from 'react';
import { useInventory } from '@/contexts/InventoryContext';
import { toast } from 'sonner';
import { tursoDb } from '@/services/tursoDb';

export const useEquipmentCleanup = () => {
  const { refreshData } = useInventory();

  const cleanupIncorrectDeployments = useCallback(async (jobId: string) => {
    console.log(`🧹 Starting cleanup for incorrect deployments on job: ${jobId}`);
    
    try {
      // Get the job data to see what equipment should actually be deployed
      const jobs = await tursoDb.getJobs();
      const job = jobs.find(j => j.id === jobId);
      
      if (!job) {
        console.error('Job not found');
        return;
      }

      const equipmentAssignment = job.equipment_assignment || {};
      const actuallyDeployedIds = new Set([
        ...(equipmentAssignment.shearstreamBoxIds || []),
        ...(equipmentAssignment.customerComputerIds || []),
        equipmentAssignment.starlinkId
      ].filter(Boolean));

      console.log('Actually deployed equipment IDs:', actuallyDeployedIds);

      // Get all individual equipment marked as deployed to this job
      const individualEquipment = await tursoDb.getIndividualEquipment();
      const incorrectlyDeployed = individualEquipment.filter(eq => 
        eq.jobId === jobId && 
        eq.status === 'deployed' && 
        !actuallyDeployedIds.has(eq.equipment_id)
      );

      console.log(`Found ${incorrectlyDeployed.length} incorrectly deployed items`);

      // Fix each incorrectly deployed item
      for (const equipment of incorrectlyDeployed) {
        console.log(`Fixing ${equipment.equipment_id} - setting to available`);
        await tursoDb.updateIndividualEquipment(equipment.id, {
          ...equipment,
          status: 'available',
          jobId: null,
          locationId: equipment.locationId || 'midland-office',
          locationType: 'storage'
        });
      }

      await refreshData();
      toast.success(`Cleaned up ${incorrectlyDeployed.length} incorrect deployments`);
      
    } catch (error) {
      console.error('Failed to cleanup deployments:', error);
      toast.error('Failed to cleanup incorrect deployments');
    }
  }, [refreshData]);

  return {
    cleanupIncorrectDeployments
  };
};