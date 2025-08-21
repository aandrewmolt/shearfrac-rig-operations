
import { useCallback } from 'react';
import { useInventory } from '@/contexts/InventoryContext';
import { toast } from 'sonner';

export const useInventoryDataCleanup = () => {
  const { data } = useInventory();

  const analyzeDataConsistency = useCallback(() => {
    console.log('=== INVENTORY DATA ANALYSIS ===');
    
    // Check all equipment types
    console.log('Equipment Types:', data.equipmentTypes.map(et => ({
      id: et.id,
      name: et.name,
      prefix: et.defaultIdPrefix
    })));

    // Check individual equipment by type
    const ccEquipment = data.individualEquipment.filter(eq => 
      eq.equipmentId.startsWith('CC') || eq.typeId === data.equipmentTypes.find(t => t.name === 'Customer Computer')?.id
    );
    
    const ctEquipment = data.individualEquipment.filter(eq => 
      eq.equipmentId.startsWith('CT') || eq.typeId === data.equipmentTypes.find(t => t.name === 'Customer Tablet')?.id
    );

    const ssEquipment = data.individualEquipment.filter(eq => 
      eq.equipmentId.startsWith('SS') || eq.typeId === data.equipmentTypes.find(t => t.name === 'ShearStream Box')?.id
    );

    const slEquipment = data.individualEquipment.filter(eq => 
      eq.equipmentId.startsWith('SL') || eq.typeId === data.equipmentTypes.find(t => t.name === 'Starlink')?.id
    );

    console.log('CC Equipment found:', ccEquipment.length, ccEquipment);
    console.log('CT Equipment found:', ctEquipment.length, ctEquipment);
    console.log('SS Equipment found:', ssEquipment.length, ssEquipment);
    console.log('SL Equipment found:', slEquipment.length, slEquipment);

    // Check for orphaned equipment (equipment with missing type references)
    const orphanedEquipment = data.individualEquipment.filter(eq => 
      !data.equipmentTypes.find(et => et.id === eq.typeId)
    );

    if (orphanedEquipment.length > 0) {
      console.log('ORPHANED EQUIPMENT (no matching type):', orphanedEquipment);
    }

    // Check for equipment with old naming patterns
    const oldNamingPatterns = data.individualEquipment.filter(eq =>
      eq.name.includes('Alpha') || eq.name.includes('Beta') || eq.name.includes('Gamma') ||
      eq.name.includes('Terminal') || eq.name.includes('Unit') || eq.name.includes('Field') ||
      eq.name.includes('Dell') || eq.name.includes('Lenovo')
    );

    if (oldNamingPatterns.length > 0) {
      console.log('EQUIPMENT WITH OLD NAMING:', oldNamingPatterns);
    }

    // Check total counts
    console.log('Total Individual Equipment:', data.individualEquipment.length);
    console.log('Total Equipment Types:', data.equipmentTypes.length);
    console.log('Total Storage Locations:', data.storageLocations.length);

    toast.info(`Data analysis complete. Check console for details. Found ${ccEquipment.length} CC, ${ssEquipment.length} SS, ${slEquipment.length} SL equipment.`);

    return {
      ccEquipment,
      ctEquipment,
      ssEquipment,
      slEquipment,
      orphanedEquipment,
      oldNamingPatterns
    };
  }, [data]);

  return {
    analyzeDataConsistency
  };
};
