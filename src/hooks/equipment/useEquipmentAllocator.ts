
import { useInventoryData, EquipmentItem } from '../useInventoryData';
import { useAuditTrail } from '../useAuditTrail';
import { toast } from 'sonner';
import { EquipmentUsage } from './useEquipmentUsageCalculator';

export const useEquipmentAllocator = (jobId: string) => {
  const { data, updateEquipmentItems } = useInventoryData();
  const { addAuditEntry } = useAuditTrail();

  const cleanupDuplicateDeployments = (updatedItems: EquipmentItem[]) => {
    console.log(`Cleaning up duplicates for job ${jobId}...`);
    const seenDeployments = new Set<string>();
    const cleanedItems = updatedItems.filter(item => {
      if (item.status === 'deployed' && item.jobId === jobId) {
        const deploymentKey = `${item.typeId}-${item.jobId}`;
        if (seenDeployments.has(deploymentKey)) {
          console.log(`Removing duplicate deployment for ${deploymentKey}`);
          return false;
        }
        seenDeployments.add(deploymentKey);
      }
      return true;
    });
    
    const removedCount = updatedItems.length - cleanedItems.length;
    if (removedCount > 0) {
      console.log(`Removed ${removedCount} duplicate deployment records for job ${jobId}`);
    }
    
    return cleanedItems;
  };

  const getExistingDeployment = (updatedItems: EquipmentItem[], typeId: string) => {
    return updatedItems.find(
      item => item.typeId === typeId && item.jobId === jobId && item.status === 'deployed'
    );
  };

  const allocateOrUpdateEquipment = (
    updatedItems: EquipmentItem[], 
    typeId: string, 
    quantity: number, 
    locationId: string
  ): { allocated: number; updated: boolean } => {
    console.log(`Allocating/updating ${quantity} units of type ${typeId} for job ${jobId}`);
    
    // Check if equipment is already deployed for this job
    const existingDeployment = getExistingDeployment(updatedItems, typeId);
    
    if (existingDeployment) {
      console.log(`Found existing deployment: ${existingDeployment.quantity} units`);
      
      // Update existing deployment if quantity changed
      if (existingDeployment.quantity !== quantity) {
        const quantityDiff = quantity - existingDeployment.quantity;
        console.log(`Quantity difference: ${quantityDiff}`);
        
        // Find available equipment at the location
        const availableItem = updatedItems.find(
          item => item.typeId === typeId && item.locationId === locationId && item.status === 'available'
        );
        
        if (quantityDiff > 0) {
          // Need more equipment
          if (availableItem && availableItem.quantity >= quantityDiff) {
            availableItem.quantity -= quantityDiff;
            availableItem.lastUpdated = new Date();
            existingDeployment.quantity = quantity;
            existingDeployment.lastUpdated = new Date();
            
            console.log(`Increased deployment to ${quantity} units`);
            return { allocated: quantity, updated: true };
          } else {
            const available = availableItem ? availableItem.quantity : 0;
            const typeName = data.equipmentTypes.find(t => t.id === typeId)?.name || 'Unknown';
            toast.warning(`Insufficient ${typeName} to increase deployment (need ${quantityDiff} more, have ${available})`);
            return { allocated: existingDeployment.quantity, updated: false };
          }
        } else {
          // Returning equipment
          const returnQuantity = Math.abs(quantityDiff);
          
          if (availableItem) {
            availableItem.quantity += returnQuantity;
            availableItem.lastUpdated = new Date();
          } else {
            // Create new available item
            updatedItems.push({
              id: `available-${typeId}-${locationId}-${Date.now()}`,
              typeId,
              locationId,
              quantity: returnQuantity,
              status: 'available',
              lastUpdated: new Date(),
            });
          }
          
          existingDeployment.quantity = quantity;
          existingDeployment.lastUpdated = new Date();
          
          console.log(`Reduced deployment to ${quantity} units, returned ${returnQuantity}`);
          return { allocated: quantity, updated: true };
        }
      } else {
        console.log(`No change needed, already deployed ${quantity} units`);
        return { allocated: quantity, updated: false };
      }
    }

    // No existing deployment - create new one
    const availableItem = updatedItems.find(
      item => item.typeId === typeId && item.locationId === locationId && item.status === 'available'
    );

    if (availableItem && availableItem.quantity >= quantity) {
      availableItem.quantity -= quantity;
      availableItem.lastUpdated = new Date();
      
      // Use consistent ID without timestamp
      updatedItems.push({
        id: `deployed-${typeId}-${jobId}`,
        typeId,
        locationId,
        quantity,
        status: 'deployed',
        jobId,
        lastUpdated: new Date(),
      });

      console.log(`Created new deployment: ${quantity} units`);
      return { allocated: quantity, updated: true };
    } else {
      const typeName = data.equipmentTypes.find(t => t.id === typeId)?.name || 'Unknown';
      const available = availableItem ? availableItem.quantity : 0;
      toast.error(`Insufficient ${typeName} available (need ${quantity}, have ${available})`);
      return { allocated: 0, updated: false };
    }
  };

  const performEquipmentAllocation = (
    locationId: string,
    usage: EquipmentUsage,
    updatedItems: EquipmentItem[]
  ): Array<{ typeId: string; quantity: number; typeName: string; updated: boolean }> => {
    console.log(`Starting equipment allocation for job ${jobId}:`, usage);
    
    // Clean up any existing duplicates first
    const cleanedItems = cleanupDuplicateDeployments(updatedItems);
    updatedItems.length = 0;
    updatedItems.push(...cleanedItems);

    const allocatedItems: Array<{ typeId: string; quantity: number; typeName: string; updated: boolean }> = [];

    // Type mapping for allocation
    const typeMapping: { [key: string]: string } = {
      '100ft': '100ft-cable',
      '200ft': '200ft-cable',
      '300ft': '300ft-cable-new',
    };

    // Allocate cables
    Object.entries(usage.cables).forEach(([cableType, quantity]) => {
      const typeId = typeMapping[cableType];
      if (typeId && quantity > 0) {
        const result = allocateOrUpdateEquipment(updatedItems, typeId, quantity, locationId);
        if (result.allocated > 0) {
          allocatedItems.push({
            typeId,
            quantity: result.allocated,
            typeName: data.equipmentTypes.find(t => t.id === typeId)?.name || 'Unknown',
            updated: result.updated,
          });
        }
      }
    });

    // Allocate other equipment
    const allocations = [
      { typeId: 'pressure-gauge-1502', quantity: usage.gauges, name: '1502 Pressure Gauge' },
      { typeId: 'y-adapter', quantity: usage.adapters, name: 'Y Adapter' },
      { typeId: 'customer-computer', quantity: usage.computers, name: 'Customer Computer' },
      { typeId: 'starlink', quantity: usage.satellite, name: 'Starlink' },
    ];

    allocations.forEach(({ typeId, quantity, name }) => {
      if (quantity > 0) {
        const result = allocateOrUpdateEquipment(updatedItems, typeId, quantity, locationId);
        if (result.allocated > 0) {
          allocatedItems.push({
            typeId,
            quantity: result.allocated,
            typeName: name,
            updated: result.updated,
          });
        }
      }
    });

    console.log(`Allocation complete. Items processed:`, allocatedItems);
    return allocatedItems;
  };

  const createAuditEntries = (allocatedItems: Array<{ typeId: string; quantity: number; typeName: string; updated: boolean }>, locationId: string) => {
    allocatedItems.filter(item => item.updated).forEach(item => {
      addAuditEntry({
        action: 'deploy',
        entityType: 'equipment',
        entityId: item.typeId,
        details: {
          quantity: item.quantity,
          fromLocation: locationId,
          jobId,
        },
        metadata: { source: 'manual' },
      });
    });
  };

  return {
    allocateOrUpdateEquipment,
    performEquipmentAllocation,
    createAuditEntries,
    cleanupDuplicateDeployments,
  };
};
