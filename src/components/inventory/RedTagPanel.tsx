
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, Camera, MapPin } from 'lucide-react';
import { useUnifiedInventory } from '@/hooks/useUnifiedInventory';
import EnhancedRedTagManager from './EnhancedRedTagManager';
import { toast } from 'sonner';
import { isEquipmentAtLocation } from '@/utils/equipmentLocation';

const RedTagPanel = () => {
  const { data, updateEquipment } = useUnifiedInventory();
  const [isRedTagDialogOpen, setIsRedTagDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [filterLocation, setFilterLocation] = useState('all');

  const getEquipmentTypeName = (typeId: string) => {
    const type = data.equipmentTypes.find(t => t.id === typeId);
    return type?.name || 'Unknown Type';
  };

  const getLocationName = (locationId: string) => {
    const location = data.storageLocations.find(l => l.id === locationId);
    return location?.name || 'Unknown Location';
  };

  // Only track individual equipment - bulk items don't have red tag status
  const redTaggedItems = data.individualEquipment.filter(item => 
    item.status === 'red-tagged' &&
    (filterLocation === 'all' || isEquipmentAtLocation(item, filterLocation, 'storage'))
  );

  const availableItems = data.equipmentItems.filter(item => 
    item.status === 'available' && item.quantity > 0
  );

  const handleRedTag = async (itemId: string, reason: string, photos: string[], location?: string) => {
    try {
      await updateEquipment(itemId, {
        status: 'red-tagged',
        redTagReason: reason,
        redTagPhoto: photos.length > 0 ? photos[0] : undefined,
      });
      toast.success('Equipment red-tagged successfully');
    } catch (error) {
      console.error('Failed to red tag equipment:', error);
      toast.error('Failed to red tag equipment');
    }
  };

  const handleRemoveRedTag = async (itemId: string) => {
    try {
      await updateEquipment(itemId, {
        status: 'available',
        redTagReason: undefined,
        redTagPhoto: undefined,
      });
      toast.success('Red tag removed successfully');
    } catch (error) {
      console.error('Failed to remove red tag:', error);
      toast.error('Failed to remove red tag');
    }
  };

  const openRedTagDialog = (item: any) => {
    setSelectedItem(item);
    setIsRedTagDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Red Tagged Items</p>
                <p className="text-2xl font-bold text-red-600">{redTaggedItems.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available Items</p>
                <p className="text-2xl font-bold text-green-600">{availableItems.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-blue-600">{data.equipmentItems.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Red Tagged Equipment Table */}
      <Card className="bg-white shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Red Tagged Equipment
            </CardTitle>
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {data.storageLocations.map(location => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {redTaggedItems.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Red Tag Reason</TableHead>
                    <TableHead>Photo</TableHead>
                    <TableHead>Tagged Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redTaggedItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {getEquipmentTypeName(item.typeId)}
                      </TableCell>
                      <TableCell>{getLocationName(item.locationId)}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell className="max-w-48 truncate">
                        {item.redTagReason || 'No reason specified'}
                      </TableCell>
                      <TableCell>
                        {item.redTagPhoto ? (
                          <div className="flex items-center gap-2">
                            <Camera className="h-4 w-4 text-blue-600" />
                            <span className="text-sm text-blue-600">View Photo</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No photo</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.lastUpdated.toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => handleRemoveRedTag(item.id)}
                          variant="outline"
                          size="sm"
                          className="text-green-600 hover:text-green-700"
                        >
                          Remove Red Tag
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
              <p>No red-tagged equipment</p>
              <p className="text-sm text-gray-400">All equipment is in good condition</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Equipment for Red Tagging */}
      <Card className="bg-white shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5" />
            Available Equipment (Mark as Red Tagged)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availableItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableItems.slice(0, 12).map(item => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{getEquipmentTypeName(item.typeId)}</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {item.quantity} available
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {getLocationName(item.locationId)}
                    </div>
                  </div>
                  <Button
                    onClick={() => openRedTagDialog(item)}
                    variant="outline"
                    size="sm"
                    className="w-full text-red-600 hover:text-red-700"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Red Tag
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No available equipment to red tag</p>
            </div>
          )}
        </CardContent>
      </Card>

      <EnhancedRedTagManager
        isOpen={isRedTagDialogOpen}
        onClose={() => setIsRedTagDialogOpen(false)}
        equipmentItem={selectedItem}
        onRedTag={handleRedTag}
      />
    </div>
  );
};

export default RedTagPanel;
