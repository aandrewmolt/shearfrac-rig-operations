
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowRightLeft, Calendar as CalendarIcon, Package } from 'lucide-react';
import { useInventory } from '@/contexts/InventoryContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { isEquipmentAtLocation } from '@/utils/equipmentLocation';

const StorageTransferManager = () => {
  const { data, updateIndividualEquipment } = useInventory();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [transferDate, setTransferDate] = useState<Date>(() => new Date());
  const [notes, setNotes] = useState('');

  const getAvailableEquipment = (locationId: string) => {
    return data.individualEquipment
      .filter(item => item.status === 'available' && isEquipmentAtLocation(item, locationId, 'storage'));
  };

  const getEquipmentTypeName = (typeId: string) => {
    const type = data.equipmentTypes.find(t => t.id === typeId);
    return type?.name || 'Unknown Type';
  };

  const handleTransfer = async () => {
    if (!selectedEquipmentId || !toLocation) {
      toast.error('Please select equipment and destination');
      return;
    }

    const equipment = data.individualEquipment.find(item => item.id === selectedEquipmentId);
    if (!equipment) {
      toast.error('Equipment not found');
      return;
    }

    if (equipment.locationId === toLocation) {
      toast.error('Equipment is already at the destination');
      return;
    }

    try {
      await updateIndividualEquipment(selectedEquipmentId, {
        locationId: toLocation,
        notes: notes ? `Transferred from ${data.storageLocations.find(l => l.id === equipment.locationId)?.name} on ${format(transferDate, 'PPP')}. ${notes}`.trim() : undefined,
        lastUpdated: new Date(),
      });

      toast.success('Equipment transferred successfully');
      resetForm();
    } catch (error) {
      console.error('Transfer failed:', error);
      toast.error('Failed to transfer equipment');
    }
  };

  const resetForm = () => {
    setSelectedEquipmentId('');
    setFromLocation('');
    setToLocation('');
    setNotes('');
    setIsDialogOpen(false);
  };

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowRightLeft className="h-5 w-5" />
            Storage Transfer
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Package className="mr-2 h-4 w-4" />
                Transfer Equipment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Transfer Equipment Between Locations</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">From Location</label>
                  <Select value={fromLocation} onValueChange={setFromLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source location" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.storageLocations.map(location => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {fromLocation && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Select Equipment</label>
                    <Select value={selectedEquipmentId} onValueChange={setSelectedEquipmentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select equipment to transfer" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableEquipment(fromLocation).map(equipment => (
                          <SelectItem key={equipment.id} value={equipment.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{equipment.name || getEquipmentTypeName(equipment.typeId)}</span>
                              <Badge variant="outline" className="ml-2">{equipment.equipmentId}</Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {getAvailableEquipment(fromLocation).length === 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        No available equipment at this location
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">To Location</label>
                  <Select value={toLocation} onValueChange={setToLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.storageLocations.map(location => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Transfer Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(transferDate, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={transferDate}
                        onSelect={(date) => date && setTransferDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Transfer reason or notes..."
                  />
                </div>

                <Button onClick={handleTransfer} className="w-full">
                  Transfer Equipment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500">
          <ArrowRightLeft className="mx-auto h-12 w-12 text-gray-300 mb-2" />
          <p className="text-sm">Use the transfer button to move equipment between storage locations</p>
          <p className="text-xs text-gray-400 mt-1">Transfer individual equipment items between storage locations</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default StorageTransferManager;
