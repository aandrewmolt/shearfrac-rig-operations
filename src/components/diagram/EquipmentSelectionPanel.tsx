
import React, { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Satellite, Square, Plus, X, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useInventory } from '@/contexts/InventoryContext';
import { useEquipmentQueries } from '@/hooks/useEquipmentQueries';
import { IndividualEquipment } from '@/types/inventory';
import QuickStatusFix from '@/components/inventory/QuickStatusFix';

interface EquipmentSelectionPanelProps {
  selectedShearstreamBoxes: string[];
  selectedStarlink?: string;
  selectedCustomerComputers: string[];
  customerComputerCount: number;
  shearstreamBoxCount: number;
  onEquipmentSelect: (type: 'shearstream-box' | 'starlink' | 'customer-computer', equipmentId: string, index?: number) => void;
  onAddShearstreamBox: () => void;
  onRemoveShearstreamBox: (index: number) => void;
  onAddStarlink?: () => void;
  onRemoveStarlink?: (index: number) => void;
  onAddCustomerComputer?: () => void;
  onRemoveCustomerComputer?: (index: number) => void;
  hasWellsideGauge: boolean;
  getEquipmentStatus?: (equipmentId: string) => 'available' | 'allocated' | 'deployed' | 'unavailable';
}

const EquipmentSelectionPanel: React.FC<EquipmentSelectionPanelProps> = ({
  selectedShearstreamBoxes,
  selectedStarlink,
  selectedCustomerComputers,
  customerComputerCount,
  shearstreamBoxCount,
  onEquipmentSelect,
  onAddShearstreamBox,
  onRemoveShearstreamBox,
  onAddStarlink,
  onRemoveStarlink,
  onAddCustomerComputer,
  onRemoveCustomerComputer,
  hasWellsideGauge,
  getEquipmentStatus,
}) => {
  const { data } = useInventory();
  const { refetch } = useEquipmentQueries();
  
  // Equipment status debugging disabled - functionality working correctly

  // Filter available equipment by type and status
  const availableEquipment = useMemo(() => {
    // Show all equipment for debugging - normally would filter by status === 'available'
    const available = data.individualEquipment;
    console.log('Available equipment for selection:', available);
    
    return {
      ssBoxes: available.filter(eq => eq.equipmentId.startsWith('SS')),
      starlinks: available.filter(eq => eq.equipmentId.startsWith('SL')),
      computers: available.filter(eq => eq.equipmentId.startsWith('CC') || eq.equipmentId.startsWith('CT')),
    };
  }, [data.individualEquipment]);

  const getSelectedEquipment = (equipmentId: string) => {
    return data.individualEquipment.find(eq => eq.equipmentId === equipmentId);
  };

  // Convert selectedStarlink to array for consistent handling
  const selectedStarlinks = selectedStarlink ? [selectedStarlink] : [];
  const starlinkCount = selectedStarlinks.length;

  // Helper function to get equipment status badge
  const getStatusBadge = (equipmentId: string) => {
    if (!getEquipmentStatus) return null;
    
    const status = getEquipmentStatus(equipmentId);
    
    switch (status) {
      case 'available':
        return (
          <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Available
          </Badge>
        );
      case 'allocated':
        return (
          <Badge variant="outline" className="ml-2 text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Allocated
          </Badge>
        );
      case 'deployed':
        return (
          <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700 border-blue-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Deployed
          </Badge>
        );
      case 'unavailable':
        return (
          <Badge variant="outline" className="ml-2 text-xs bg-red-50 text-red-700 border-red-200">
            <X className="w-3 h-3 mr-1" />
            Unavailable
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Square className="h-4 w-4" />
            Equipment Assignment
          </CardTitle>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refetch()}
              className="h-8 w-8 p-0"
              title="Refresh equipment list"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Quick Fix for Equipment Status Issues */}
        <QuickStatusFix onFixed={() => window.location.reload()} />
        
        {/* ShearStream Boxes Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Square className="h-3 w-3" />
              <Label className="text-sm font-medium">
                ShearStream Boxes ({availableEquipment.ssBoxes.length} available, {shearstreamBoxCount} in use)
              </Label>
            </div>
            <Button
              onClick={onAddShearstreamBox}
              size="sm"
              variant="outline"
              className="h-6 px-2"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          
          {Array.from({ length: shearstreamBoxCount }, (_, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">SS Box {index + 1}</Label>
                {shearstreamBoxCount > 1 && (
                  <Button
                    onClick={() => onRemoveShearstreamBox(index)}
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Select
                value={selectedShearstreamBoxes[index] || ''}
                onValueChange={(value) => onEquipmentSelect('shearstream-box', value, index)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select SS Box..." />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  {availableEquipment.ssBoxes
                    .filter(eq => {
                      // Show if not selected anywhere, or if selected in this specific slot
                      const selectedInOtherSlots = selectedShearstreamBoxes.some((selectedId, idx) => 
                        idx !== index && selectedId === eq.equipmentId
                      );
                      return !selectedInOtherSlots;
                    })
                    .length === 0 ? (
                    <>
                      <SelectItem value="__none__">None (No Selection)</SelectItem>
                      <SelectItem value="none" disabled>No ShearStream boxes available</SelectItem>
                    </>
                  ) : (
                    [
                      <SelectItem key="none" value="__none__">None (No Selection)</SelectItem>,
                      ...availableEquipment.ssBoxes
                        .filter(eq => {
                          // Show if not selected anywhere, or if selected in this specific slot
                          const selectedInOtherSlots = selectedShearstreamBoxes.some((selectedId, idx) => 
                            idx !== index && selectedId === eq.equipmentId
                          );
                          return !selectedInOtherSlots;
                        })
                        .map(equipment => (
                        <SelectItem key={equipment.id} value={equipment.equipmentId}>
                          <div className="flex items-center">
                            <span>{equipment.equipmentId}</span>
                            {getStatusBadge(equipment.equipmentId)}
                          </div>
                        </SelectItem>
                      ))]
                  )}
                </SelectContent>
              </Select>
              {selectedShearstreamBoxes[index] && (
                <div className="text-xs text-gray-600">
                  Selected: {getSelectedEquipment(selectedShearstreamBoxes[index])?.equipmentId}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Starlink Selection - Enhanced to support multiple */}
        {hasWellsideGauge && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Satellite className="h-3 w-3" />
                <Label className="text-sm font-medium">
                  Starlinks ({availableEquipment.starlinks.length} available, {starlinkCount} in use)
                </Label>
              </div>
              {onAddStarlink && (
                <Button
                  onClick={onAddStarlink}
                  size="sm"
                  variant="outline"
                  className="h-6 px-2"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            {Array.from({ length: Math.max(1, starlinkCount) }, (_, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Starlink {index + 1}</Label>
                  {starlinkCount > 1 && onRemoveStarlink && (
                    <Button
                      onClick={() => onRemoveStarlink(index)}
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Select
                  value={selectedStarlinks[index] || ''}
                  onValueChange={(value) => onEquipmentSelect('starlink', value, index)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select Starlink..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    {availableEquipment.starlinks
                      .filter(eq => {
                        // Show if not selected anywhere, or if selected in this specific slot
                        const selectedInOtherSlots = selectedStarlinks.some((selectedId, idx) => 
                          idx !== index && selectedId === eq.equipmentId
                        );
                        return !selectedInOtherSlots;
                      })
                      .length === 0 ? (
                      <>
                        <SelectItem value="__none__">None (No Selection)</SelectItem>
                        <SelectItem value="none" disabled>No Starlinks available</SelectItem>
                      </>
                    ) : (
                      [
                        <SelectItem key="none" value="__none__">None (No Selection)</SelectItem>,
                        ...availableEquipment.starlinks
                          .filter(eq => {
                            // Show if not selected anywhere, or if selected in this specific slot
                            const selectedInOtherSlots = selectedStarlinks.some((selectedId, idx) => 
                              idx !== index && selectedId === eq.equipmentId
                            );
                            return !selectedInOtherSlots;
                          })
                          .map(equipment => (
                          <SelectItem key={equipment.id} value={equipment.equipmentId}>
                            <div className="flex items-center">
                              <span>{equipment.equipmentId}</span>
                              {getStatusBadge(equipment.equipmentId)}
                            </div>
                          </SelectItem>
                        ))]
                    )}
                  </SelectContent>
                </Select>
                {selectedStarlinks[index] && (
                  <div className="text-xs text-gray-600">
                    Selected: {getSelectedEquipment(selectedStarlinks[index])?.equipmentId}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Customer Computers Selection - Enhanced to support adding/removing */}
        {customerComputerCount > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="h-3 w-3" />
                <Label className="text-sm font-medium">
                  Customer Computers ({availableEquipment.computers.length} available, {customerComputerCount} needed)
                </Label>
              </div>
              {onAddCustomerComputer && (
                <Button
                  onClick={onAddCustomerComputer}
                  size="sm"
                  variant="outline"
                  className="h-6 px-2"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            {Array.from({ length: customerComputerCount }, (_, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Computer {index + 1}</Label>
                  {customerComputerCount > 1 && onRemoveCustomerComputer && (
                    <Button
                      onClick={() => onRemoveCustomerComputer(index)}
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Select
                  value={selectedCustomerComputers[index] || ''}
                  onValueChange={(value) => onEquipmentSelect('customer-computer', value, index)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select Computer..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    {availableEquipment.computers
                      .filter(eq => {
                        // Show if not selected anywhere, or if selected in this specific slot
                        const selectedInOtherSlots = selectedCustomerComputers.some((selectedId, idx) => 
                          idx !== index && selectedId === eq.equipmentId
                        );
                        return !selectedInOtherSlots;
                      })
                      .length === 0 ? (
                      <>
                        <SelectItem value="__none__">None (No Selection)</SelectItem>
                        <SelectItem value="none" disabled>No computers available</SelectItem>
                      </>
                    ) : (
                      [
                        <SelectItem key="none" value="__none__">None (No Selection)</SelectItem>,
                        ...availableEquipment.computers
                          .filter(eq => {
                            // Show if not selected anywhere, or if selected in this specific slot
                            const selectedInOtherSlots = selectedCustomerComputers.some((selectedId, idx) => 
                              idx !== index && selectedId === eq.equipmentId
                            );
                            return !selectedInOtherSlots;
                          })
                          .map(equipment => (
                          <SelectItem key={equipment.id} value={equipment.equipmentId}>
                            <div className="flex items-center">
                              <span>{equipment.equipmentId}</span>
                              {getStatusBadge(equipment.equipmentId)}
                            </div>
                          </SelectItem>
                        ))]
                    )}
                  </SelectContent>
                </Select>
                {selectedCustomerComputers[index] && (
                  <div className="text-xs text-gray-600">
                    Selected: {getSelectedEquipment(selectedCustomerComputers[index])?.equipmentId}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EquipmentSelectionPanel;
