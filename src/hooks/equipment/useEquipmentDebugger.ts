import { useInventory } from '@/contexts/InventoryContext';
import { useEffect } from 'react';

export const useEquipmentDebugger = () => {
  const { data } = useInventory();

  useEffect(() => {
    console.log('🔍 EQUIPMENT DEBUGGER - Full Inventory State:');
    console.log('Equipment Items (Bulk):', data.equipmentItems);
    console.log('Individual Equipment:', data.individualEquipment);
    console.log('Equipment Types:', data.equipmentTypes);
    console.log('Storage Locations:', data.storageLocations);
    
    // Check for 200ft cable specifically
    const cable200ft = data.equipmentItems.filter(item => item.typeId === '200ft-cable');
    console.log('🔍 200ft Cable Items:', cable200ft);
    
    // Check for pressure gauges
    const gauges = data.equipmentItems.filter(item => item.typeId === 'pressure-gauge-1502');
    console.log('🔍 Pressure Gauge Items:', gauges);
    
    // Check midland office items
    const midlandItems = data.equipmentItems.filter(item => item.locationId === 'midland-office');
    console.log('🔍 All Midland Office Items:', midlandItems);
  }, [data]);

  return null;
};