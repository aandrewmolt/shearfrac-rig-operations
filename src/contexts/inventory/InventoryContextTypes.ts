
import { InventoryData, IndividualEquipment } from '@/types/inventory';
import { EquipmentLocation } from '@/utils/equipmentLocation';

export interface InventoryContextType {
  data: InventoryData;
  isLoading: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline';
  
  // Location helpers - SINGLE SOURCE OF TRUTH
  getEquipmentAtLocation: (locationId: string, locationType?: 'storage' | 'job') => IndividualEquipment[];
  getEquipmentGroupedByLocation: () => { storageLocations: Map<string, IndividualEquipment[]>; jobs: Map<string, IndividualEquipment[]>; };
  getEquipmentDisplayLocation: (item: IndividualEquipment) => EquipmentLocation;
  
  // CRUD operations
  deleteEquipmentType: (id: string) => Promise<any>;
  deleteStorageLocation: (id: string) => Promise<any>;
  deleteIndividualEquipment: (id: string) => Promise<any>;
  
  // All mutation operations
  addEquipmentType: (data: any) => Promise<void>;
  updateEquipmentType: (id: string, data: any) => Promise<void>;
  addStorageLocation: (data: any) => Promise<void>;
  updateStorageLocation: (id: string, data: any) => Promise<void>;
  addIndividualEquipment: (data: any) => Promise<void>;
  updateIndividualEquipment: (id: string, data: any) => Promise<void>;
  
  // Bulk operations
  addBulkIndividualEquipment: (equipment: any[]) => Promise<any[]>;
  
  // Utilities and other methods
  refreshData?: () => void;
  getEquipmentTypeName: (typeId: string) => string;
  getLocationName: (locationId: string) => string;
  getIndividualEquipmentByLocation: (locationId: string) => any[];
  
  // Legacy compatibility
  createEquipmentType: (data: any) => Promise<void>;
  createStorageLocation: (data: any) => Promise<void>;
  updateSingleIndividualEquipment: (id: string, data: any) => Promise<void>;
  updateEquipmentTypes: (id: string, data: any) => Promise<void>;
  updateStorageLocations: (id: string, data: any) => Promise<void>;
  syncData: () => Promise<InventoryData>;
  resetToDefaultInventory: () => void;
}
