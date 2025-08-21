
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { useInventory } from '@/contexts/InventoryContext';
import { toast } from 'sonner';
import LocationEquipmentViewer from './LocationEquipmentViewer';

const StorageLocationManager = () => {
  const { data, addStorageLocation, updateStorageLocation, deleteStorageLocation } = useInventory();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    isDefault: false
  });

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Location name is required');
      return;
    }

    try {
      if (editingLocation) {
        await updateStorageLocation(editingLocation.id, formData);
        toast.success('Storage location updated successfully');
      } else {
        await addStorageLocation(formData);
        toast.success('Storage location created successfully');
      }
      resetForm();
    } catch (error) {
      toast.error('Failed to save storage location');
      console.error('Error saving location:', error);
    }
  };

  const handleEdit = (location: any) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      address: location.address || '',
      isDefault: location.isDefault
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (locationId: string) => {
    if (window.confirm('Are you sure you want to delete this storage location?')) {
      try {
        await deleteStorageLocation(locationId);
        toast.success('Storage location deleted successfully');
      } catch (error) {
        toast.error('Failed to delete storage location');
        console.error('Error deleting location:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: '', address: '', isDefault: false });
    setEditingLocation(null);
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="viewer" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="viewer" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            View All Locations
          </TabsTrigger>
          <TabsTrigger value="manager" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Manage Storage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="viewer">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                All Locations & Equipment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LocationEquipmentViewer />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manager">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Storage Location Management
                </CardTitle>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Location
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {data.storageLocations.map((location) => (
                  <div key={location.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{location.name}</h3>
                        {location.isDefault && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                      </div>
                      {location.address && (
                        <p className="text-sm text-gray-600">{location.address}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(location)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(location.id)}
                        disabled={location.isDefault}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? 'Edit Storage Location' : 'Add Storage Location'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Location Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter location name"
              />
            </div>
            <div>
              <Label htmlFor="address">Address (Optional)</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter address"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
              />
              <Label htmlFor="isDefault">Set as default location</Label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSubmit} className="flex-1">
                {editingLocation ? 'Update' : 'Create'} Location
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StorageLocationManager;
