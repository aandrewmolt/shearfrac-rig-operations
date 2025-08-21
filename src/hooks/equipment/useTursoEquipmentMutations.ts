import { tursoDb } from '@/services/tursoDb';
import { EquipmentType, StorageLocation, IndividualEquipment } from '@/types/inventory';

export const useTursoEquipmentMutations = () => {
  // Equipment Type Mutations
  const addEquipmentType = async (data: Omit<EquipmentType, 'id'>) => {
    try {
      const id = `type-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const equipmentType = {
        id,
        name: data.name,
        category: data.category || 'other',
        description: data.description || '',
        default_id_prefix: data.defaultIdPrefix || ''
      };
      
      await tursoDb.addEquipmentType(equipmentType);
      return equipmentType;
    } catch (error) {
      console.error('Failed to add equipment type:', error);
      throw error;
    }
  };

  const updateEquipmentType = async (id: string, data: Partial<EquipmentType>) => {
    try {
      const updateData = {
        name: data.name,
        category: data.category,
        description: data.description,
        default_id_prefix: data.defaultIdPrefix
      };
      
      await tursoDb.updateEquipmentType(id, updateData);
      return { id, ...updateData };
    } catch (error) {
      console.error('Failed to update equipment type:', error);
      throw error;
    }
  };

  const deleteEquipmentType = async (id: string) => {
    try {
      await tursoDb.deleteEquipmentType(id);
      return true;
    } catch (error) {
      console.error('Failed to delete equipment type:', error);
      throw error;
    }
  };

  // Storage Location Mutations
  const addStorageLocation = async (data: Omit<StorageLocation, 'id'>) => {
    try {
      const id = `location-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const storageLocation = {
        id,
        name: data.name,
        address: data.address || '',
        is_default: data.isDefault || false
      };
      
      await tursoDb.addStorageLocation(storageLocation);
      return storageLocation;
    } catch (error) {
      console.error('Failed to add storage location:', error);
      throw error;
    }
  };

  const updateStorageLocation = async (id: string, data: Partial<StorageLocation>) => {
    try {
      const updateData = {
        name: data.name,
        address: data.address,
        is_default: data.isDefault
      };
      
      await tursoDb.updateStorageLocation(id, updateData);
      return { id, ...updateData };
    } catch (error) {
      console.error('Failed to update storage location:', error);
      throw error;
    }
  };

  const deleteStorageLocation = async (id: string) => {
    try {
      await tursoDb.deleteStorageLocation(id);
      return true;
    } catch (error) {
      console.error('Failed to delete storage location:', error);
      throw error;
    }
  };

  // Individual Equipment Mutations
  const addIndividualEquipment = async (data: Omit<IndividualEquipment, 'id'>) => {
    try {
      const id = `equipment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const equipment = {
        id,
        equipment_id: data.equipmentId,
        equipment_type_id: data.equipmentTypeId,
        storage_location_id: data.storageLocationId,
        status: data.status || 'available',
        notes: data.notes || '',
        last_updated_date: new Date().toISOString()
      };
      
      await tursoDb.addIndividualEquipment(equipment);
      return equipment;
    } catch (error) {
      console.error('Failed to add individual equipment:', error);
      throw error;
    }
  };

  const updateIndividualEquipment = async (id: string, data: Partial<IndividualEquipment>) => {
    try {
      const updateData = {
        equipment_id: data.equipmentId,
        equipment_type_id: data.equipmentTypeId,
        storage_location_id: data.storageLocationId,
        status: data.status,
        notes: data.notes,
        last_updated_date: new Date().toISOString()
      };
      
      await tursoDb.updateIndividualEquipment(id, updateData);
      return { id, ...updateData };
    } catch (error) {
      console.error('Failed to update individual equipment:', error);
      throw error;
    }
  };

  const deleteIndividualEquipment = async (id: string) => {
    try {
      await tursoDb.deleteIndividualEquipment(id);
      return true;
    } catch (error) {
      console.error('Failed to delete individual equipment:', error);
      throw error;
    }
  };

  // Batch operations
  const addBulkIndividualEquipment = async (equipmentList: Omit<IndividualEquipment, 'id'>[]) => {
    try {
      const results = [];
      for (const equipment of equipmentList) {
        const result = await addIndividualEquipment(equipment);
        results.push(result);
      }
      return results;
    } catch (error) {
      console.error('Failed to add bulk individual equipment:', error);
      throw error;
    }
  };

  return {
    // Equipment Types
    addEquipmentType,
    updateEquipmentType,
    deleteEquipmentType,
    
    // Storage Locations
    addStorageLocation,
    updateStorageLocation,
    deleteStorageLocation,
    
    // Individual Equipment
    addIndividualEquipment,
    updateIndividualEquipment,
    deleteIndividualEquipment,
    addBulkIndividualEquipment,
  };
};