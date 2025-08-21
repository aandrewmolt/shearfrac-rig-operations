
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wifi, Search, Database, Trash2 } from 'lucide-react';
import { useUnifiedInventory } from '@/hooks/useUnifiedInventory';
import { useDraftEquipmentManager } from '@/hooks/useDraftEquipmentManager';
import { useEquipmentMigration } from '@/hooks/inventory/useEquipmentMigration';
import { useInventoryDataCleanup } from '@/hooks/inventory/useInventoryDataCleanup';
import { toast } from 'sonner';
import CommunicationEquipmentSection from './CommunicationEquipmentSection';

const CommunicationEquipmentManager: React.FC = () => {
  const { data, addBulkEquipment, deleteEquipment } = useUnifiedInventory();
  const { migrateEquipmentNaming } = useEquipmentMigration();
  const { analyzeDataConsistency } = useInventoryDataCleanup();
  const [deletingAll, setDeletingAll] = useState(false);
  
  const communicationTypes = data.equipmentTypes.filter(type => 
    type.category === 'communication' && type.requiresIndividualTracking
  );

  const {
    draftEquipment,
    addDraftEquipment,
    addBulkDraftEquipment,
  } = useDraftEquipmentManager(
    data.individualEquipment, 
    async (equipment) => {
      // Handle bulk equipment addition properly
      if (Array.isArray(equipment)) {
        await addBulkEquipment(equipment);
      } else {
        // Single equipment item - this shouldn't happen in this context but handle it
        await addBulkEquipment([equipment]);
      }
    }
  );

  const handleDeleteAllCommunicationEquipment = async () => {
    const confirm = window.confirm(
      `Are you sure you want to delete ALL communication equipment? This cannot be undone.`
    );
    
    if (!confirm) return;

    setDeletingAll(true);

    try {
      const communicationEquipment = data.individualEquipment.filter(eq => {
        const equipmentType = data.equipmentTypes.find(type => type.id === eq.equipmentTypeId);
        return equipmentType && equipmentType.category === 'communication' && eq.status !== 'deployed';
      });

      // Delete items one by one with small delays to prevent race conditions
      let deletedCount = 0;
      for (const equipment of communicationEquipment) {
        try {
          await deleteEquipment(equipment.id);
          deletedCount++;
          // Small delay to prevent overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to delete equipment ${equipment.equipmentId}:`, error);
        }
      }

      toast.success(`Deleted ${deletedCount} communication equipment items`);
      
      if (deletedCount < communicationEquipment.length) {
        toast.warning(`${communicationEquipment.length - deletedCount} items could not be deleted`);
      }

      const deployedCount = data.individualEquipment.filter(eq => {
        const equipmentType = data.equipmentTypes.find(type => type.id === eq.equipmentTypeId);
        return equipmentType && equipmentType.category === 'communication' && eq.status === 'deployed';
      }).length;

      if (deployedCount > 0) {
        toast.info(`${deployedCount} deployed items were not deleted`);
      }
    } catch (error) {
      console.error('Failed to delete communication equipment:', error);
      toast.error('Failed to delete communication equipment');
    } finally {
      setDeletingAll(false);
    }
  };

  const getEquipmentForType = (typeId: string) => {
    const existing = data.individualEquipment.filter(eq => eq.typeId === typeId);
    const drafts = draftEquipment.filter(eq => eq.typeId === typeId);
    return [...existing, ...drafts];
  };

  if (communicationTypes.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">
            No communication equipment types found. Please add equipment types first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Communication Equipment Management
          </CardTitle>
          <p className="text-sm text-gray-600">
            Manage individual communication equipment items with enhanced tracking and job integration.
          </p>
        </CardHeader>
      </Card>

      {/* Data Management Tools */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Migration Tool */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Fix Equipment Naming</p>
                <p className="text-xs text-blue-600">
                  Update names: SS0001→ShearStream-0001, CC01→Customer Computer 01
                </p>
              </div>
              <Button size="sm" onClick={migrateEquipmentNaming} variant="outline">
                <Search className="h-3 w-3 mr-1" />
                Fix Names
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Analysis Tool */}
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Analyze Data</p>
                <p className="text-xs text-purple-600">
                  Check for missing equipment and data consistency
                </p>
              </div>
              <Button size="sm" onClick={analyzeDataConsistency} variant="outline">
                <Database className="h-3 w-3 mr-1" />
                Analyze
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Delete All Tool */}
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-medium">Delete All Communication</p>
                <p className="text-xs text-red-600">
                  Remove all communication equipment (except deployed)
                </p>
              </div>
              <Button 
                size="sm" 
                onClick={handleDeleteAllCommunicationEquipment} 
                variant="outline"
                className="text-red-600 hover:text-red-700"
                disabled={deletingAll}
              >
                {deletingAll ? (
                  <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                ) : (
                  <Trash2 className="h-3 w-3 mr-1" />
                )}
                {deletingAll ? 'Deleting...' : 'Delete All'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority order: SS, SL, CC (Customer Computer), CT */}
      {['ShearStream Box', 'Starlink', 'Customer Computer', 'Customer Tablet'].map(typeName => {
        const equipmentType = communicationTypes.find(type => type.name === typeName);
        if (!equipmentType) return null;

        return (
          <CommunicationEquipmentSection
            key={equipmentType.id}
            equipmentType={equipmentType}
            equipment={getEquipmentForType(equipmentType.id)}
            storageLocations={data.storageLocations}
            onAddEquipment={addDraftEquipment}
            onBulkAdd={addBulkDraftEquipment}
          />
        );
      })}

      {draftEquipment.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-sm text-orange-700">
              Pending Changes ({draftEquipment.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-orange-600">
              Items are automatically saved after creation. Serial numbers are hidden by default - hover over deployed items to see details.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CommunicationEquipmentManager;
