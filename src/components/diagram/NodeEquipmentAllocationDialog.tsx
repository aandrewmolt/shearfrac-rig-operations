import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Square, Zap, Monitor, Satellite, AlertTriangle, CheckCircle, MapPin, Calendar } from 'lucide-react';
import { useInventory } from '@/contexts/InventoryContext';
import { Node } from '@xyflow/react';

interface NodeEquipmentAllocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (equipmentId: string) => void;
  node: Node | null;
  jobId: string;
}

const NodeEquipmentAllocationDialog: React.FC<NodeEquipmentAllocationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  node,
  jobId
}) => {
  const { data: inventoryData } = useInventory();
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
  const [availableEquipment, setAvailableEquipment] = useState<any[]>([]);

  const getNodeEquipmentType = (nodeType: string, nodeData?: any) => {
    switch (nodeType) {
      case 'mainBox': return 'shearstream-box';
      case 'yAdapter': return 'y-adapter';
      case 'customerComputer': return 'customer-computer';
      case 'companyComputer': return 'customer-computer';
      case 'satellite': return 'starlink';
      case 'well':
        // For wells, check the selected gauge types
        if (nodeData?.gaugeTypes?.length > 0) {
          // Return the first selected gauge type
          return nodeData.gaugeTypes[0];
        }
        return 'pressure-gauge-1502'; // Default to 1502
      case 'wellsideGauge': return 'pressure-gauge-1502';
      default: return null;
    }
  };

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'mainBox': return <Square className="h-5 w-5" />;
      case 'yAdapter': return <Zap className="h-5 w-5" />;
      case 'customerComputer': return <Monitor className="h-5 w-5" />;
      case 'companyComputer': return <Monitor className="h-5 w-5" />;
      case 'satellite': return <Satellite className="h-5 w-5" />;
      case 'well': return <Monitor className="h-5 w-5" />;
      case 'wellsideGauge': return <Monitor className="h-5 w-5" />;
      default: return null;
    }
  };

  useEffect(() => {
    if (isOpen && node) {
      const equipmentTypeId = getNodeEquipmentType(node.type || '', node.data);
      if (equipmentTypeId) {
        // Get all individual equipment of the specified type
        // Check multiple fields for type matching (typeId, equipmentTypeId, Type)
        const equipment = inventoryData.individualEquipment.filter(item => {
          // Type matching - check all possible type fields
          const typeMatch = item.typeId === equipmentTypeId || 
                          item.equipmentTypeId === equipmentTypeId ||
                          item.Type === equipmentTypeId;
          
          // For wells with multiple gauge types, check all selected types
          if (node.type === 'well' && node.data?.gaugeTypes?.length > 0) {
            const matchesAnyGaugeType = node.data.gaugeTypes.some((gaugeType: string) => 
              item.typeId === gaugeType || 
              item.equipmentTypeId === gaugeType ||
              item.Type === gaugeType
            );
            if (!matchesAnyGaugeType) return false;
          }
          
          // Status check
          const statusMatch = item.status === 'available' || 
                            (item.status === 'deployed' && item.jobId === jobId);
          
          return typeMatch && statusMatch;
        });
        
        // Sort by equipment ID
        equipment.sort((a, b) => a.equipmentId.localeCompare(b.equipmentId));
        
        setAvailableEquipment(equipment);
        
        // If node already has allocated equipment, pre-select it
        if (node.data?.allocatedEquipmentId) {
          setSelectedEquipmentId(node.data.allocatedEquipmentId);
        }
      }
    }
  }, [isOpen, node, inventoryData, jobId]);

  const getEquipmentType = () => {
    if (!node) return null;
    const typeId = getNodeEquipmentType(node.type || '', node.data);
    return inventoryData.equipmentTypes.find(type => type.id === typeId);
  };

  const getLocation = (locationId: string) => {
    return inventoryData.storageLocations.find(loc => loc.id === locationId);
  };

  const handleConfirm = () => {
    if (selectedEquipmentId) {
      onConfirm(selectedEquipmentId);
    }
  };

  const equipmentType = getEquipmentType();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {node && getNodeIcon(node.type || '')}
            Select {equipmentType?.name || 'Equipment'} for {node?.data?.label || 'Node'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Node Info */}
          {node && (
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <p className="font-medium">Node Details:</p>
              <p className="text-gray-600">
                Type: {equipmentType?.name || node.type}
              </p>
              <p className="text-gray-600">
                Label: {node.data?.label || 'Unnamed'}
              </p>
            </div>
          )}

          {/* Show gauge type selection for wells */}
          {node?.type === 'well' && node.data?.gaugeTypes?.length > 1 && (
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Selected Gauge Types:</p>
              <div className="flex flex-wrap gap-1">
                {node.data.gaugeTypes.map((typeId: string) => {
                  const type = inventoryData.equipmentTypes.find(t => t.id === typeId);
                  return (
                    <Badge key={typeId} variant="outline" className="text-xs">
                      {type?.name || typeId}
                    </Badge>
                  );
                })}
              </div>
              <p className="text-xs text-blue-600 mt-2">
                You can allocate equipment from any of these gauge types.
              </p>
            </div>
          )}

          {/* Equipment Selection */}
          <div className="space-y-2">
            <Label>Available {equipmentType?.name || 'Equipment'}</Label>
            {availableEquipment.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No {equipmentType?.name || 'equipment'} available. All items are currently deployed to other jobs.
                </AlertDescription>
              </Alert>
            ) : (
              <Select value={selectedEquipmentId} onValueChange={setSelectedEquipmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50 max-h-[300px]">
                  {availableEquipment.map(equipment => {
                    const location = getLocation(equipment.locationId);
                    const isCurrentlyAllocated = equipment.id === node?.data?.allocatedEquipmentId;
                    
                    return (
                      <SelectItem key={equipment.id} value={equipment.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{equipment.equipmentId}</span>
                            {equipment.name && equipment.name !== equipment.equipmentId && (
                              <span className="text-gray-500">({equipment.name})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isCurrentlyAllocated && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                Current
                              </Badge>
                            )}
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                equipment.status === 'available' 
                                  ? 'bg-green-50 text-green-700 border-green-200' 
                                  : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                              }`}
                            >
                              {equipment.status === 'available' ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Available
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  In Use (This Job)
                                </>
                              )}
                            </Badge>
                            {location && (
                              <Badge variant="outline" className="text-xs">
                                <MapPin className="w-3 h-3 mr-1" />
                                {location.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {equipment.notes && (
                          <div className="text-xs text-gray-500 mt-1">{equipment.notes}</div>
                        )}
                        {equipment.serialNumber && (
                          <div className="text-xs text-gray-500">Serial: {equipment.serialNumber}</div>
                        )}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
            
            {selectedEquipmentId && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Selected:</strong> {availableEquipment.find(e => e.id === selectedEquipmentId)?.equipmentId}
                </p>
                {availableEquipment.find(e => e.id === selectedEquipmentId)?.serialNumber && (
                  <p className="text-xs text-blue-600 mt-1">
                    Serial: {availableEquipment.find(e => e.id === selectedEquipmentId)?.serialNumber}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-amber-50 p-3 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> This equipment will be allocated specifically to this node. 
              It will be marked as deployed for this job.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!selectedEquipmentId}
          >
            Allocate Equipment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NodeEquipmentAllocationDialog;