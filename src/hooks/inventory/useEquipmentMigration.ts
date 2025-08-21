import { useCallback } from 'react';
import { useInventory } from '@/contexts/InventoryContext';
import { useEquipmentIdGenerator } from './useEquipmentIdGenerator';
import { toast } from 'sonner';

export const useEquipmentMigration = () => {
  const { data, updateIndividualEquipment } = useInventory();
  const { generateEquipmentName } = useEquipmentIdGenerator();

  const migrateEquipmentNaming = useCallback(async () => {
    try {
      console.log('Starting equipment ID padding migration...');
      
      const updates = [];
      
      for (const equipment of data.individualEquipment) {
        const equipmentType = data.equipmentTypes.find(type => type.id === equipment.typeId);
        if (!equipmentType) continue;

        let needsUpdate = false;
        let newEquipmentId = equipment.equipmentId;
        let newName = equipment.name;

        // STEP 1: Fix equipment IDs - remove any dashes and ensure proper zero padding
        if (equipment.equipmentId.includes('-')) {
          newEquipmentId = equipment.equipmentId.replace(/-/g, '');
          needsUpdate = true;
        }

        // Extract prefix and number part for ID formatting
        const prefix = newEquipmentId.substring(0, 2);
        const numberPart = newEquipmentId.substring(2);
        
        // Convert number part to integer and back to ensure it's clean
        const numberInt = parseInt(numberPart) || 1;
        
        // Apply correct zero padding based on equipment type
        let correctId = '';
        if (prefix === 'SS') {
          // ShearStream: 4 digits (SS0001, SS0002, etc.)
          correctId = `${prefix}${numberInt.toString().padStart(4, '0')}`;
        } else if (prefix === 'CC' || prefix === 'CT' || prefix === 'SL') {
          // Company Computer, Customer Tablet, Starlink: 2 digits (CC01, CT01, SL01)
          correctId = `${prefix}${numberInt.toString().padStart(2, '0')}`;
        } else if (prefix === 'PG' || prefix === 'BP') {
          // Pressure Gauge, Battery Pack: 3 digits (PG001, BP001)
          correctId = `${prefix}${numberInt.toString().padStart(3, '0')}`;
        } else {
          // Default: keep original if no specific rule
          correctId = newEquipmentId;
        }

        if (correctId !== equipment.equipmentId) {
          newEquipmentId = correctId;
          needsUpdate = true;
          console.log(`ID padding fix: ${equipment.equipmentId} -> ${newEquipmentId}`);
        }

        // STEP 2: Update names to match new IDs
        const oldNamePatterns = [
          'Alpha', 'Beta', 'Gamma', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel',
          'Unit', 'Terminal', 'Field', 'Laptop', 'Dell', 'Lenovo', 'HP', 'Computer',
          'Tablet', 'iPad', 'Surface', 'Android', 'Gauge', 'Pressure', '1502',
          'Battery', 'Pack', 'Power', 'Box', 'Dish', 'Sat', 'ShearStream Unit',
          'Customer Computer Unit', 'Customer Tablet Unit', 'Starlink Unit',
          'Company Computer Unit'
        ];

        const hasOldNaming = oldNamePatterns.some(pattern => 
          equipment.name.toLowerCase().includes(pattern.toLowerCase())
        );

        // STEP 3: Generate correct names based on equipment type and new ID
        if (equipmentType.name === 'ShearStream Box' || hasOldNaming || !equipment.name.startsWith('ShearStream-')) {
          if (newEquipmentId.startsWith('SS')) {
            const numberPart = newEquipmentId.replace('SS', '');
            newName = `ShearStream-${numberPart}`;
            needsUpdate = true;
          }
        }
        
        if (equipmentType.name === 'Starlink' || hasOldNaming || equipment.name.includes('Terminal')) {
          if (newEquipmentId.startsWith('SL')) {
            const numberPart = newEquipmentId.replace('SL', '');
            newName = `Starlink-${numberPart}`;
            needsUpdate = true;
          }
        }
        
        if ((equipmentType.name === 'Customer Computer' || equipmentType.name === 'Company Computer') || hasOldNaming) {
          if (newEquipmentId.startsWith('CC')) {
            const numberPart = newEquipmentId.replace('CC', '');
            newName = `Customer Computer ${numberPart}`;
            needsUpdate = true;
          }
        }
        
        if (equipmentType.name === 'Customer Tablet' || hasOldNaming) {
          if (newEquipmentId.startsWith('CT')) {
            const numberPart = newEquipmentId.replace('CT', '');
            newName = `Customer Tablet ${numberPart}`;
            needsUpdate = true;
          }
        }
        
        if (equipmentType.name === '1502 Pressure Gauge' || hasOldNaming) {
          if (newEquipmentId.startsWith('PG')) {
            const numberPart = newEquipmentId.replace('PG', '');
            newName = `Pressure Gauge ${numberPart}`;
            needsUpdate = true;
          }
        }
        
        if (equipmentType.name === 'Battery Pack' || hasOldNaming) {
          if (newEquipmentId.startsWith('BP')) {
            const numberPart = newEquipmentId.replace('BP', '');
            newName = `Battery Pack ${numberPart}`;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          updates.push({
            id: equipment.id,
            equipmentId: newEquipmentId,
            name: newName,
            originalName: equipment.name,
            originalId: equipment.equipmentId
          });
        }
      }

      if (updates.length > 0) {
        console.log(`Updating ${updates.length} equipment items with correct padding...`);
        console.log('Updates:', updates);
        
        // Update each equipment item
        for (const update of updates) {
          console.log(`Updating ${update.originalId} (${update.originalName}) -> ${update.equipmentId} (${update.name})`);
          await updateIndividualEquipment(update.id, {
            equipmentId: update.equipmentId,
            name: update.name
          });
        }

        toast.success(`Updated ${updates.length} equipment items with correct ID padding`);
        console.log('Equipment ID padding migration completed successfully');
      } else {
        toast.info('No equipment items needed ID padding updates');
        console.log('No equipment items needed ID padding updates');
      }

    } catch (error) {
      console.error('Failed to migrate equipment ID padding:', error);
      toast.error('Failed to migrate equipment ID padding');
    }
  }, [data.individualEquipment, data.equipmentTypes, updateIndividualEquipment]);

  return {
    migrateEquipmentNaming
  };
};
