
import React, { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Monitor, Satellite, Square, Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useInventory } from '@/contexts/InventoryContext';
import { IndividualEquipment } from '@/types/inventory';

interface CompactEquipmentSelectionPanelProps {
  selectedShearstreamBoxes: string[];
  selectedStarlink?: string;
  selectedCustomerComputers: string[];
  customerComputerCount: number;
  shearstreamBoxCount: number;
  onEquipmentSelect: (type: 'shearstream-box' | 'starlink' | 'customer-computer', equipmentId: string, index?: number) => void;
  onAddShearstreamBox: () => void;
  onRemoveShearstreamBox: (index: number) => void;
  hasWellsideGauge: boolean;
}

const CompactEquipmentSelectionPanel: React.FC<CompactEquipmentSelectionPanelProps> = ({
  selectedShearstreamBoxes,
  selectedStarlink,
  selectedCustomerComputers,
  customerComputerCount,
  shearstreamBoxCount,
  onEquipmentSelect,
  onAddShearstreamBox,
  onRemoveShearstreamBox,
  hasWellsideGauge,
}) => {
  const { data } = useInventory();

  const availableEquipment = useMemo(() => {
    const available = data.individualEquipment.filter(eq => eq.status === 'available');
    
    return {
      ssBoxes: available.filter(eq => eq.equipmentId.startsWith('SS')),
      starlinks: available.filter(eq => eq.equipmentId.startsWith('SL')),
      computers: available.filter(eq => eq.equipmentId.startsWith('CC') || eq.equipmentId.startsWith('CT')),
    };
  }, [data.individualEquipment]);

  const getSelectedEquipment = (equipmentId: string) => {
    return data.individualEquipment.find(eq => eq.id === equipmentId);
  };

  const EquipmentSection = ({ 
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
    icon: any;
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
        <EquipmentSection
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
          <EquipmentSection
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
          <EquipmentSection
            title="Customer Computers"
            icon={Monitor}
            color="from-purple-500 to-violet-600"
            count={customerComputerCount}
            selectedItems={selectedCustomerComputers}
            availableItems={availableEquipment.computers}
            onSelect={(equipmentId, index) => onEquipmentSelect('customer-computer', equipmentId, index)}
            onAdd={() => {}} // Add functionality would need to be passed as prop
            onRemove={() => {}} // Remove functionality would need to be passed as prop
            type="Computer"
          />
        )}
      </CardContent>
    </Card>
  );
};

export default CompactEquipmentSelectionPanel;
