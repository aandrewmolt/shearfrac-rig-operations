import React, { useState } from 'react';
import { 
  AlertTriangle, MoreVertical, Wrench, CheckCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from '@/components/ui/popover';
import { useInventory } from '@/contexts/InventoryContext';
import { tursoDb } from '@/services/tursoDb';
import { toast } from '@/hooks/use-toast';
import { useReactFlow } from '@xyflow/react';

interface SimpleRedTagMenuProps {
  equipmentId: string;
  nodeId: string;
}

export const SimpleRedTagMenu: React.FC<SimpleRedTagMenuProps> = ({ 
  equipmentId,
  nodeId 
}) => {
  const { data: inventoryData, refreshData } = useInventory();
  const { setNodes } = useReactFlow();
  const [open, setOpen] = useState(false);
  
  const equipment = inventoryData.individualEquipment.find(
    eq => eq.equipmentId === equipmentId
  );
  
  if (!equipment) return null;
  
  const isRedTagged = equipment.status === 'red-tagged';
  const isMaintenance = equipment.status === 'maintenance';

  const handleRedTag = async () => {
    try {
      // Update equipment status
      await tursoDb.updateIndividualEquipment(equipment.id, {
        status: 'red-tagged',
        jobId: null,
        notes: 'Red tagged from job diagram'
      });

      // Remove from node
      setNodes((nodes) => 
        nodes.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                equipmentId: null,
                equipmentName: null,
                assigned: false
              }
            };
          }
          return node;
        })
      );

      await refreshData();
      
      toast({
        title: "Equipment Red Tagged",
        description: `${equipment.equipmentId} removed from job`,
        variant: "destructive"
      });

      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to red tag equipment",
        variant: "destructive"
      });
    }
  };

  const handleClearStatus = async () => {
    try {
      await tursoDb.updateIndividualEquipment(equipment.id, {
        status: 'available',
        notes: 'Status cleared'
      });

      await refreshData();
      
      toast({
        title: "Status Cleared",
        description: `${equipment.equipmentId} is now available`,
      });

      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear status",
        variant: "destructive"
      });
    }
  };

  return (
    <div 
      className="absolute top-0 right-0 z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 bg-black/50 hover:bg-black/70"
          >
            <MoreVertical className="h-3 w-3 text-white" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="end">
          {!isRedTagged && !isMaintenance && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-red-600"
                onClick={handleRedTag}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Red Tag & Remove
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={async () => {
                  await tursoDb.updateIndividualEquipment(equipment.id, {
                    status: 'maintenance',
                    notes: 'Maintenance required'
                  });
                  await refreshData();
                  toast({
                    title: "Marked for Maintenance",
                    description: equipment.equipmentId,
                  });
                  setOpen(false);
                }}
              >
                <Wrench className="mr-2 h-4 w-4" />
                Maintenance
              </Button>
            </>
          )}
          
          {(isRedTagged || isMaintenance) && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-green-600"
              onClick={handleClearStatus}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Clear Status
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};