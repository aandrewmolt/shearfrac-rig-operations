
import React, { createContext, useContext, useState } from 'react';
import { InventoryData } from '@/types/inventory';
import { useEquipmentQueries } from '@/hooks/useEquipmentQueries';
import { useTursoEquipmentUtils } from '@/hooks/equipment/useTursoEquipmentUtils';
import { InventoryContextType } from './inventory/InventoryContextTypes';
import { useInventoryMutations } from './inventory/useInventoryMutations';
import { useInventoryRealtime } from './inventory/useInventoryRealtime';
import { useInventoryUtils } from './inventory/useInventoryUtils';
import { safeArray, safeFilter } from '@/utils/safeDataAccess';
import { getEquipmentDisplayLocation, filterEquipmentByLocation, groupEquipmentByLocation } from '@/utils/equipmentLocation';

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    equipmentTypes,
    storageLocations,
    individualEquipment,
    isLoading: queriesLoading,
    refetch
  } = useEquipmentQueries();

  const tursoUtils = useTursoEquipmentUtils(individualEquipment);
  const inventoryUtils = useInventoryUtils(equipmentTypes, storageLocations);
  const mutations = useInventoryMutations(storageLocations);
  
  // Set up real-time subscriptions with optimistic delete handling
  const { optimisticDeletes } = useInventoryRealtime(refetch);

  // Filter out optimistically deleted items
  const filteredIndividualEquipment = safeFilter(
    individualEquipment,
    item => !optimisticDeletes.has(item.id)
  );

  // Combined data object with filtered equipment - NO LOCAL STORAGE
  const data: InventoryData = {
    equipmentTypes: safeArray(equipmentTypes),
    storageLocations: safeArray(storageLocations),
    individualEquipment: safeArray(filteredIndividualEquipment),
    equipmentItems: safeArray([]), // Empty array for backward compatibility
    lastSync: new Date(),
  };

  // Helper methods using centralized location logic
  const getEquipmentAtLocation = (locationId: string, locationType: 'storage' | 'job' = 'storage') => {
    return filterEquipmentByLocation(data.individualEquipment, locationId, locationType);
  };
  
  const getEquipmentGroupedByLocation = () => {
    return groupEquipmentByLocation(data.individualEquipment);
  };
  
  const contextValue: InventoryContextType = {
    data,
    isLoading: queriesLoading || isLoading || mutations.isLoading,
    syncStatus: 'synced' as const,
    
    // Location helpers
    getEquipmentAtLocation,
    getEquipmentGroupedByLocation,
    getEquipmentDisplayLocation,
    
    // Enhanced CRUD operations
    deleteEquipmentType: mutations.deleteEquipmentType,
    deleteStorageLocation: mutations.deleteStorageLocation,
    deleteIndividualEquipment: mutations.deleteIndividualEquipment,
    
    // All mutation operations with proper wrapper functions
    addEquipmentType: mutations.addEquipmentTypeWrapper,
    updateEquipmentType: mutations.updateEquipmentTypeWrapper,
    addStorageLocation: mutations.addStorageLocationWrapper,
    updateStorageLocation: mutations.updateStorageLocationWithDefault,
    addIndividualEquipment: mutations.addIndividualEquipmentWrapper,
    updateIndividualEquipment: mutations.updateIndividualEquipmentWrapper,
    
    // Legacy compatibility
    createEquipmentType: mutations.addEquipmentTypeWrapper,
    createStorageLocation: mutations.addStorageLocationWrapper,
    updateSingleIndividualEquipment: mutations.updateIndividualEquipmentWrapper,
    
    // Bulk operations
    addBulkIndividualEquipment: mutations.addBulkIndividualEquipment,

    // Utilities - combine both utils
    refreshData: refetch,
    ...tursoUtils,
    ...inventoryUtils,

    // Legacy compatibility methods - NO LOCAL STORAGE
    updateEquipmentTypes: mutations.updateEquipmentTypeWrapper,
    updateStorageLocations: mutations.updateStorageLocationWithDefault,
    syncData: async () => data,
    resetToDefaultInventory: () => {},
  };

  return (
    <InventoryContext.Provider value={contextValue}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
