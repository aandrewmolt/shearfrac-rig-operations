
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, FileText } from 'lucide-react';
import { IndividualEquipment } from '@/types/inventory';
import { useInventory } from '@/contexts/InventoryContext';

interface EquipmentHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: IndividualEquipment | null;
}

const EquipmentHistoryDialog: React.FC<EquipmentHistoryDialogProps> = ({
  isOpen,
  onClose,
  equipment
}) => {
  const { data } = useInventory();
  
  if (!equipment) return null;
  
  const getLocationName = (locationId: string) => {
    // Check storage locations first
    const storageLocation = data.storageLocations.find(loc => loc.id === locationId);
    if (storageLocation) return storageLocation.name;
    
    // Check if it's a job location (you might want to fetch jobs here)
    return 'Unknown Location';
  };

  const getEquipmentTypeName = (typeId: string) => {
    const type = data.equipmentTypes.find(t => t.id === typeId);
    return type?.name || 'Unknown Type';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Equipment History - {equipment.equipmentId}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Equipment Details */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Equipment ID</p>
                  <p className="font-semibold">{equipment.equipmentId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Name</p>
                  <p className="font-semibold">{equipment.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Type</p>
                  <Badge variant="outline">
                    {getEquipmentTypeName(equipment.typeId)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <Badge variant={
                    equipment.status === 'available' ? 'default' :
                    equipment.status === 'deployed' ? 'secondary' : 'destructive'
                  }>
                    {equipment.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Location</p>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-gray-400" />
                    <span className="text-sm">{getLocationName(equipment.locationId)}</span>
                  </div>
                </div>
                {equipment.serialNumber && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Serial Number</p>
                    <p className="font-semibold">{equipment.serialNumber}</p>
                  </div>
                )}
                {equipment.jobId && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Current Job</p>
                    <p className="font-semibold">{equipment.jobId}</p>
                  </div>
                )}
              </div>
              
              {equipment.notes && (
                <div className="mt-4 p-2 bg-gray-50 rounded text-sm">
                  <strong>Notes:</strong> {equipment.notes}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deployment History Placeholder */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Deployment History</h3>
            <div className="text-center py-8 text-gray-500">
              <FileText className="mx-auto h-12 w-12 mb-2" />
              <p>Deployment history tracking will be implemented soon</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EquipmentHistoryDialog;
