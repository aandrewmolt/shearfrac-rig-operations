import React, { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import {
  AlertTriangle,
  CheckCircle,
  Wrench,
  MoreVertical,
  Clock,
  Package
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

interface BaseEquipmentNodeProps {
  id: string;
  data: {
    label?: string;
    equipmentId?: string;
    equipmentName?: string | null;
    assigned?: boolean;
    jobId?: string;
    [key: string]: unknown;
  };
  children: React.ReactNode;
  className?: string;
  nodeType?: string;
}

/**
 * BaseEquipmentNode - Unified equipment management wrapper for all equipment nodes
 * Provides consistent equipment assignment, red tag, maintenance, and status tracking
 */
export const BaseEquipmentNode: React.FC<BaseEquipmentNodeProps> = ({
  id,
  data,
  children,
  className = '',
  nodeType = 'Equipment'
}) => {
  const { setNodes } = useReactFlow();
  const { data: inventoryData, refreshData } = useInventory();
  const { createRedTagEvent, getEquipmentTotalHours, endUsageSession } = useEquipmentUsageTracking();

  const [showRedTagDialog, setShowRedTagDialog] = useState(false);
  const [redTagReason, setRedTagReason] = useState('');
  const [redTagSeverity, setRedTagSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [isProcessing, setIsProcessing] = useState(false);

  const isAssigned = data.assigned && data.equipmentId;

  // Find the actual equipment from inventory
  const equipment = isAssigned
    ? inventoryData.individualEquipment.find(eq => eq.equipmentId === data.equipmentId)
    : null;

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
      // End any active usage session
      if (data.jobId) {
        await endUsageSession(equipment.id, new Date(), `Red tagged: ${redTagReason}`);
      }

      // Create red tag event
      await createRedTagEvent(equipment.id, redTagReason, redTagSeverity);

      // Update equipment status in database
      await tursoDb.updateIndividualEquipment(equipment.id, {
        status: 'red-tagged',
        jobId: null, // Remove from job
        notes: `Red Tagged: ${redTagReason} (${redTagSeverity} severity)`
      });

      // Remove equipment from the node on the diagram
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === id) {
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

      // Refresh inventory data
      await refreshData();

      toast({
        title: "Equipment Red Tagged & Removed",
        description: `${equipment.equipmentId} has been red-tagged and removed from the job. You can now assign replacement equipment.`,
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
      console.error('Failed to mark for maintenance:', error);
      toast({
        title: "Error",
        description: "Failed to mark for maintenance",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveEquipment = () => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
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

    toast({
      title: "Equipment Removed",
      description: `Equipment has been removed from ${nodeType}`,
    });
  };

  // Apply status styling to the wrapper
  const wrapperClassName = `relative ${className} ${
    isRedTagged ? 'ring-2 ring-destructive ring-offset-2' :
    isMaintenance ? 'ring-2 ring-warning ring-offset-2' : ''
  }`;

  return (
    <>
      <div className={wrapperClassName}>
        {/* Status indicator */}
        {(isRedTagged || isMaintenance) && (
          <div className="absolute -top-3 -right-3 z-20">
            {isRedTagged ? (
              <div className="bg-destructive rounded-full p-1 shadow-lg">
                <AlertTriangle className="h-4 w-4 text-white animate-pulse" />
              </div>
            ) : (
              <div className="bg-warning rounded-full p-1 shadow-lg">
                <Wrench className="h-4 w-4 text-white animate-pulse" />
              </div>
            )}
          </div>
        )}

        {/* Context Menu - Only show if equipment is assigned */}
        {isAssigned && equipment && (
          <div className="absolute top-1 right-1 z-50">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  data-menu-trigger
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 bg-muted/80 hover:bg-muted border border-border"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <MoreVertical className="h-4 w-4 text-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-bold">
                  {equipment.equipmentId}
                </DropdownMenuLabel>
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  {equipment.name}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {!isRedTagged && !isMaintenance && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setShowRedTagDialog(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Red Tag & Replace
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={handleMarkMaintenance}>
                      <Wrench className="mr-2 h-4 w-4" />
                      Mark for Maintenance
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={handleRemoveEquipment}>
                      <Package className="mr-2 h-4 w-4" />
                      Remove Equipment
                    </DropdownMenuItem>
                  </>
                )}

                {isRedTagged && (
                  <DropdownMenuItem
                    onClick={handleClearRedTag}
                    className="text-foreground"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Clear Red Tag
                  </DropdownMenuItem>
                )}

                {isMaintenance && (
                  <DropdownMenuItem
                    onClick={handleClearRedTag}
                    className="text-foreground"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete Maintenance
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="text-xs">
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
            <DialogTitle>Red Tag & Replace Equipment</DialogTitle>
            <DialogDescription>
              Mark {equipment?.equipmentId} as requiring repair and remove it from this job
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
              <Select value={redTagSeverity} onValueChange={(v) => setRedTagSeverity(v as 'low' | 'medium' | 'high' | 'critical')}>
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
              {isProcessing ? 'Processing...' : 'Red Tag & Remove from Job'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
