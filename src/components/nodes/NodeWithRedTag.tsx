import React, { useState } from 'react';
import { 
  AlertTriangle, CheckCircle, Wrench, MoreVertical, Clock 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInventory } from '@/contexts/InventoryContext';
import { tursoDb } from '@/services/tursoDb';
import { toast } from '@/hooks/use-toast';
import { useEquipmentUsageTracking } from '@/hooks/equipment/useEquipmentUsageTracking';

interface NodeWithRedTagProps {
  children: React.ReactNode;
  equipmentId?: string;
  nodeId: string;
  className?: string;
}

export const NodeWithRedTag: React.FC<NodeWithRedTagProps> = ({ 
  children, 
  equipmentId,
  nodeId,
  className = ''
}) => {
  const { data: inventoryData, refreshData } = useInventory();
  const { createRedTagEvent, getEquipmentTotalHours } = useEquipmentUsageTracking();
  
  const [showRedTagDialog, setShowRedTagDialog] = useState(false);
  const [redTagReason, setRedTagReason] = useState('');
  const [redTagSeverity, setRedTagSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [isProcessing, setIsProcessing] = useState(false);

  // Find the actual equipment from inventory
  const equipment = equipmentId ? inventoryData.individualEquipment.find(
    eq => eq.equipmentId === equipmentId
  ) : null;
  
  const isRedTagged = equipment?.status === 'red-tagged';
  const isMaintenance = equipment?.status === 'maintenance';
  const totalHours = equipment ? getEquipmentTotalHours(equipment.id) : 0;

  const handleRedTag = async () => {
    if (!equipment) {
      toast({
        title: "Error",
        description: "Equipment not found in inventory",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Create red tag event
      await createRedTagEvent(equipment.id, redTagReason, redTagSeverity);
      
      // Update equipment status in database
      await tursoDb.updateIndividualEquipment(equipment.id, {
        status: 'red-tagged',
        notes: `Red Tagged: ${redTagReason} (${redTagSeverity} severity)`
      });

      // Refresh inventory data
      await refreshData();

      toast({
        title: "Equipment Red Tagged",
        description: `${equipment.equipmentId} has been marked as red-tagged`,
        variant: "destructive"
      });

      setShowRedTagDialog(false);
      setRedTagReason('');
    } catch (error) {
      console.error('Failed to red tag equipment:', error);
      toast({
        title: "Error",
        description: "Failed to red tag equipment",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearRedTag = async () => {
    if (!equipment) return;

    setIsProcessing(true);
    try {
      await tursoDb.updateIndividualEquipment(equipment.id, {
        status: 'available',
        notes: 'Red tag cleared'
      });

      await refreshData();

      toast({
        title: "Red Tag Cleared",
        description: `${equipment.equipmentId} is now available`,
      });
    } catch (error) {
      console.error('Failed to clear red tag:', error);
      toast({
        title: "Error",
        description: "Failed to clear red tag",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkMaintenance = async () => {
    if (!equipment) return;

    setIsProcessing(true);
    try {
      await tursoDb.updateIndividualEquipment(equipment.id, {
        status: 'maintenance',
        notes: 'Scheduled maintenance'
      });

      await refreshData();

      toast({
        title: "Marked for Maintenance",
        description: `${equipment.equipmentId} is now in maintenance`,
      });
    } catch (error) {
      console.error('Failed to mark maintenance:', error);
      toast({
        title: "Error",
        description: "Failed to mark for maintenance",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply red tag styling to the wrapper
  const wrapperClassName = `relative ${className} ${
    isRedTagged ? 'ring-2 ring-red-500 ring-offset-2' : 
    isMaintenance ? 'ring-2 ring-yellow-500 ring-offset-2' : ''
  }`;

  return (
    <>
      <div className={wrapperClassName}>
        {/* Status indicator */}
        {(isRedTagged || isMaintenance) && (
          <div className="absolute -top-3 -right-3 z-20">
            {isRedTagged ? (
              <div className="bg-red-500 rounded-full p-1">
                <AlertTriangle className="h-4 w-4 text-white animate-pulse" />
              </div>
            ) : (
              <div className="bg-yellow-500 rounded-full p-1">
                <Wrench className="h-4 w-4 text-white animate-pulse" />
              </div>
            )}
          </div>
        )}

        {/* Context Menu */}
        {equipment && (
          <div className="absolute top-1 right-1 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 bg-gray-800/50 hover:bg-gray-700"
                >
                  <MoreVertical className="h-4 w-4 text-white" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {equipment.equipmentId}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {!isRedTagged && !isMaintenance && (
                  <>
                    <DropdownMenuItem 
                      onClick={() => setShowRedTagDialog(true)}
                      className="text-red-600"
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Red Tag Equipment
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={handleMarkMaintenance}>
                      <Wrench className="mr-2 h-4 w-4" />
                      Mark for Maintenance
                    </DropdownMenuItem>
                  </>
                )}
                
                {isRedTagged && (
                  <DropdownMenuItem 
                    onClick={handleClearRedTag}
                    className="text-green-600"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Clear Red Tag
                  </DropdownMenuItem>
                )}
                
                {isMaintenance && (
                  <DropdownMenuItem 
                    onClick={handleClearRedTag}
                    className="text-green-600"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete Maintenance
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <Clock className="mr-2 h-4 w-4" />
                  {totalHours.toFixed(1)} hours used
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {children}
      </div>

      {/* Red Tag Dialog */}
      <Dialog open={showRedTagDialog} onOpenChange={setShowRedTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Red Tag Equipment</DialogTitle>
            <DialogDescription>
              Mark {equipment?.equipmentId} as requiring maintenance or repair
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Equipment Details</Label>
              <div className="text-sm text-muted-foreground">
                <div>ID: {equipment?.equipmentId}</div>
                <div>Type: {equipment?.name}</div>
                <div>Total Hours: {totalHours.toFixed(1)}</div>
              </div>
            </div>
            
            <div>
              <Label>Reason for Red Tag</Label>
              <Textarea
                value={redTagReason}
                onChange={(e) => setRedTagReason(e.target.value)}
                placeholder="Describe the issue..."
                rows={3}
              />
            </div>
            
            <div>
              <Label>Severity</Label>
              <Select value={redTagSeverity} onValueChange={(v: any) => setRedTagSeverity(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Minor issue</SelectItem>
                  <SelectItem value="medium">Medium - Needs attention soon</SelectItem>
                  <SelectItem value="high">High - Critical issue</SelectItem>
                  <SelectItem value="critical">Critical - Immediate action required</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRedTagDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRedTag}
              disabled={!redTagReason || isProcessing}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Confirm Red Tag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};