import React, { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Satellite, Square, Plus, X, AlertCircle, CheckCircle, RefreshCw, Tablet } from 'lucide-react';
import { useInventory } from '@/contexts/InventoryContext';
import { useEquipmentQueries } from '@/hooks/useEquipmentQueries';
import { IndividualEquipment } from '@/types/inventory';
import QuickStatusFix from '@/components/inventory/QuickStatusFix';

interface UnifiedEquipmentSelectionPanelProps {
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
  variant?: 'standard' | 'compact'; // Controls styling and layout
}

export const UnifiedEquipmentSelectionPanel: React.FC<UnifiedEquipmentSelectionPanelProps> = ({
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
  variant = 'standard',
}) => {
  const { data } = useInventory();
  const { refetch } = useEquipmentQueries();

  // Filter available equipment by type and status
  const availableEquipment = useMemo(() => {
    // Show all equipment for debugging - normally would filter by status === 'available'
    const available = data.individualEquipment;
    
    return {
      ssBoxes: available.filter(eq => eq.equipmentId.startsWith('SS')),
      starlinks: available.filter(eq => eq.equipmentId.startsWith('SL')),
      computers: available.filter(eq => eq.equipmentId.startsWith('CC')),
      tablets: available.filter(eq => eq.equipmentId.startsWith('CT')),
    };
  }, [data.individualEquipment]);

  // Combine computers and tablets for customer devices
  const allCustomerDevices = [...availableEquipment.computers, ...availableEquipment.tablets];

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

  // Compact Equipment Section Component for compact variant
  const CompactEquipmentSection = ({ 
    title, 
    icon: Icon, 
    color, 
    count, 
    selectedItems, 
    availableItems, 
    onSelect, 
    onAdd, 
    onRemove, 
    type 
  }: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    count: number;
    selectedItems: string[];
    availableItems: IndividualEquipment[];
    onSelect: (equipmentId: string, index?: number) => void;
    onAdd: () => void;
    onRemove: (index: number) => void;
    type: string;
  }) => (
    <div className="space-y-3">
      <div className={`flex items-center justify-between p-3 bg-gradient-to-r ${color} rounded-lg border border-opacity-30`}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/20 rounded">
            <Icon className="h-4 w-4 text-white" />
          </div>
          <Label className="text-sm font-semibold text-white">
            {title} ({availableItems.length} available)
          </Label>
        </div>
        <Button
          onClick={onAdd}
          size="sm"
          variant="outline"
          className="h-7 w-7 p-0 bg-white/20 border-white/30 text-white hover:bg-white/30"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-opacity-50 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${selectedItems[index] ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <Label className="text-xs font-medium text-gray-700">{type} {index + 1}</Label>
              {selectedItems[index] && (
                <CheckCircle className="h-3 w-3 text-green-500" />
              )}
            </div>
            {count > 1 && (
              <Button
                onClick={() => onRemove(index)}
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 text-red-500 hover:bg-red-50"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <Select
            value={selectedItems[index] || ''}
            onValueChange={(value) => onSelect(value, index)}
          >
            <SelectTrigger className="h-8 text-xs border-2 border-gray-200 hover:border-blue-300 focus:border-blue-400 transition-all duration-200">
              <SelectValue placeholder={`Select ${type}...`} />
            </SelectTrigger>
            <SelectContent className="bg-white border-2 border-gray-100 shadow-xl z-50">
              {availableItems
                .filter(eq => !selectedItems.includes(eq.id) || selectedItems[index] === eq.id)
                .length === 0 ? (
                <SelectItem value="none" disabled className="text-gray-400">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 text-red-400" />
                    No {title.toLowerCase()} available
                  </div>
                </SelectItem>
              ) : (
                availableItems
                  .filter(eq => !selectedItems.includes(eq.id) || selectedItems[index] === eq.id)
                  .map(equipment => (
                    <SelectItem key={equipment.id} value={equipment.id} className="hover:bg-blue-50">
                      <span className="font-medium">{equipment.equipmentId}</span>
                    </SelectItem>
                  ))
              )}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );

  if (variant === 'compact') {
    return (
      <Card className="bg-gradient-to-br from-white to-indigo-50/30 shadow-lg border-indigo-200/50">
        <CardHeader className="pb-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <div className="p-1.5 bg-white/20 rounded-md">
              <Square className="h-4 w-4" />
            </div>
            Equipment Assignment
            <Badge variant="secondary" className="ml-auto bg-white/20 text-white border-white/30">
              {shearstreamBoxCount + customerComputerCount + (hasWellsideGauge ? 1 : 0)} total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* ShearStream Boxes */}
          <CompactEquipmentSection
            title="SS Boxes"
            icon={Square}
            color="from-blue-500 to-indigo-600"
            count={shearstreamBoxCount}
            selectedItems={selectedShearstreamBoxes}
            availableItems={availableEquipment.ssBoxes}
            onSelect={(equipmentId, index) => onEquipmentSelect('shearstream-box', equipmentId, index)}
            onAdd={onAddShearstreamBox}
            onRemove={onRemoveShearstreamBox}
            type="Box"
          />

          {/* Starlink */}
          {hasWellsideGauge && (
            <CompactEquipmentSection
              title="Starlink"
              icon={Satellite}
              color="from-orange-500 to-amber-600"
              count={1}
              selectedItems={selectedStarlink ? [selectedStarlink] : []}
              availableItems={availableEquipment.starlinks}
              onSelect={(equipmentId) => onEquipmentSelect('starlink', equipmentId)}
              onAdd={() => {}} // No add for single starlink
              onRemove={() => {}} // No remove for single starlink
              type="Starlink"
            />
          )}

          {/* Customer Computers */}
          {customerComputerCount > 0 && (
            <CompactEquipmentSection
              title="Customer Devices"
              icon={Monitor}
              color="from-purple-500 to-violet-600"
              count={customerComputerCount}
              selectedItems={selectedCustomerComputers}
              availableItems={allCustomerDevices}
              onSelect={(equipmentId, index) => onEquipmentSelect('customer-computer', equipmentId, index)}
              onAdd={() => {}} // Add functionality would need to be passed as prop
              onRemove={() => {}} // Remove functionality would need to be passed as prop
              type="Device"
            />
          )}
        </CardContent>
      </Card>
    );
  }

  // Standard variant (original EquipmentSelectionPanel functionality)
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

        {/* Starlink Selection */}
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

        {/* Customer Computers Selection */}
        {customerComputerCount > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="h-3 w-3" />
                <Label className="text-sm font-medium">
                  Customer Devices ({allCustomerDevices.length} available, {customerComputerCount} needed)
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
                  <Label className="text-xs">Device {index + 1}</Label>
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
                    <SelectValue placeholder="Select Device..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    {allCustomerDevices
                      .filter(eq => {
                        const selectedInOtherSlots = selectedCustomerComputers.some((selectedId, idx) => 
                          idx !== index && selectedId === eq.equipmentId
                        );
                        return !selectedInOtherSlots;
                      })
                      .length === 0 ? (
                      <>
                        <SelectItem value="__none__">None (No Selection)</SelectItem>
                        <SelectItem value="none" disabled>No devices available</SelectItem>
                      </>
                    ) : (
                      [
                        <SelectItem key="none" value="__none__">None (No Selection)</SelectItem>,
                        ...allCustomerDevices
                          .filter(eq => {
                            const selectedInOtherSlots = selectedCustomerComputers.some((selectedId, idx) => 
                              idx !== index && selectedId === eq.equipmentId
                            );
                            return !selectedInOtherSlots;
                          })
                          .map(equipment => (
                          <SelectItem key={equipment.id} value={equipment.equipmentId}>
                            <div className="flex items-center">
                              {equipment.equipmentId.startsWith('CT') ? (
                                <Tablet className="h-3 w-3 mr-1" />
                              ) : (
                                <Monitor className="h-3 w-3 mr-1" />
                              )}
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

export default UnifiedEquipmentSelectionPanel;