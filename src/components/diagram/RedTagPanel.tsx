
import React, { useState } from 'react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, AlertTriangle, X } from 'lucide-react';
import { useInventory } from '@/contexts/InventoryContext';
import { toast } from 'sonner';

interface RedTaggedItem {
  id: string;
  equipmentTypeId: string;
  reason: string;
  addedDate: Date;
  notes?: string;
  individualEquipmentId?: string;
}

const RedTagPanel: React.FC = () => {
  const { data } = useInventory();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEquipmentType, setSelectedEquipmentType] = useState('');
  const [selectedIndividualEquipment, setSelectedIndividualEquipment] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [redTaggedItems, setRedTaggedItems] = useState<RedTaggedItem[]>([]);

  const getEquipmentTypeName = (typeId: string) => {
    return data.equipmentTypes.find(type => type.id === typeId)?.name || 'Unknown';
  };

  const getIndividualEquipmentName = (equipmentId: string) => {
    return data.individualEquipment.find(eq => eq.id === equipmentId)?.equipmentId || 'Unknown';
  };

  const selectedType = data.equipmentTypes.find(type => type.id === selectedEquipmentType);
  const requiresIndividualTracking = selectedType?.requiresIndividualTracking || false;

  // Get available individual equipment for the selected type (including red-tagged ones)
  const availableIndividualEquipment = data.individualEquipment.filter(
    eq => eq.typeId === selectedEquipmentType
  );

  const handleAddRedTag = () => {
    if (!selectedEquipmentType || !reason.trim()) {
      toast.error('Please select equipment type and provide a reason');
      return;
    }

    if (requiresIndividualTracking && !selectedIndividualEquipment) {
      toast.error('Please select a specific equipment item');
      return;
    }

    const newRedTag: RedTaggedItem = {
      id: `red-tag-${Date.now()}`,
      equipmentTypeId: selectedEquipmentType,
      reason: reason.trim(),
      addedDate: new Date(),
      notes: notes.trim() || undefined,
      individualEquipmentId: requiresIndividualTracking ? selectedIndividualEquipment : undefined,
    };

    setRedTaggedItems(prev => [...prev, newRedTag]);
    
    // Reset form
    setSelectedEquipmentType('');
    setSelectedIndividualEquipment('');
    setReason('');
    setNotes('');
    setIsDialogOpen(false);
    
    toast.success('Red tagged equipment added to location');
  };

  const handleRemoveRedTag = (redTagId: string) => {
    setRedTaggedItems(prev => prev.filter(item => item.id !== redTagId));
    toast.success('Red tagged equipment removed');
  };

  const handleEquipmentTypeChange = (typeId: string) => {
    setSelectedEquipmentType(typeId);
    setSelectedIndividualEquipment('');
  };

  const commonReasons = [
    'Damaged',
    'Needs Repair',
    'Calibration Required',
    'Missing Parts',
    'Suspected Fault',
    'Scheduled Maintenance',
  ];

  return (
    <CollapsibleCard
      className="bg-white shadow-lg border-red-200"
      defaultOpen={redTaggedItems.length > 0}
      title={<span className="text-red-700">Red Tagged Equipment</span>}
      icon={<AlertTriangle className="h-5 w-5 text-red-700" />}
      badge={redTaggedItems.length > 0 && (
        <Badge variant="destructive" className="ml-2">
          {redTaggedItems.length}
        </Badge>
      )}
      action={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="destructive">
              <Plus className="mr-2 h-4 w-4" />
              Add Red Tag
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Red Tagged Equipment on Location</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Equipment Type</label>
                  <Select value={selectedEquipmentType} onValueChange={handleEquipmentTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select equipment type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {data.equipmentTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center gap-2">
                            {type.name}
                            {type.requiresIndividualTracking && (
                              <Badge variant="outline" className="text-xs">Individual</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {requiresIndividualTracking && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Select Specific Equipment
                      <AlertTriangle className="inline h-4 w-4 ml-1 text-orange-500" />
                    </label>
                    <Select value={selectedIndividualEquipment} onValueChange={setSelectedIndividualEquipment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select specific equipment" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {availableIndividualEquipment.map(equipment => (
                          <SelectItem key={equipment.id} value={equipment.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{equipment.equipmentId}</span>
                              <span className="text-sm text-gray-500">{equipment.name}</span>
                              <Badge 
                                variant={equipment.status === 'red-tagged' ? 'destructive' : 'secondary'}
                                className="text-xs w-fit"
                              >
                                {equipment.status}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Red Tag Reason</label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {commonReasons.map(reasonOption => (
                        <SelectItem key={reasonOption} value={reasonOption}>
                          {reasonOption}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional details about the red tag issue..."
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={handleAddRedTag} 
                  className="w-full"
                  variant="destructive"
                  disabled={!selectedEquipmentType || !reason.trim() || (requiresIndividualTracking && !selectedIndividualEquipment)}
                >
                  Add Red Tagged Equipment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
      }
    >
      <div className="space-y-4">
        {redTaggedItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-300 mb-2" />
            <p className="text-sm">No red tagged equipment on location</p>
            <p className="text-xs text-gray-400 mt-1">
              Track damaged or non-functional equipment
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-red-700">Red Tagged Equipment:</h4>
            {redTaggedItems.map(item => {
              const equipmentType = data.equipmentTypes.find(type => type.id === item.equipmentTypeId);
              const isIndividuallyTracked = equipmentType?.requiresIndividualTracking;
              
              return (
                <div key={item.id} className="flex items-start justify-between p-3 border rounded-lg bg-red-50 border-red-200">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{getEquipmentTypeName(item.equipmentTypeId)}</span>
                      {isIndividuallyTracked && item.individualEquipmentId && (
                        <Badge variant="destructive" className="text-xs">
                          {getIndividualEquipmentName(item.individualEquipmentId)}
                        </Badge>
                      )}
                      <Badge variant="destructive" className="text-xs">
                        Red Tagged
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div><strong>Reason:</strong> {item.reason}</div>
                      <div><strong>Added:</strong> {item.addedDate.toLocaleDateString()}</div>
                      {item.notes && (
                        <div><strong>Notes:</strong> {item.notes}</div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveRedTag(item.id)}
                    className="h-7 w-7 p-0 ml-2"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
};

export default RedTagPanel;
