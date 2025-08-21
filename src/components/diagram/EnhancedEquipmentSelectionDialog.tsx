
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Monitor, Satellite, Square, Tablet } from 'lucide-react';
import { useInventory } from '@/contexts/InventoryContext';

interface EnhancedEquipmentSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (assignments: {
    shearstreamBoxes: string[];
    starlink?: string;
    customerComputers: string[];
  }) => void;
  jobId: string;
  jobName: string;
  hasWellsideGauge: boolean;
  shearstreamBoxCount: number;
  customerComputerCount: number;
}

const EnhancedEquipmentSelectionDialog: React.FC<EnhancedEquipmentSelectionDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  jobId,
  jobName,
  hasWellsideGauge,
  shearstreamBoxCount,
  customerComputerCount
}) => {
  const { data } = useInventory();
  
  const [selectedShearstreamBoxes, setSelectedShearstreamBoxes] = useState<string[]>([]);
  const [selectedStarlink, setSelectedStarlink] = useState<string>('');
  const [selectedCustomerComputers, setSelectedCustomerComputers] = useState<string[]>([]);

  // Get available equipment by type
  const getAvailableEquipment = (typeName: string) => {
    const equipmentType = data.equipmentTypes.find(type => type.name === typeName);
    if (!equipmentType) return [];
    
    return data.individualEquipment.filter(eq => 
      eq.typeId === equipmentType.id && 
      eq.status === 'available'
    );
  };

  const availableSSBoxes = getAvailableEquipment('ShearStream Box');
  const availableStarlinks = getAvailableEquipment('Starlink');
  const availableComputers = getAvailableEquipment('Customer Computer');
  const availableTablets = getAvailableEquipment('Customer Tablet');
  const allCustomerDevices = [...availableComputers, ...availableTablets];

  const handleShearstreamBoxSelect = (index: number, equipmentId: string) => {
    const newSelection = [...selectedShearstreamBoxes];
    newSelection[index] = equipmentId;
    setSelectedShearstreamBoxes(newSelection);
  };

  const handleCustomerComputerSelect = (index: number, equipmentId: string) => {
    const newSelection = [...selectedCustomerComputers];
    newSelection[index] = equipmentId;
    setSelectedCustomerComputers(newSelection);
  };

  const handleConfirm = () => {
    onConfirm({
      shearstreamBoxes: selectedShearstreamBoxes.filter(Boolean),
      starlink: selectedStarlink || undefined,
      customerComputers: selectedCustomerComputers.filter(Boolean),
    });
    onClose();
  };

  const canConfirm = selectedShearstreamBoxes.filter(Boolean).length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Equipment to {jobName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* ShearStream Boxes Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Square className="h-4 w-4" />
              <Label className="font-semibold">ShearStream Boxes ({shearstreamBoxCount} needed)</Label>
            </div>
            {Array.from({ length: shearstreamBoxCount }, (_, index) => (
              <div key={index} className="space-y-2">
                <Label>ShearStream Box {index + 1}</Label>
                <Select 
                  value={selectedShearstreamBoxes[index] || ''} 
                  onValueChange={(value) => handleShearstreamBoxSelect(index, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ShearStream Box" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSSBoxes
                      .filter(eq => !selectedShearstreamBoxes.includes(eq.id) || selectedShearstreamBoxes[index] === eq.id)
                      .map(equipment => (
                        <SelectItem key={equipment.id} value={equipment.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{equipment.equipmentId} - {equipment.name}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              Available
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {/* Starlink Selection */}
          {hasWellsideGauge && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Satellite className="h-4 w-4" />
                <Label className="font-semibold">Starlink</Label>
              </div>
              <Select value={selectedStarlink} onValueChange={setSelectedStarlink}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Starlink" />
                </SelectTrigger>
                <SelectContent>
                  {availableStarlinks.map(equipment => (
                    <SelectItem key={equipment.id} value={equipment.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{equipment.equipmentId} - {equipment.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          Available
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Customer Computers/Tablets Selection */}
          {customerComputerCount > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                <Label className="font-semibold">Customer Computers/Tablets ({customerComputerCount} needed)</Label>
              </div>
              {Array.from({ length: customerComputerCount }, (_, index) => (
                <div key={index} className="space-y-2">
                  <Label>Device {index + 1}</Label>
                  <Select 
                    value={selectedCustomerComputers[index] || ''} 
                    onValueChange={(value) => handleCustomerComputerSelect(index, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Computer or Tablet" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCustomerDevices
                        .filter(eq => !selectedCustomerComputers.includes(eq.id) || selectedCustomerComputers[index] === eq.id)
                        .map(equipment => {
                          const isTablet = equipment.equipmentId.startsWith('CT');
                          return (
                            <SelectItem key={equipment.id} value={equipment.id}>
                              <div className="flex items-center gap-2">
                                {isTablet ? <Tablet className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                                <span>{equipment.equipmentId} - {equipment.name}</span>
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {isTablet ? 'Tablet' : 'Computer'}
                                </Badge>
                              </div>
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Selected equipment will be marked as deployed and assigned to this job.
              Equipment IDs will be displayed on the diagram nodes.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            Assign Equipment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedEquipmentSelectionDialog;
