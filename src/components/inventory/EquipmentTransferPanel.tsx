
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft, Package, Building, Briefcase } from 'lucide-react';
import { useUnifiedInventory } from '@/hooks/useUnifiedInventory';
import { useJobs } from '@/hooks/useJobs';
import { toast } from 'sonner';
import { isEquipmentAtLocation } from '@/utils/equipmentLocation';

const EquipmentTransferPanel = () => {
  const { data, updateEquipment } = useUnifiedInventory();
  const { jobs } = useJobs();
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const getEquipmentTypeName = (typeId: string) => {
    const type = data.equipmentTypes.find(t => t.id === typeId);
    return type?.name || 'Unknown Type';
  };

  const getLocationName = (locationId: string) => {
    const location = data.storageLocations.find(l => l.id === locationId);
    return location?.name || 'Unknown Location';
  };

  const getAvailableEquipment = (locationId: string) => {
    return data.individualEquipment
      .filter(item => 
        item.status === 'available' && 
        isEquipmentAtLocation(item, locationId, 'storage')
      );
  };

  const handleTransfer = async () => {
    if (!selectedEquipmentId || !toLocationId) {
      toast.error('Please select equipment and destination');
      return;
    }

    const equipment = data.individualEquipment.find(item => item.id === selectedEquipmentId);
    if (!equipment) {
      toast.error('Equipment not found');
      return;
    }

    if (equipment.locationId === toLocationId) {
      toast.error('Equipment is already at the destination');
      return;
    }

    setIsTransferring(true);
    try {
      await updateEquipment(selectedEquipmentId, {
        locationId: toLocationId,
        notes: `Transferred from ${getLocationName(equipment.locationId)}. Reason: ${transferReason}. ${notes}`.trim(),
        lastUpdated: new Date(),
      });

      toast.success('Equipment transferred successfully');
      resetForm();
    } catch (error) {
      console.error('Transfer failed:', error);
      toast.error('Failed to transfer equipment');
    } finally {
      setIsTransferring(false);
    }
  };

  const resetForm = () => {
    setSelectedEquipmentId('');
    setFromLocationId('');
    setToLocationId('');
    setTransferReason('');
    setNotes('');
  };

  const recentTransfers = data.individualEquipment
    .filter(item => item.notes?.includes('Transferred from'))
    .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
    .slice(0, 10);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-white shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowRightLeft className="h-5 w-5" />
            Transfer Equipment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Source Location</label>
            <Select value={fromLocationId} onValueChange={setFromLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select source location" />
              </SelectTrigger>
              <SelectContent>
                {data.storageLocations.map(location => (
                  <SelectItem key={location.id} value={location.id}>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      {location.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {fromLocationId && (
            <div>
              <label className="block text-sm font-medium mb-1">Select Equipment</label>
              <Select value={selectedEquipmentId} onValueChange={setSelectedEquipmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select equipment to transfer" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableEquipment(fromLocationId).map(equipment => (
                    <SelectItem key={equipment.id} value={equipment.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{equipment.name || getEquipmentTypeName(equipment.typeId)}</span>
                        <Badge variant="outline" className="ml-2">{equipment.equipmentId}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getAvailableEquipment(fromLocationId).length === 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  No available equipment at this location
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Destination Location</label>
            <Select value={toLocationId} onValueChange={setToLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                {data.storageLocations.map(location => (
                  <SelectItem key={location.id} value={location.id}>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      {location.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Transfer Reason</label>
            <Input
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="Job completion, maintenance, reallocation..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional transfer details..."
              className="h-20"
            />
          </div>

          <Button 
            onClick={handleTransfer} 
            className="w-full"
            disabled={isTransferring}
          >
            {isTransferring ? 'Transferring...' : 'Transfer Equipment'}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            Recent Transfers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransfers.length > 0 ? (
            <div className="space-y-3">
              {recentTransfers.map(item => (
                <div key={item.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{item.name || getEquipmentTypeName(item.typeId)}</span>
                    <Badge variant="outline">{item.equipmentId}</Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>Current: {getLocationName(item.locationId)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {item.lastUpdated.toLocaleDateString()} at {item.lastUpdated.toLocaleTimeString()}
                    </div>
                    {item.notes && (
                      <div className="text-xs text-gray-500 mt-1">{item.notes}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ArrowRightLeft className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No recent transfers</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EquipmentTransferPanel;
