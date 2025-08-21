
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Zap, Satellite, Monitor } from 'lucide-react';
import { useInventory } from '@/contexts/InventoryContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface FloatingDiagramControlsProps {
  selectedCableType: string;
  setSelectedCableType: (type: string) => void;
  addYAdapter: () => void;
  onAddShearstreamBox: () => void;
  addCustomerComputer: () => void;
  jobId?: string;
}

const FloatingDiagramControls: React.FC<FloatingDiagramControlsProps> = ({
  selectedCableType,
  setSelectedCableType,
  addYAdapter,
  onAddShearstreamBox,
  addCustomerComputer,
  jobId,
}) => {
  const { data: inventoryData } = useInventory();
  const isMobile = useIsMobile();

  // Get cable types that have available individual items
  const availableCableTypes = inventoryData.equipmentTypes
    .filter(type => type.category === 'cables')
    .filter(cableType => {
      const availableItems = inventoryData.individualEquipment
        .filter(item => 
          item.typeId === cableType.id && 
          (item.status === 'available' || (item.status === 'deployed' && item.jobId === jobId))
        );
      return availableItems.length > 0;
    })
    .map(cableType => {
      const availableCount = inventoryData.individualEquipment
        .filter(item => 
          item.typeId === cableType.id && 
          (item.status === 'available' || (item.status === 'deployed' && item.jobId === jobId))
        ).length;
      return { ...cableType, availableCount };
    });

  // Mobile layout: Bottom bar with improved positioning
  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-20 pb-safe">
        <Card className="bg-white/95 backdrop-blur-sm border-t shadow-lg rounded-t-lg mx-2 mb-2">
          <CardContent className="p-3">
          <div className="flex flex-col gap-3">
            {/* Cable Type Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600 min-w-fit">Cable:</span>
              <Select value={selectedCableType} onValueChange={setSelectedCableType}>
                <SelectTrigger className="h-9 flex-1 text-sm">
                  <SelectValue placeholder="Select cable type" />
                </SelectTrigger>
                <SelectContent>
                  {availableCableTypes.map((cable) => (
                    <SelectItem key={cable.id} value={cable.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{cable.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {cable.availableCount}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={addYAdapter}
                size="sm"
                variant="outline"
                className="h-9 text-xs"
              >
                <Zap className="h-3 w-3 mr-1" />
                Y-Adapter
              </Button>
              
              <Button
                onClick={onAddShearstreamBox}
                size="sm"
                variant="outline"
                className="h-9 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                SS Box
              </Button>
              
              <Button
                onClick={addCustomerComputer}
                size="sm"
                variant="outline"
                className="h-9 text-xs"
              >
                <Monitor className="h-3 w-3 mr-1" />
                Computer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    );
  }

  // Desktop layout: Floating top bar
  return (
    <Card className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-white/95 backdrop-blur-sm border shadow-lg">
      <CardContent className="p-3">
        <div className="flex items-center gap-4">
          {/* Cable Type Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600">Cable:</span>
            <Select value={selectedCableType} onValueChange={setSelectedCableType}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue placeholder="Select cable" />
              </SelectTrigger>
              <SelectContent>
                {availableCableTypes.map((cable) => (
                  <SelectItem key={cable.id} value={cable.id} className="text-xs">
                    <div className="flex items-center justify-between w-full">
                      <span>{cable.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {cable.availableCount} available
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-300" />

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600">Add:</span>
            
            <Button
              onClick={addYAdapter}
              size="sm"
              variant="outline"
              className="h-8 text-xs px-3"
            >
              <Zap className="h-3 w-3 mr-1" />
              Y-Adapter
            </Button>
            
            <Button
              onClick={onAddShearstreamBox}
              size="sm"
              variant="outline"
              className="h-8 text-xs px-3"
            >
              <Plus className="h-3 w-3 mr-1" />
              SS Box
            </Button>
            
            <Button
              onClick={addCustomerComputer}
              size="sm"
              variant="outline"
              className="h-8 text-xs px-3"
            >
              <Monitor className="h-3 w-3 mr-1" />
              Computer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FloatingDiagramControls;
