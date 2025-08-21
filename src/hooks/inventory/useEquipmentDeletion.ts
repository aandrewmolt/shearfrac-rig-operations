
import { toast } from 'sonner';
import { EquipmentItem, IndividualEquipment, EquipmentType } from '@/types/inventory';

interface UseEquipmentDeletionProps {
  equipmentItems: EquipmentItem[];
  individualEquipment: IndividualEquipment[];
  deleteEquipmentItem: (id: string) => Promise<void>;
  deleteEquipmentType: (id: string) => Promise<void>;
  deleteIndividualEquipment?: (id: string) => Promise<void>;
}

export const useEquipmentDeletion = ({
  equipmentItems,
  individualEquipment,
  deleteEquipmentItem,
  deleteEquipmentType,
  deleteIndividualEquipment
}: UseEquipmentDeletionProps) => {

  const canDeleteEquipmentType = (typeId: string): { canDelete: boolean; reason?: string; details?: string[] } => {
    console.log('Checking if equipment type can be deleted:', typeId);
    console.log('Available equipment items:', equipmentItems.length);
    console.log('Available individual equipment:', individualEquipment.length);
    
    // Check if any equipment items use this type
    const relatedEquipmentItems = equipmentItems.filter(item => item.typeId === typeId);
    const relatedIndividualEquipment = individualEquipment.filter(item => item.typeId === typeId);
    
    console.log('Related equipment items found:', relatedEquipmentItems.length);
    console.log('Related individual equipment found:', relatedIndividualEquipment.length);
    
    const details: string[] = [];
    
    if (relatedEquipmentItems.length > 0) {
      const totalQuantity = relatedEquipmentItems.reduce((sum, item) => sum + item.quantity, 0);
      details.push(`${relatedEquipmentItems.length} equipment item records (${totalQuantity} total items)`);
    }
    
    if (relatedIndividualEquipment.length > 0) {
      details.push(`${relatedIndividualEquipment.length} individual equipment items`);
    }
    
    if (details.length > 0) {
      console.log('Cannot delete - dependencies found:', details);
      return { 
        canDelete: false, 
        reason: 'Cannot delete equipment type that still has equipment assigned to it.',
        details
      };
    }

    console.log('Equipment type can be deleted - no dependencies found');
    return { canDelete: true };
  };

  const canDeleteEquipmentItem = (itemId: string): { canDelete: boolean; reason?: string } => {
    const item = equipmentItems.find(i => i.id === itemId);
    if (!item) {
      return { canDelete: false, reason: 'Equipment item not found.' };
    }

    // Check if item is deployed
    if (item.status === 'deployed') {
      return { 
        canDelete: false, 
        reason: 'Cannot delete deployed equipment. Please return equipment first.' 
      };
    }

    return { canDelete: true };
  };

  const handleDeleteEquipmentType = async (typeId: string, typeName: string) => {
    console.log('Attempting to delete equipment type:', typeName, typeId);
    
    const { canDelete, reason, details } = canDeleteEquipmentType(typeId);
    
    if (!canDelete) {
      let detailMessage = reason || 'Cannot delete this equipment type.';
      if (details && details.length > 0) {
        detailMessage += '\n\nBlocking items:\n• ' + details.join('\n• ');
        detailMessage += '\n\nTo delete this equipment type, you must first remove or reassign all related equipment from the Inventory tab.';
      }
      console.log('Delete blocked:', detailMessage);
      toast.error(detailMessage);
      return false;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete the equipment type "${typeName}"? This action cannot be undone.`
    );

    if (!confirmed) {
      console.log('Delete cancelled by user');
      return false;
    }

    try {
      console.log('Proceeding with equipment type deletion');
      await deleteEquipmentType(typeId);
      toast.success(`Equipment type "${typeName}" deleted successfully`);
      return true;
    } catch (error) {
      console.error('Failed to delete equipment type:', error);
      toast.error('Failed to delete equipment type. Please try again.');
      return false;
    }
  };

  const handleDeleteEquipmentItem = async (itemId: string, itemName?: string) => {
    const { canDelete, reason } = canDeleteEquipmentItem(itemId);
    
    if (!canDelete) {
      toast.error(reason);
      return false;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete this equipment item${itemName ? ` "${itemName}"` : ''}? This action cannot be undone.`
    );

    if (!confirmed) return false;

    try {
      await deleteEquipmentItem(itemId);
      toast.success('Equipment item deleted successfully');
      return true;
    } catch (error) {
      console.error('Failed to delete equipment item:', error);
      toast.error('Failed to delete equipment item');
      return false;
    }
  };

  const handleDeleteIndividualEquipment = async (itemId: string, itemName?: string) => {
    if (!deleteIndividualEquipment) {
      toast.error('Individual equipment deletion not supported');
      return false;
    }

    const item = individualEquipment.find(i => i.id === itemId);
    if (!item) {
      toast.error('Individual equipment not found');
      return false;
    }

    // Check if item is deployed
    if (item.status === 'deployed') {
      toast.error('Cannot delete deployed equipment. Please return equipment first.');
      return false;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${itemName || item.name}"? This action cannot be undone.`
    );

    if (!confirmed) return false;

    try {
      await deleteIndividualEquipment(itemId);
      toast.success('Individual equipment deleted successfully');
      return true;
    } catch (error) {
      console.error('Failed to delete individual equipment:', error);
      toast.error('Failed to delete individual equipment');
      return false;
    }
  };

  return {
    canDeleteEquipmentType,
    canDeleteEquipmentItem,
    handleDeleteEquipmentType,
    handleDeleteEquipmentItem,
    handleDeleteIndividualEquipment,
  };
};
